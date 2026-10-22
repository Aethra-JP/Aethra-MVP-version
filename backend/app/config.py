"""All settings come from environment variables (see .env.example)."""
import os


def _int(name, default):
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


class Settings:
    def __init__(self):
        g = os.environ.get
        self.supabase_url = g("SUPABASE_URL", "")
        self.supabase_service_key = g("SUPABASE_SERVICE_ROLE_KEY", "")
        self.groq_api_key = g("GROQ_API_KEY", "")
        self.groq_model = g("GROQ_MODEL", "openai/gpt-oss-120b")
        self.groq_base_url = g("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        # Embeddings (optional): none | cloudflare | gemini. Use ONE provider for the whole database.
        self.embed_provider = g("EMBED_PROVIDER", "none").lower()
        self.embed_model = g("EMBED_MODEL", "@cf/baai/bge-m3")
        self.embed_dim = _int("EMBED_DIM", 1024)
        self.cf_account_id = g("CLOUDFLARE_ACCOUNT_ID", "")
        self.cf_api_token = g("CLOUDFLARE_API_TOKEN", "")
        self.gemini_api_key = g("GEMINI_API_KEY", "")
        self.cron_secret = g("CRON_SECRET", "")
        self.allowed_origins = [o.strip() for o in g("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
        # Fair-use limits (everything is free for now, so protect the free tiers)
        self.max_upload_mb = _int("MAX_UPLOAD_MB", 10)
        self.max_analyses_per_day = _int("MAX_ANALYSES_PER_DAY", 30)
        self.max_chat_per_day = _int("MAX_CHAT_PER_DAY", 100)
        self.max_chunks_per_workspace = _int("MAX_CHUNKS_PER_WORKSPACE", 1500)


def get_settings() -> Settings:
    return Settings()
