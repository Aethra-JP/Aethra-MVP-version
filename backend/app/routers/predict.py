from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import current_user, require_member, workspace_plan
from ..db import sb
from ..limits import log_usage, require_feature
from ..services import forecasting
from ..services.util import jsonable
from .common import get_dataset, load_df

router = APIRouter(prefix="/predict", tags=["predict"])


def _series(ds, target, frequency):
    df, roles = load_df(ds)
    d = roles.get("date")
    target = target or roles.get("amount")
    if not d or not target or target not in df.columns or not pd.api.types.is_numeric_dtype(df[target]):
        raise HTTPException(422, "Forecasting needs a date column and a numeric column to predict.")
    if frequency not in forecasting.FREQ:
        raise HTTPException(422, "frequency must be monthly, weekly or daily.")
    s = forecasting.aggregate_series(df, d, target, frequency)
    return s, target


@router.get("/models")
def models(dataset_id: str, frequency: str = "monthly", target: Optional[str] = None, user=Depends(current_user)):
    ds = get_dataset(dataset_id, user)
    s, target = _series(ds, target, frequency)
    return {"target": target, "periods": int(len(s)), "models": forecasting.list_models(len(s), frequency)}


class RunIn(BaseModel):
    dataset_id: str
    model: str
    horizon: int = 6
    frequency: str = "monthly"
    target: Optional[str] = None


@router.post("/run")
def run(body: RunIn, user=Depends(current_user)):
    ds = get_dataset(body.dataset_id, user)
    require_feature("predictive_model_picker", workspace_plan(ds["workspace_id"]))
    if body.model not in forecasting.MODELS:
        raise HTTPException(422, "Unknown model.")
    s, target = _series(ds, body.target, body.frequency)
    h = max(1, min(body.horizon, 24))
    try:
        res = forecasting.run_model(body.model, s.values, s.index, h, body.frequency)
    except ValueError as e:
        raise HTTPException(422, str(e))
    history = [{"period": i.strftime("%Y-%m-%d"), "value": round(float(v), 2)} for i, v in s.tail(36).items()]
    row = sb().table("model_runs").insert({"workspace_id": ds["workspace_id"], "dataset_id": ds["id"], "target": target,
                                           "frequency": body.frequency, "model_name": body.model, "horizon": h,
                                           "forecast": res["forecast"], "metrics": jsonable(res["backtest"]),
                                           "created_by": user["id"]}).execute().data[0]
    log_usage(user["id"], ds["workspace_id"], "forecast")
    return {"run": row, "history": history, "forecast": res["forecast"], "backtest": jsonable(res["backtest"]), "label": res["label"],
            "warnings": res.get("warnings", [])}


class CompareIn(BaseModel):
    model_run_id: str


@router.post("/compare")
def compare(body: CompareIn, user=Depends(current_user)):
    r = sb().table("model_runs").select("*").eq("id", body.model_run_id).limit(1).execute().data
    if not r:
        raise HTTPException(404, "Forecast run not found.")
    run_ = r[0]
    require_member(run_["workspace_id"], user)
    require_feature("predictive_model_recommendation", workspace_plan(run_["workspace_id"]))
    ds = get_dataset(run_["dataset_id"], user)
    s, _ = _series(ds, run_["target"], run_["frequency"])
    res = forecasting.compare(s.values, s.index, run_["horizon"], run_["frequency"], run_["model_name"])
    res = jsonable(res)
    sb().table("model_comparisons").insert({"model_run_id": run_["id"], "ranking": res["ranking"],
                                            "recommended": res["recommended"], "verdict": res["verdict"],
                                            "warnings": res["warnings"]}).execute()
    return res
