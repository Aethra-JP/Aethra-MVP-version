"""Groq (OpenAI-compatible) chat client. Swap model/provider through env vars only."""
import httpx

from .config import get_settings


class LLMNotConfigured(Exception):
    pass


class LLMError(Exception):
    """An AI-provider problem, with a message that is safe and useful to show the user."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.message, self.status = message, status


def configured() -> bool:
    return bool(get_settings().groq_api_key)


def _explain(r: httpx.Response) -> str:
    try:
        msg = (r.json().get("error") or {}).get("message", "") or ""
    except Exception:
        msg = ""
    s, low = r.status_code, msg.lower()
    if s in (401, 403):
        return ("Groq rejected the API key. Check GROQ_API_KEY in backend/.env (no quotes or spaces, copied in full), "
                "then restart the backend.")
    if s == 404 or (s == 400 and "model" in low):
        return (f"Groq says this model is not available: {msg[:160]} "
                "Change GROQ_MODEL in backend/.env to a current model from console.groq.com, then restart the backend.")
    if s == 429:
        return "Groq's free usage limit was reached. Wait a minute and try again."
    if s >= 500:
        return "Groq is having a temporary problem. Please try again in a moment."
    return f"Groq returned an error ({s}): {msg[:220] or 'no details given'}"


def _is_reasoning_model(model: str) -> bool:
    return model.startswith("openai/gpt-oss")


def chat(messages, tools=None, temperature=0.2, max_tokens=1200):
    s = get_settings()
    if not s.groq_api_key:
        raise LLMNotConfigured("GROQ_API_KEY is not set")
    payload = {"model": s.groq_model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    if _is_reasoning_model(s.groq_model):
        # gpt-oss models think before answering; keep that short and leave room in the token budget for the answer
        payload["reasoning_effort"] = "low"
        payload["max_tokens"] = max(max_tokens, 2500)
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    retried_tool = False
    for _ in range(3):
        try:
            r = httpx.post(f"{s.groq_base_url}/chat/completions", json=payload,
                           headers={"Authorization": f"Bearer {s.groq_api_key}"}, timeout=60)
        except httpx.TimeoutException:
            raise LLMError("Groq took too long to answer. Please try again.")
        except httpx.HTTPError:
            raise LLMError("Could not reach Groq. Check your internet connection.")
        low = r.text.lower()
        if r.status_code == 400 and "reasoning_effort" in payload and "reasoning" in low:
            payload.pop("reasoning_effort")  # this model does not accept the setting
            continue
        # Models sometimes write a malformed tool call; a second try usually works.
        if r.status_code == 400 and tools and not retried_tool and ("tool" in low or "function" in low):
            retried_tool = True
            continue
        if r.status_code >= 400:
            raise LLMError(_explain(r), r.status_code)
        return r.json()["choices"][0]["message"]
    raise LLMError("Groq did not accept the request. Please try again.")
