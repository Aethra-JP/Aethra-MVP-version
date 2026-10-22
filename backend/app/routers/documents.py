from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import db
from ..auth import current_user, require_member, workspace_plan
from ..config import get_settings
from ..db import sb
from ..limits import require_feature
from ..services import embeddings

router = APIRouter(tags=["documents"])


class DocIn(BaseModel):
    workspace_id: str
    name: str
    storage_path: str  # inside the 'documents' bucket, must start with the workspace id


@router.get("/knowledge/status")
def status():
    return {"embeddings_enabled": embeddings.enabled(), "provider": get_settings().embed_provider}


@router.post("/documents/register")
def register(body: DocIn, user=Depends(current_user)):
    require_member(body.workspace_id, user)
    if not body.storage_path.startswith(body.workspace_id + "/"):
        raise HTTPException(400, "Invalid file location.")
    return sb().table("documents").insert({"workspace_id": body.workspace_id, "name": body.name[:120],
                                           "storage_path": body.storage_path, "status": "uploaded",
                                           "created_by": user["id"]}).execute().data[0]


@router.post("/documents/{document_id}/ingest")
def ingest(document_id: str, user=Depends(current_user)):
    r = sb().table("documents").select("*").eq("id", document_id).limit(1).execute().data
    if not r:
        raise HTTPException(404, "Document not found.")
    doc = r[0]
    require_member(doc["workspace_id"], user)
    require_feature("embeddings", workspace_plan(doc["workspace_id"]))
    if not embeddings.enabled():
        raise HTTPException(503, "Document search is not enabled on this server (embeddings are not configured).")
    try:
        text = embeddings.extract_text(db.download("documents", doc["storage_path"]), doc["storage_path"])
        n = embeddings.ingest_text(text, "workspace", doc["workspace_id"], doc["id"], doc["name"])
    except ValueError as e:
        sb().table("documents").update({"status": "failed", "error": str(e)}).eq("id", document_id).execute()
        raise HTTPException(422, str(e))
    except Exception as e:
        sb().table("documents").update({"status": "failed", "error": str(e)[:200]}).eq("id", document_id).execute()
        raise HTTPException(502, "Could not process this document. Please try again.")
    sb().table("documents").update({"status": "ready", "chunk_count": n, "error": None}).eq("id", document_id).execute()
    return {"status": "ready", "chunks": n}


@router.get("/documents")
def list_documents(workspace_id: str, user=Depends(current_user)):
    require_member(workspace_id, user)
    return sb().table("documents").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute().data
