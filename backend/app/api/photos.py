"""안전시설 사진 증빙 API — 근로자는 QR 토큰으로 올리고, 관리자(반장)가 TBM 화면에서 확인한다."""
import base64
import binascii
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.admin_auth import require, require_admin
from app.core.db import get_db
from app.models import Photo, Tbm
from app.services import glossary, photo_check, photos, zone_brief

from .schemas import PhotoRequest
from .worker import _lang, _tbm

router = APIRouter(prefix="/api", tags=["photos"])
MAX_BYTES = 8 * 1024 * 1024


def photo_out(p: Photo) -> dict:
    return {"id": p.id, "zone": p.zone, "request": glossary.phrase(p.request, "ko") if p.request else "",
            "faces_blurred": p.faces_blurred, "ai_status": p.ai_status, "ai_note": p.ai_note, "status": p.status,
            "created_at": p.created_at.isoformat(), "image": f"/api/photos/{p.id}/image"}


@router.post("/w/{token}/photos")
def upload(token: str, body: PhotoRequest, db: Session = Depends(get_db)):
    t = _tbm(db, token)
    lang = _lang(body.lang)
    if zone_brief.find(t.assessment.draft, body.zone) is None:
        raise HTTPException(404, "구역 없음")
    try:
        raw = base64.b64decode(body.image.split(",")[-1], validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "사진 형식 오류")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "사진이 너무 큼")
    try:
        jpeg, n_faces = photos.sanitize(raw)
    except photos.PhotoError as e:
        raise HTTPException(422, str(e))
    req = body.request if body.request.startswith("photo.") else ""
    folder = get_settings().photo_dir / str(t.id)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_hex(8)}.jpg"
    (folder / name).write_bytes(jpeg)
    ai_status, ai_note = photo_check.check(jpeg, req)
    p = Photo(tbm_id=t.id, zone=body.zone, request=req, file=name, faces_blurred=n_faces,
              ai_status=ai_status, ai_note=ai_note)
    db.add(p)
    db.commit()
    return {"id": p.id, "message": glossary.phrase("chat.photo_sent", lang)}


@router.get("/tbms/{tid}/photos", dependencies=[Depends(require_admin)])
def list_photos(tid: int, db: Session = Depends(get_db)):
    t = db.get(Tbm, tid)
    if not t:
        raise HTTPException(404, "TBM 없음")
    rows = db.scalars(select(Photo).where(Photo.tbm_id == tid).order_by(Photo.id.desc())).all()
    asked = [b["zone"] for b in t.assessment.draft.get("briefings", []) if not b["restricted"] and b["safety"]]
    have = {p.zone for p in rows}
    return {"photos": [photo_out(p) for p in rows], "missing": [z for z in asked if z not in have]}


@router.get("/photos/{pid}/image", dependencies=[Depends(require_admin)])
def image(pid: int, db: Session = Depends(get_db)):
    p = db.get(Photo, pid)
    if not p:
        raise HTTPException(404, "사진 없음")
    return FileResponse(get_settings().photo_dir / str(p.tbm_id) / p.file, media_type="image/jpeg")


@router.post("/photos/{pid}/confirm", dependencies=[Depends(require("photo"))])
def confirm(pid: int, db: Session = Depends(get_db)):
    p = db.get(Photo, pid)
    if not p:
        raise HTTPException(404, "사진 없음")
    p.status = "confirmed"
    p.confirmed_at = datetime.now(timezone.utc)
    db.commit()
    return photo_out(p)
