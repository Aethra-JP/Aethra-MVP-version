import gzip
import io

import pandas as pd
from fastapi import HTTPException

from .. import db
from ..auth import require_member
from ..db import sb


def get_dataset(dataset_id: str, user: dict) -> dict:
    r = sb().table("datasets").select("*").eq("id", dataset_id).limit(1).execute()
    if not r.data:
        raise HTTPException(404, "Dataset not found.")
    ds = r.data[0]
    require_member(ds["workspace_id"], user)
    return ds


def purge_folder(bucket: str, folder: str) -> int:
    """Delete every file stored under <folder>/ in a storage bucket. Best effort: returns how many were removed."""
    removed = 0
    try:
        b = sb().storage.from_(bucket)
        for _ in range(100):
            items = b.list(folder, {"limit": 100, "offset": 0}) or []
            names = [f"{folder}/{i['name']}" for i in items if i.get("name")]
            if not names:
                break
            b.remove(names)
            removed += len(names)
            if len(items) < 100:
                break
    except Exception:
        pass
    return removed


def load_df(ds: dict):
    """Load the cleaned table saved at upload time, restoring date columns."""
    p = sb().table("dataset_profiles").select("roles,columns").eq("dataset_id", ds["id"]).limit(1).execute()
    row = p.data[0] if p.data else {}
    roles = row.get("roles") or {}
    raw = gzip.decompress(db.download("datasets", ds["clean_path"]))
    df = pd.read_csv(io.BytesIO(raw))
    for c in row.get("columns") or []:
        if c.get("kind") == "date" and c["name"] in df.columns:
            df[c["name"]] = pd.to_datetime(df[c["name"]], errors="coerce")
    return df, roles
