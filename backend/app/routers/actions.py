from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import current_user, require_member
from ..db import sb

router = APIRouter(tags=["actions and alerts"])


def _own_action(action_id, user):
    r = sb().table("actions").select("*").eq("id", action_id).limit(1).execute().data
    if not r:
        raise HTTPException(404, "Action not found.")
    require_member(r[0]["workspace_id"], user)
    return r[0]


@router.get("/actions")
def list_actions(workspace_id: str, user=Depends(current_user)):
    require_member(workspace_id, user)
    return sb().table("actions").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute().data


class StatusIn(BaseModel):
    status: Literal["suggested", "in_progress", "done", "ignored"]


@router.patch("/actions/{action_id}")
def set_status(action_id: str, body: StatusIn, user=Depends(current_user)):
    _own_action(action_id, user)
    return sb().table("actions").update({"status": body.status}).eq("id", action_id).execute().data[0]


@router.post("/actions/{action_id}/check")
def check(action_id: str, user=Depends(current_user)):
    a = _own_action(action_id, user)
    latest = (sb().table("periods").select("metrics,label,end_date").eq("workspace_id", a["workspace_id"])
              .order("end_date", desc=True).limit(1).execute().data)
    base = (a.get("baseline") or {}).get("total")
    if not latest or not base:
        raise HTTPException(422, "Upload newer data first, then check progress.")
    cur = (latest[0].get("metrics") or {}).get("total")
    if cur is None:
        raise HTTPException(422, "The latest upload has no comparable total.")
    ch = (cur - base) / abs(base) * 100
    outcome = {"checked_at": datetime.now(timezone.utc).isoformat(), "baseline_total": base, "latest_total": cur,
               "change_pct": round(ch, 2), "latest_period": latest[0].get("label"),
               "note": "Compares overall totals between the upload that created this action and your latest upload. "
                       "Other factors also move totals, so treat this as a guide."}
    return sb().table("actions").update({"outcome": outcome}).eq("id", action_id).execute().data[0]


@router.get("/alerts")
def list_alerts(workspace_id: str, user=Depends(current_user)):
    require_member(workspace_id, user)
    return sb().table("alerts").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).limit(50).execute().data


@router.patch("/alerts/{alert_id}")
def mark_read(alert_id: str, user=Depends(current_user)):
    r = sb().table("alerts").select("workspace_id").eq("id", alert_id).limit(1).execute().data
    if not r:
        raise HTTPException(404, "Alert not found.")
    require_member(r[0]["workspace_id"], user)
    return sb().table("alerts").update({"read": True}).eq("id", alert_id).execute().data[0]
