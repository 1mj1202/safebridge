import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["SAFEBRIDGE_DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SAFEBRIDGE_LLM_PROVIDER"] = "mock"
os.environ["SAFEBRIDGE_DEMO_TODAY"] = "2026-11-23"
os.environ["SAFEBRIDGE_PHOTO_DIR"] = f"{_tmp}/photos"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c
