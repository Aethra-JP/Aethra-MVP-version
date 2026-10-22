from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import llm
from ..auth import current_user, require_member, workspace_plan
from ..config import get_settings
from ..db import sb
from ..limits import check_daily, feature_enabled, log_usage
from ..services import chat_agent, embeddings
from ..services.util import jsonable
from .common import get_dataset, load_df

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatIn(BaseModel):
    workspace_id: str
    dataset_id: str
    message: str
    session_id: Optional[str] = None
    language: str = "en"


@router.post("")
def chat(body: ChatIn, user=Depends(current_user)):
    require_member(body.workspace_id, user)
    ds = get_dataset(body.dataset_id, user)
    if ds["workspace_id"] != body.workspace_id:
        raise HTTPException(400, "Dataset does not belong to this workspace.")
    if not llm.configured():
        raise HTTPException(503, "Chat is not configured yet. Add GROQ_API_KEY on the server.")
    check_daily(user["id"], "chat", get_settings().max_chat_per_day)
    msg = body.message.strip()[:2000]
    if not msg:
        raise HTTPException(422, "Please type a question.")
    sid = body.session_id
    if not sid:
        sid = sb().table("chat_sessions").insert({"workspace_id": body.workspace_id, "dataset_id": ds["id"], "user_id": user["id"],
                                                  "title": msg[:60]}).execute().data[0]["id"]
    hist_rows = sb().table("chat_messages").select("role,content").eq("session_id", sid).order("created_at").execute().data[-10:]
    history = [{"role": h["role"], "content": h["content"]} for h in hist_rows if h["role"] in ("user", "assistant") and h["content"]]
    df, roles = load_df(ds)
    search = None
    if embeddings.enabled() and feature_enabled("embeddings", workspace_plan(body.workspace_id)):
        search = lambda scope, q: embeddings.search(q, scope, body.workspace_id if scope == "workspace" else None, 5)
    try:
        out = chat_agent.run_agent(df, roles, history, msg, body.language, llm.chat, body.workspace_id, search)
    except Exception:
        raise HTTPException(502, "The AI service did not respond. Please try again in a moment.")
    sb().table("chat_messages").insert([
        {"session_id": sid, "role": "user", "content": msg, "meta": {}},
        {"session_id": sid, "role": "assistant", "content": out["answer"],
         "meta": jsonable({"charts": out["charts"], "trace": out["trace"], "calculations": out["calculations"]})}]).execute()
    log_usage(user["id"], body.workspace_id, "chat")
    return {"session_id": sid, **jsonable(out)}


@router.get("/sessions")
def sessions(workspace_id: str, user=Depends(current_user)):
    require_member(workspace_id, user)
    return (sb().table("chat_sessions").select("*").eq("workspace_id", workspace_id).eq("user_id", user["id"])
            .order("created_at", desc=True).execute().data)


@router.get("/sessions/{session_id}/messages")
def messages(session_id: str, user=Depends(current_user)):
    s = sb().table("chat_sessions").select("*").eq("id", session_id).limit(1).execute().data
    if not s or s[0]["user_id"] != user["id"]:
        raise HTTPException(404, "Conversation not found.")
    return sb().table("chat_messages").select("*").eq("session_id", session_id).order("created_at").execute().data
