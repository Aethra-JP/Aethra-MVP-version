"""Called daily by GitHub Actions. Also keeps the free Supabase project from pausing."""
import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException

from ..config import get_settings
from ..db import sb
from ..services.calc import fmt_inr

router = APIRouter(prefix="/cron", tags=["cron"])


@router.post("/run")
def run(x_cron_secret: str = Header(default="")):
    secret = get_settings().cron_secret
    if not secret or not hmac.compare_digest(secret, x_cron_secret or ""):
        raise HTTPException(401, "Invalid cron secret.")
    made, checked = 0, 0
    scheds = sb().table("report_schedules").select("*").eq("enabled", True).execute().data
    now = datetime.now(timezone.utc)
    for sc in scheds:
        last = sc.get("last_run")
        if last and (now - datetime.fromisoformat(last.replace("Z", "+00:00"))).days < 28:
            continue
        ps = (sb().table("periods").select("metrics,label,end_date").eq("workspace_id", sc["workspace_id"])
              .order("end_date", desc=True).limit(2).execute().data)
        checked += 1
        if len(ps) == 2:
            cur, prv = (ps[0]["metrics"] or {}).get("total"), (ps[1]["metrics"] or {}).get("total")
            if cur is not None and prv:
                ch = (cur - prv) / abs(prv) * 100
                if abs(ch) >= 15:
                    sb().table("alerts").insert({
                        "workspace_id": sc["workspace_id"], "severity": "warning" if ch < 0 else "info",
                        "title": f"Total {'fell' if ch < 0 else 'rose'} {abs(ch):.0f}% vs the previous upload",
                        "detail": f"{ps[1]['label']}: {fmt_inr(prv)} -> {ps[0]['label']}: {fmt_inr(cur)}."}).execute()
                    made += 1
        else:
            sb().table("alerts").insert({"workspace_id": sc["workspace_id"], "severity": "info",
                                         "title": "Time to upload this month's data",
                                         "detail": "Upload your latest file to get a fresh comparison."}).execute()
            made += 1
        sb().table("report_schedules").update({"last_run": now.isoformat()}).eq("id", sc["id"]).execute()
    return {"workspaces_checked": checked, "alerts_created": made, "ok": True}
