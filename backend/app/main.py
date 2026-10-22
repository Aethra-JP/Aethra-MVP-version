from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import actions, analyses, chat, contact, cron, datasets, documents, predict, workspaces

app = FastAPI(title="Aethra API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=get_settings().allowed_origins, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

for r in (workspaces.router, datasets.router, analyses.router, predict.router, chat.router, documents.router,
          actions.router, cron.router, contact.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True, "service": "aethra-api"}
