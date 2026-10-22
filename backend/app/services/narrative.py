"""Turns verified results into a short explanation. The LLM may only restate numbers it is given."""
import json
import re

from .calc import fmt_inr
from .util import jsonable

LANG = {"en": "English", "hi": "Hindi (Devanagari script)", "hinglish": "Hinglish (Hindi written in Roman script, mixed with simple English)"}


def _walk_numbers(o, out):
    if isinstance(o, bool):
        return
    if isinstance(o, (int, float)):
        out.add(float(o))
    elif isinstance(o, dict):
        for v in o.values():
            _walk_numbers(v, out)
    elif isinstance(o, (list, tuple)):
        for v in o:
            _walk_numbers(v, out)
    elif isinstance(o, str):
        for n in re.findall(r"\d[\d,]*\.?\d*", o):
            try:
                out.add(float(n.replace(",", "")))
            except ValueError:
                pass


def verify_numbers(text: str, result) -> bool:
    """True if every number in the text can be traced to a number in the result."""
    allowed = set()
    _walk_numbers(jsonable(result), allowed)
    extra = set()
    for a in allowed:
        extra.update({abs(a), abs(a) / 1e5, abs(a) / 1e7, abs(a) / 1e3})
    allowed |= extra
    for tok in re.findall(r"\d[\d,]*\.?\d*", text):
        try:
            n = float(tok.replace(",", "").rstrip("."))
        except ValueError:
            continue
        if n <= 12 or 1900 <= n <= 2100:
            continue
        if not any(abs(n - a) <= max(0.011, 0.006 * abs(a)) for a in allowed):
            return False
    return True


def template_narrative(kind: str, r: dict) -> str:
    if kind == "descriptive":
        s = [f"Total {r['measure']} is {fmt_inr(r['total'])} across {r['records']:,} records."]
        if "mom_growth_pct" in r:
            s.append(f"Compared with the previous month, it changed by {r['mom_growth_pct']:.1f}%.")
        if "change_vs_previous_upload_pct" in r:
            s.append(f"Compared with your previous upload, the total changed by {r['change_vs_previous_upload_pct']:.1f}%.")
        if r.get("best_month"):
            s.append(f"Your best month was {r['best_month']['period']} at {fmt_inr(r['best_month']['value'])}.")
        for dim, items in (r.get("breakdowns") or {}).items():
            if items:
                s.append(f"Top {dim}: {items[0]['name']} with {items[0]['share_pct']}% of the total.")
        return " ".join(s + (r.get("notes") or []))
    if kind == "diagnostic":
        s = []
        dr = r.get("drivers")
        if dr:
            s.append(f"Between {dr['from']} and {dr['to']} the total changed by {fmt_inr(dr['delta'])}.")
            if dr["down"]:
                s.append("Biggest drops: " + ", ".join(f"{x['name']} ({fmt_inr(x['delta'])})" for x in dr["down"]) + ".")
            if dr["up"]:
                s.append("Biggest gains: " + ", ".join(f"{x['name']} ({fmt_inr(x['delta'])})" for x in dr["up"]) + ".")
        if r.get("anomalies"):
            s.append(f"{len(r['anomalies'])} unusual day(s) were found, for example {r['anomalies'][0]['date']}.")
        if r.get("weekday"):
            s.append(f"{r['weekday']['best']['day']} is your strongest day and {r['weekday']['worst']['day']} the weakest.")
        return " ".join(s) or "Not enough dated data to explain changes yet."
    if kind == "prescriptive":
        acts = r.get("actions") or []
        if not acts:
            return "No clear actions stood out from this data yet. Upload more months for sharper advice."
        return "Top suggestions: " + "; ".join(a["title"] for a in acts[:4]) + "."
    return ""


def narrate(kind: str, result: dict, language: str = "en", llm_chat=None):
    """Returns (text, source) where source is 'ai' or 'template'."""
    base = template_narrative(kind, result)
    if llm_chat is None:
        return base, "template"
    payload = json.dumps(jsonable(result), ensure_ascii=False)[:7000]
    system = ("You are Aethra, a business analyst for small Indian businesses. You receive VERIFIED results as JSON. "
              "Write a clear summary of at most 170 words for a non-technical shop owner. Use ONLY numbers that appear in the JSON. "
              "Never calculate, estimate or invent a number. Show money in rupees (lakh/crore is fine). "
              f"Write in {LANG.get(language, LANG['en'])}. No headings.")
    try:
        msg = llm_chat([{"role": "system", "content": system},
                        {"role": "user", "content": f"Analysis type: {kind}\nResults:\n{payload}"}], None)
        text = (msg.get("content") or "").strip()
    except Exception:
        return base, "template"
    if text and verify_numbers(text, result):
        return text, "ai"
    return base, "template"
