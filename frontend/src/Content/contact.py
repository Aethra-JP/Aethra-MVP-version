"""Public 'Contact us' form: suggestions, bug reports and other messages. Read them in Supabase > Table Editor > contact_messages."""
import re
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..db import sb

router = APIRouter(tags=["contact"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
PER_EMAIL_PER_DAY = 5
ALL_PER_DAY = 300


class ContactIn(BaseModel):
    kind: Literal["suggestion", "bug", "other"] = "suggestion"
    name: str
    email: str
    message: str
    page: Optional[str] = None
    website: Optional[str] = ""  # hidden trap field: real people leave it empty, simple bots fill it in


@router.post("/contact")
def submit(body: ContactIn, user_agent: str = Header(default="")):
    if body.website:
        return {"ok": True}  # pretend success so bots learn nothing
    name, email, message = body.name.strip(), body.email.strip().lower(), body.message.strip()
    if not (1 <= len(name) <= 100):
        raise HTTPException(422, "Please enter your name.")
    if not EMAIL_RE.match(email) or len(email) > 200:
        raise HTTPException(422, "Please enter a valid email address so we can reply.")
    if len(message) < 10:
        raise HTTPException(422, "Please write a little more (at least 10 characters).")
    if len(message) > 3000:
        raise HTTPException(422, "Your message is too long. Please keep it under 3000 characters.")
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    mine = sb().table("contact_messages").select("id", count="exact").eq("email", email).gte("created_at", start).execute().count or 0
    if mine >= PER_EMAIL_PER_DAY:
        raise HTTPException(429, "You have sent several messages today already. Please try again tomorrow.")
    everyone = sb().table("contact_messages").select("id", count="exact").gte("created_at", start).execute().count or 0
    if everyone >= ALL_PER_DAY:
        raise HTTPException(429, "We are receiving too many messages right now. Please try again tomorrow.")
    sb().table("contact_messages").insert({"kind": body.kind, "name": name, "email": email, "message": message,
                                           "page": (body.page or "")[:300] or None, "user_agent": user_agent[:300] or None}).execute()
    return {"ok": True}
