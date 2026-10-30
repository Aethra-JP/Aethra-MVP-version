import gzip
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import db
from ..auth import current_user, require_member
from ..config import get_settings
from ..db import sb
from ..services import processor
from ..services.util import jsonable
from .common import get_dataset

router = APIRouter(prefix="/datasets", tags=["datasets"])


class RegisterIn(BaseModel):
    workspace_id: str
    name: str
    storage_path: str  # path inside the 'datasets' bucket, must start with the workspace id
    source_type: str = "auto"  # auto | generic | tally | gst
    period_label: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


@router.post("/register")
def register(body: RegisterIn, user=Depends(current_user)):
    require_member(body.workspace_id, user)
    if not body.storage_path.startswith(body.workspace_id + "/"):
        raise HTTPException(400, "Invalid file location.")
    s = get_settings()
    try:
        raw = db.download("datasets", body.storage_path)
    except Exception:
        raise HTTPException(404, "Uploaded file not found. Please upload it again.")
    if len(raw) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File is larger than {s.max_upload_mb} MB. Please upload a smaller file.")
    filename = body.storage_path.rsplit("/", 1)[-1]
    try:
        res = processor.process(raw, filename, body.source_type)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        raise HTTPException(422, "We could not read this file. Please upload a CSV or .xlsx file with a header row.")
    ds_id_path = body.storage_path.rsplit(".", 1)[0] + ".clean.csv.gz"
    db.upload("datasets", ds_id_path, gzip.compress(res.df.to_csv(index=False).encode("utf-8")), "application/gzip")
    d = res.roles.get("date")
    start = body.period_start or (res.df[d].min().strftime("%Y-%m-%d") if d else None)
    end = body.period_end or (res.df[d].max().strftime("%Y-%m-%d") if d else None)
    ds = sb().table("datasets").insert({
        "workspace_id": body.workspace_id, "name": body.name.strip()[:120], "filename": filename,
        "storage_path": body.storage_path, "clean_path": ds_id_path, "source_type": res.source, "status": "ready",
        "row_count": int(len(res.df)), "period_label": body.period_label, "period_start": start, "period_end": end,
        "created_by": user["id"]}).execute().data[0]
    sb().table("dataset_profiles").insert({"dataset_id": ds["id"], "columns": res.profile, "overview": res.overview,
                                           "roles": res.roles, "cleaning_log": res.log}).execute()
    sb().table("periods").insert({"workspace_id": body.workspace_id, "dataset_id": ds["id"],
                                  "label": body.period_label or body.name, "start_date": start, "end_date": end,
                                  "metrics": jsonable({"total": res.overview.get("total"), "records": res.overview.get("rows"),
                                                       "measure": res.overview.get("measure")})}).execute()
    return {"dataset": ds, "overview": res.overview, "roles": res.roles, "cleaning_log": res.log, "columns": res.profile}


@router.get("")
def list_datasets(workspace_id: str, user=Depends(current_user)):
    require_member(workspace_id, user)
    return sb().table("datasets").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute().data


@router.get("/{dataset_id}")
def get_one(dataset_id: str, user=Depends(current_user)):
    ds = get_dataset(dataset_id, user)
    p = sb().table("dataset_profiles").select("*").eq("dataset_id", dataset_id).limit(1).execute().data
    return {"dataset": ds, "profile": p[0] if p else None}


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, user=Depends(current_user)):
    """Remove one uploaded file with everything made from it (reports, forecasts, history, actions)."""
    ds = get_dataset(dataset_id, user)
    ids = [a["id"] for a in sb().table("analyses").select("id").eq("dataset_id", ds["id"]).execute().data]
    if ids:
        sb().table("actions").delete().in_("analysis_id", ids).execute()
    paths = [p for p in (ds.get("storage_path"), ds.get("clean_path")) if p]
    try:
        sb().storage.from_("datasets").remove(paths)
    except Exception:
        pass  # a missing file must not stop the record from being removed
    sb().table("datasets").delete().eq("id", ds["id"]).execute()
    return {"ok": True}
