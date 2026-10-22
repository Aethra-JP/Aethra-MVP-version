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
