import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from app.main import app  # noqa: E402,F401  (Vercel serves this ASGI app)
