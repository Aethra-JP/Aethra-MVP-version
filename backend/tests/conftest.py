import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
SAMPLE = ROOT.parent / "sample_data"


@pytest.fixture
def sample_bytes():
    return (SAMPLE / "messy_sales.csv").read_bytes()


@pytest.fixture
def processed(sample_bytes):
    from app.services import processor
    return processor.process(sample_bytes, "messy_sales.csv")


@pytest.fixture
def api(monkeypatch):
    from fastapi.testclient import TestClient
    from app import auth, db
    from app.main import app
    from tests.fakes import FakeSB
    fake = FakeSB()
    monkeypatch.setattr(db, "_client", fake)
    monkeypatch.setenv("CRON_SECRET", "s3cret")
    app.dependency_overrides[auth.current_user] = lambda: {"id": "user-1", "email": "owner@example.com"}
    client = TestClient(app)
    client.fake = fake
    yield client
    app.dependency_overrides.clear()
