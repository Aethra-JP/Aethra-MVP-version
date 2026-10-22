"""Optional embeddings layer (documents, memory of past work, shared knowledge base).

Use ONE embedding provider/model for the whole database (vectors from different models cannot be compared).
Private documents should only go to a provider that commits not to train on your data - check this yourself.
The provider HTTP calls below follow each provider's documented REST shape but are UNTESTED against the live
APIs in this build: verify them in the testing phase.
"""
import io
import re

import httpx

from ..config import get_settings
from ..db import sb


def enabled() -> bool:
    s = get_settings()
    if s.embed_provider == "cloudflare":
        return bool(s.cf_account_id and s.cf_api_token)
    if s.embed_provider == "gemini":
        return bool(s.gemini_api_key)
    return False


def embed(texts: list[str]) -> list[list[float]]:
    s = get_settings()
    if not enabled():
        raise RuntimeError("Embeddings are not configured (set EMBED_PROVIDER and its keys).")
    if s.embed_provider == "cloudflare":
        url = f"https://api.cloudflare.com/client/v4/accounts/{s.cf_account_id}/ai/run/{s.embed_model}"
        r = httpx.post(url, json={"text": texts}, headers={"Authorization": f"Bearer {s.cf_api_token}"}, timeout=60)
        r.raise_for_status()
        vecs = r.json()["result"]["data"]
    else:
        model = s.embed_model if s.embed_model.startswith("gemini") else "gemini-embedding-001"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents"
        body = {"requests": [{"model": f"models/{model}", "content": {"parts": [{"text": t}]},
                              "outputDimensionality": s.embed_dim} for t in texts]}
        r = httpx.post(url, json=body, headers={"x-goog-api-key": s.gemini_api_key}, timeout=60)
        r.raise_for_status()
        vecs = [e["values"] for e in r.json()["embeddings"]]
    if vecs and len(vecs[0]) != s.embed_dim:
        raise RuntimeError(f"Embedding size {len(vecs[0])} does not match EMBED_DIM={s.embed_dim}. "
                           "Change EMBED_DIM and the vector(...) size in supabase/schema.sql together.")
    return vecs


def chunk_text(text: str, size: int = 900, overlap: int = 120) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    chunks, i = [], 0
    while i < len(text):
        end = min(len(text), i + size)
        if end < len(text):
            cut = max(text.rfind(". ", i, end), text.rfind("। ", i, end))
            if cut > i + size * 0.5:
                end = cut + 1
        chunks.append(text[i:end].strip())
        if end >= len(text):
            break
        i = max(end - overlap, i + 1)
    return [c for c in chunks if len(c) > 20]


def extract_text(raw: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        from pypdf import PdfReader
        text = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages)
        if len(text.strip()) < 20:
            raise ValueError("No readable text found. Scanned PDFs need OCR, which is not supported yet.")
        return text
    if name.endswith((".txt", ".md", ".csv")):
        for enc in ("utf-8-sig", "cp1252"):
            try:
                return raw.decode(enc)
            except UnicodeDecodeError:
                pass
        return raw.decode("latin-1", errors="ignore")
    raise ValueError("Supported document types: PDF, TXT, MD, CSV.")


def ingest_text(text: str, scope: str, workspace_id=None, document_id=None, source_label=None) -> int:
    s = get_settings()
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("The document has no readable text.")
    if scope != "global" and workspace_id:
        cur = sb().table("document_chunks").select("id", count="exact").eq("workspace_id", workspace_id).execute().count or 0
        if cur + len(chunks) > s.max_chunks_per_workspace:
            raise ValueError(f"This workspace is limited to {s.max_chunks_per_workspace} stored text chunks "
                             f"(you have {cur}). Remove a document or upload a smaller one.")
    done = 0
    for i in range(0, len(chunks), 16):
        batch = chunks[i:i + 16]
        vecs = embed(batch)
        rows = [{"scope": scope, "workspace_id": workspace_id, "document_id": document_id, "content": c,
                 "embedding": v, "embed_model": s.embed_model if s.embed_provider == "cloudflare" else "gemini-embedding-001",
                 "source_label": source_label} for c, v in zip(batch, vecs)]
        sb().table("document_chunks").insert(rows).execute()
        done += len(rows)
    return done


def search(query: str, scope: str, workspace_id=None, k: int = 5) -> list[dict]:
    s = get_settings()
    qv = embed([query])[0]
    model = s.embed_model if s.embed_provider == "cloudflare" else "gemini-embedding-001"
    res = sb().rpc("match_chunks", {"query_embedding": qv, "p_scope": scope, "p_workspace": workspace_id,
                                    "p_model": model, "match_count": k}).execute()
    return res.data or []
