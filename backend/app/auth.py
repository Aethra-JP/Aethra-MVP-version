"""Verifies the Supabase access token sent by the frontend and checks workspace membership."""
from fastapi import Header, HTTPException

from .db import sb


def current_user(authorization: str = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please log in.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        res = sb().auth.get_user(token)
    except Exception:
        raise HTTPException(401, "Your session has expired. Please log in again.")
    user = getattr(res, "user", None)
    if not user:
        raise HTTPException(401, "Your session has expired. Please log in again.")
    return {"id": str(user.id), "email": getattr(user, "email", None)}


def require_member(workspace_id: str, user: dict) -> None:
    r = (sb().table("workspace_members").select("role")
         .eq("workspace_id", workspace_id).eq("user_id", user["id"]).limit(1).execute())
    if not r.data:
        raise HTTPException(403, "You do not have access to this workspace.")


def workspace_plan(workspace_id: str) -> str:
    r = sb().table("workspaces").select("plan").eq("id", workspace_id).limit(1).execute()
    return (r.data[0].get("plan") if r.data else None) or "free"
