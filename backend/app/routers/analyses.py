from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import llm
from ..auth import current_user, require_member, workspace_plan
from ..config import get_settings
from ..db import sb
from ..limits import check_daily, log_usage, require_feature
from ..services import analysis, narrative
from ..services.calc import CalcLog
from ..services.util import jsonable
from .common import get_dataset, load_df

router = APIRouter(prefix="/analyses", tags=["analyses"])


class AnalysisIn(BaseModel):
    dataset_id: str
    kind: Literal["descriptive", "diagnostic", "prescriptive"]
    language: str = "en"


def _previous_metrics(ds):
    r = (sb().table("periods").select("metrics,dataset_id,end_date").eq("workspace_id", ds["workspace_id"])
         .order("end_date", desc=True).execute().data)
    older = [p for p in r if p["dataset_id"] != ds["id"] and (p.get("end_date") or "") < (ds.get("period_end") or "9999")]
    return older[0]["metrics"] if older else None


def _events():
    try:
        return sb().table("seasonal_events").select("name,months").execute().data
    except Exception:
        return []


@router.post("")
def run(body: AnalysisIn, user=Depends(current_user)):
    ds = get_dataset(body.dataset_id, user)
    require_feature("analysis_" + body.kind, workspace_plan(ds["workspace_id"]))
    check_daily(user["id"], "analysis", get_settings().max_analyses_per_day)
    job = sb().table("analysis_jobs").insert({"workspace_id": ds["workspace_id"], "dataset_id": ds["id"], "kind": body.kind,
                                              "status": "running", "created_by": user["id"]}).execute().data[0]
    try:
        df, roles = load_df(ds)
        log = CalcLog()
        if body.kind == "descriptive":
            result = analysis.descriptive(df, roles, log, _previous_metrics(ds))
        elif body.kind == "diagnostic":
            result = analysis.diagnostic(df, roles, log)
        else:
            desc = analysis.descriptive(df, roles, log)
            diag = analysis.diagnostic(df, roles, log)
            result = analysis.prescriptive(df, roles, log, desc, diag, _events())
        result = jsonable(result)
        text, source = narrative.narrate(body.kind, result, body.language, llm.chat if llm.configured() else None)
        row = sb().table("analyses").insert({"workspace_id": ds["workspace_id"], "dataset_id": ds["id"], "job_id": job["id"],
                                             "kind": body.kind, "result": result, "narrative": text, "narrative_source": source,
                                             "language": body.language, "created_by": user["id"]}).execute().data[0]
        calcs = log.as_list()
        if calcs:
            sb().table("calculations").insert([{"workspace_id": ds["workspace_id"], "analysis_id": row["id"], "calc_id": c["id"],
                                                "label": c["label"], "value": c["value"], "formula": c["formula"],
                                                "source_columns": c["source_columns"], "filters": c["filters"]} for c in calcs]).execute()
        if body.kind == "prescriptive" and result.get("actions"):
            due = datetime.now(timezone.utc).date()
            sb().table("actions").insert([{
                "workspace_id": ds["workspace_id"], "analysis_id": row["id"], "title": a["title"], "detail": a["detail"],
                "est_impact_inr": a["est_impact_inr"], "impact_type": a["impact_type"], "assumption": a["assumption"],
                "priority": a["priority"], "due_date": (due.fromordinal(due.toordinal() + int(a["due_in_days"]))).isoformat(),
                "status": "suggested", "baseline": a["baseline"]} for a in result["actions"]]).execute()
        _remember(ds, body.kind, text)
        sb().table("analysis_jobs").update({"status": "done", "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job["id"]).execute()
        log_usage(user["id"], ds["workspace_id"], "analysis")
        return {"analysis": row, "calculations": calcs}
    except ValueError as e:
        sb().table("analysis_jobs").update({"status": "failed", "error": str(e)}).eq("id", job["id"]).execute()
        raise HTTPException(422, str(e))
    except HTTPException:
        raise
    except Exception as e:
        sb().table("analysis_jobs").update({"status": "failed", "error": str(e)[:300]}).eq("id", job["id"]).execute()
        raise HTTPException(500, "The analysis failed unexpectedly. Please try again, or upload the file again.")


def _remember(ds, kind, text):
    """Best-effort: store a short summary as searchable memory when embeddings are enabled."""
    try:
        from ..services import embeddings
        if embeddings.enabled() and text:
            embeddings.ingest_text(f"{kind} analysis of {ds['name']}: {text}", "memory", ds["workspace_id"], None, ds["name"])
    except Exception:
        pass


@router.get("")
def list_analyses(dataset_id: str, user=Depends(current_user)):
    ds = get_dataset(dataset_id, user)
    return sb().table("analyses").select("*").eq("dataset_id", ds["id"]).order("created_at", desc=True).execute().data


@router.get("/{analysis_id}")
def get_one(analysis_id: str, user=Depends(current_user)):
    r = sb().table("analyses").select("*").eq("id", analysis_id).limit(1).execute().data
    if not r:
        raise HTTPException(404, "Analysis not found.")
    require_member(r[0]["workspace_id"], user)
    calcs = sb().table("calculations").select("*").eq("analysis_id", analysis_id).execute().data
    return {"analysis": r[0], "calculations": calcs}
