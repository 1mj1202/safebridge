"""사진 증빙 정리 — 다시 인코딩해 촬영정보(EXIF·GPS)를 지우고, 얼굴을 찾아 흐리게 한 JPEG 만 남긴다 (초안 v5 8번).

OpenCV 의 기본 얼굴 검출기(Haar)를 쓴다. 정면·측면 둘 다 찾고, 놓치지 않도록 검출 상자를 넉넉히 넓혀 흐린다.
"""
from __future__ import annotations

import cv2
import numpy as np

MAX_SIDE = 1600
_cascades: list[cv2.CascadeClassifier] = []


class PhotoError(ValueError):
    pass


def _detectors() -> list[cv2.CascadeClassifier]:
    if not _cascades:
        for name in ("haarcascade_frontalface_default.xml", "haarcascade_profileface.xml"):
            _cascades.append(cv2.CascadeClassifier(cv2.data.haarcascades + name))
    return _cascades


def faces(img: np.ndarray) -> list[tuple[int, int, int, int]]:
    gray = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    min_side = max(24, min(img.shape[:2]) // 30)
    found: list[tuple[int, int, int, int]] = []
    for det in _detectors():
        for flip in (False, True):  # 측면 검출기는 한쪽 방향만 → 좌우 뒤집어 한 번 더
            g = cv2.flip(gray, 1) if flip else gray
            for x, y, w, h in det.detectMultiScale(g, 1.1, 5, minSize=(min_side, min_side)):
                found.append((int(g.shape[1] - x - w) if flip else int(x), int(y), int(w), int(h)))
    return found


def blur_regions(img: np.ndarray, boxes: list[tuple[int, int, int, int]]) -> None:
    H, W = img.shape[:2]
    for x, y, w, h in boxes:
        m = int(max(w, h) * 0.3)
        x0, y0, x1, y1 = max(0, x - m), max(0, y - m), min(W, x + w + m), min(H, y + h + m)
        roi = img[y0:y1, x0:x1]
        k = max(31, (max(x1 - x0, y1 - y0) // 3) | 1)
        img[y0:y1, x0:x1] = cv2.GaussianBlur(roi, (k, k), 0)


def sanitize(raw: bytes) -> tuple[bytes, int]:
    """원본 바이트 → (촬영정보 없는 JPEG, 흐린 얼굴 수). 원본은 어디에도 저장하지 않는다."""
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)  # EXIF 방향은 여기서 반영
    if img is None:
        raise PhotoError("이미지를 읽을 수 없음")
    scale = MAX_SIDE / max(img.shape[:2])
    if scale < 1:
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    boxes = faces(img)
    blur_regions(img, boxes)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])  # 메타데이터 없이 새로 쓴다
    if not ok:
        raise PhotoError("저장 실패")
    return buf.tobytes(), len(boxes)
