"""Fair-use limits and feature flags (so paid tiers can be switched on later without a rewrite)."""
from datetime import datetime, timezone

from fastapi import HTTPException

from .db import sb

PLAN_RANK = {"free": 0, "pro": 1}


def log_usage(user_id, workspace_id, action, tokens=0):
    try:
        sb().table("usage_logs").insert({"user_id": user_id, "workspace_id": workspace_id,
                                         "action": action, "tokens": tokens}).execute()
    except Exception:
        pass  # usage logging must never break a request


def check_daily(user_id: str, action: str, limit: int):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    r = (sb().table("usage_logs").select("id", count="exact")
         .eq("user_id", user_id).eq("action", action).gte("created_at", start).execute())
    if (r.count or 0) >= limit:
        raise HTTPException(429, f"Daily limit reached for this action ({limit} per day). Please try again tomorrow.")


def feature_enabled(key: str, plan: str = "free") -> bool:
    try:
        r = sb().table("feature_flags").select("enabled,min_plan").eq("key", key).limit(1).execute()
    except Exception:
        return True
    if not r.data:
        return True
    row = r.data[0]
    return bool(row.get("enabled", True)) and PLAN_RANK.get(plan, 0) >= PLAN_RANK.get(row.get("min_plan") or "free", 0)


def require_feature(key: str, plan: str = "free"):
    if not feature_enabled(key, plan):
        raise HTTPException(403, "This feature is not available on your plan yet.")
