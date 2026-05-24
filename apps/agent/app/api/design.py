import json
import os
import uuid
import threading
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db, SessionLocal
from app.db.repository import DesignSessionRepo, DesignImageRepo
from app.infrastructure.config import settings

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/design/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    purpose: str = Form(default="主商品图"),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(400, "Image too large (max 10MB)")

    image_id = str(uuid.uuid4())
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    file_path = os.path.join(settings.upload_dir, f"{image_id}.{ext}")

    with open(file_path, "wb") as f:
        f.write(contents)

    repo = DesignImageRepo(db)
    repo.create(image_id=image_id, filename=file.filename or "image", purpose=purpose, file_path=file_path)

    return {"image_id": image_id, "purpose": purpose, "filename": file.filename}


class DesignRequest(BaseModel):
    product_name: str
    category: str
    platform: str
    style: str
    target_audience: str
    selling_points: str
    price_range: str
    count: int = 4
    image_ids: list[str] = []
    constraints: Optional[dict] = None


@router.post("/design/generate")
def start_generate(req: DesignRequest, db: Session = Depends(get_db)):
    repo = DesignSessionRepo(db)
    session = repo.create(
        product_name=req.product_name,
        category=req.category,
        platform=req.platform,
        style=req.style,
        target_audience=req.target_audience,
        selling_points=req.selling_points,
        price_range=req.price_range,
        count=req.count,
        image_refs=req.image_ids,
        constraints=json.dumps(req.constraints or {}),
        status="pending",
    )

    img_repo = DesignImageRepo(db)
    for iid in req.image_ids:
        img_repo.link_session(iid, session.id)

    image_data_list = []
    for iid in req.image_ids:
        img = img_repo.get(iid)
        if img and os.path.exists(img.file_path):
            with open(img.file_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            ext = img.file_path.rsplit(".", 1)[-1].lower()
            mime = {
                "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png", "webp": "image/webp",
            }.get(ext, "image/jpeg")
            image_data_list.append({
                "image_id": iid,
                "purpose": img.purpose,
                "b64": b64,
                "mime": mime,
            })

    req_dict = req.dict()

    def run_in_thread():
        from app.design.generator import generate_design
        generate_design(session.id, req_dict, SessionLocal, image_data_list)

    t = threading.Thread(target=run_in_thread, daemon=True)
    t.start()

    return {"session_id": session.id, "status": "generating"}


@router.get("/design/{session_id}")
def get_design(session_id: int, db: Session = Depends(get_db)):
    repo = DesignSessionRepo(db)
    session = repo.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    result = None
    if session.result:
        try:
            result = json.loads(session.result)
        except Exception:
            pass

    return {
        "session_id": session_id,
        "status": session.status,
        "result": result,
        "vision_analysis": session.vision_analysis,
        "platform_strategy": session.platform_strategy,
        "error": session.error,
    }
