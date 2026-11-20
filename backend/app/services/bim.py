"""BIM 모델 서비스 — 샘플 IFC 를 한 번 읽어 캐시하고, 뷰어용 메시를 내보낸다."""
import threading
from functools import lru_cache

from app.core.config import get_settings
from engine import ifc_extract, sample_ifc
from engine.ifc_extract import Model


_LOCK = threading.Lock()


def get_model() -> Model:
    # 첫 요청 여러 개가 동시에 IFC 를 파싱하면 IfcOpenShell(네이티브)이 충돌해 프로세스가 죽는다 → 한 번만 읽게 잠근다
    with _LOCK:
        return _load()


@lru_cache
def _load() -> Model:
    path = get_settings().ifc_path
    if not path.exists():
        sample_ifc.write(path)  # 샘플이 없으면 생성기로 재현
    return ifc_extract.load(path)


def viewer_payload() -> dict:
    m = get_model()
    return {
        "storeys": m.storeys,
        "elements": [
            {**e.summary(), "vertices": e.vertices, "faces": e.faces}
            for e in m.elements if e.ifc_class != "IfcOpeningElement"
        ],
        "openings": [e.summary() for e in m.elements if e.ifc_class == "IfcOpeningElement"],
    }
