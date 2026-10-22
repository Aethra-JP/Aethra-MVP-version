from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..auth import current_user, require_member
from ..db import sb

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class WorkspaceIn(BaseModel):
    name: str
    business_type: Optional[str] = None


@router.post("")
def create_workspace(body: WorkspaceIn, user=Depends(current_user)):
    ws = sb().table("workspaces").insert({"owner_id": user["id"], "name": body.name.strip()[:80] or "My business",
                                          "business_type": body.business_type}).execute().data[0]
    sb().table("workspace_members").insert({"workspace_id": ws["id"], "user_id": user["id"], "role": "owner"}).execute()
    sb().table("report_schedules").insert({"workspace_id": ws["id"], "cadence": "monthly", "enabled": True}).execute()
    return ws


@router.get("")
def list_workspaces(user=Depends(current_user)):
    m = sb().table("workspace_members").select("workspace_id").eq("user_id", user["id"]).execute().data
    ids = [x["workspace_id"] for x in m]
    if not ids:
        return []
    return sb().table("workspaces").select("*").in_("id", ids).execute().data


@router.get("/{workspace_id}/periods")
def periods(workspace_id: str, user=Depends(current_user)):
    require_member(workspace_id, user)
    return sb().table("periods").select("*").eq("workspace_id", workspace_id).order("end_date").execute().data
