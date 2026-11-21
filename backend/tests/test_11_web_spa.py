"""한 서버 배포: 화면 내보내기와 Render 공개 주소."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.web.spa import mount_spa


def _dist(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<html>app</html>")
    (tmp_path / "assets" / "a.js").write_text("js")
    (tmp_path / "favicon.svg").write_text("svg")
    return tmp_path


def test_spa_serves_files_and_falls_back_to_index(tmp_path):
    app = FastAPI()

    @app.get("/api/health")
    def health():
        return {"ok": True}

    assert mount_spa(app, _dist(tmp_path))
    c = TestClient(app)
    assert c.get("/api/health").json() == {"ok": True}
    assert c.get("/assets/a.js").text == "js"
    assert c.get("/favicon.svg").text == "svg"
    assert c.get("/w/abc?zone=A").text == "<html>app</html>"
    assert c.get("/api/nope").status_code == 404
    assert c.get("/../../etc/passwd").text == "<html>app</html>"


def test_spa_skipped_without_dist(tmp_path):
    assert not mount_spa(FastAPI(), None)
    assert not mount_spa(FastAPI(), tmp_path)


def test_public_url_from_render(monkeypatch):
    monkeypatch.delenv("SAFEBRIDGE_PUBLIC_WEB_URL", raising=False)
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://safebridge.onrender.com")
    assert Settings(_env_file=None).public_web_url == "https://safebridge.onrender.com"
    monkeypatch.setenv("SAFEBRIDGE_PUBLIC_WEB_URL", "https://x.example")
    assert Settings(_env_file=None).public_web_url == "https://x.example"
