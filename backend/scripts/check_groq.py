"""Checks your Groq key and model without opening the app. It never prints the key.
Run from the backend folder:   .venv\\Scripts\\python scripts\\check_groq.py
"""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(root / ".env")
except ImportError:
    pass
import httpx

raw = os.environ.get("GROQ_API_KEY", "")
key = raw.strip().strip('"').strip("'")
model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
base = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

if not key:
    sys.exit("GROQ_API_KEY is empty. Check backend/.env (the file must be named .env, not .env.example).")
print(f"Key found ({len(key)} characters). Model set to: {model}")
if raw != key:
    print("WARNING: your key has quotes or spaces around it in .env. Remove them.")

h = {"Authorization": f"Bearer {key}"}
try:
    r = httpx.get(f"{base}/models", headers=h, timeout=30)
except httpx.HTTPError as e:
    sys.exit(f"Could not reach Groq ({type(e).__name__}). Check your internet connection or firewall.")
print("Step 1, list models:", r.status_code)
if r.status_code != 200:
    sys.exit("Groq rejected the request: " + r.text[:300])
ids = sorted(m["id"] for m in r.json().get("data", []))
print("Models your key can use:")
for i in ids:
    print("  -", i)
if model not in ids:
    print(f"\nPROBLEM FOUND: '{model}' is not in this list. Set GROQ_MODEL in backend/.env to one of the chat models above "
          "that supports tool use, then restart the backend.")

tool = {"type": "function", "function": {"name": "get_total", "description": "Get the total sales.",
        "parameters": {"type": "object", "properties": {}}}}
body = {"model": model, "messages": [{"role": "user", "content": "What are my total sales? Use the tool."}],
        "tools": [tool], "tool_choice": "auto", "max_tokens": 100}
r = httpx.post(f"{base}/chat/completions", json=body, headers=h, timeout=45)
print("\nStep 2, chat with a tool:", r.status_code)
if r.status_code == 200:
    msg = r.json()["choices"][0]["message"]
    print("OK. The model replied with a tool call." if msg.get("tool_calls") else "OK. The model replied: " + (msg.get("content") or "")[:120])
else:
    print("Groq said:", r.text[:400])
