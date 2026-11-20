"""IFC 동시 첫 로드 — 여러 스레드가 한꺼번에 불러도 한 번만 파싱."""
from concurrent.futures import ThreadPoolExecutor

from app.services import bim


def test_concurrent_first_load_parses_once(monkeypatch):
    calls = []
    real = bim.ifc_extract.load
    monkeypatch.setattr(bim.ifc_extract, "load", lambda p: calls.append(p) or real(p))
    bim._load.cache_clear()
    with ThreadPoolExecutor(8) as ex:
        models = list(ex.map(lambda _: bim.get_model(), range(8)))
    assert len(calls) == 1 and all(m is models[0] for m in models)
