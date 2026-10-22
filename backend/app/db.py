"""Supabase access (service-role key, server side only)."""
from .config import get_settings

_client = None


def sb():
    global _client
    if _client is None:
        from supabase import create_client  # lazy import keeps tests light
        s = get_settings()
        if not s.supabase_url or not s.supabase_service_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _client = create_client(s.supabase_url, s.supabase_service_key)
    return _client


def download(bucket: str, path: str) -> bytes:
    return sb().storage.from_(bucket).download(path)


def upload(bucket: str, path: str, data: bytes, content_type: str = "application/octet-stream"):
    sb().storage.from_(bucket).upload(path, data, {"content-type": content_type, "upsert": "true"})
