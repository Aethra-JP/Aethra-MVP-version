"""Embeds backend/kb/*.md into the shared (global) knowledge base. Run once after setting EMBED_* variables:
    cd backend && python scripts/seed_kb.py
Re-running replaces the old global chunks."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import sb  # noqa: E402
from app.services import embeddings  # noqa: E402

if not embeddings.enabled():
    sys.exit("Embeddings are not configured. Set EMBED_PROVIDER and its API key first.")

sb().table("document_chunks").delete().eq("scope", "global").execute()
total = 0
for f in sorted((Path(__file__).resolve().parent.parent / "kb").glob("*.md")):
    n = embeddings.ingest_text(f.read_text(encoding="utf-8"), "global", None, None, f.stem)
    print(f"{f.name}: {n} chunks")
    total += n
print("Done.", total, "chunks stored.")
