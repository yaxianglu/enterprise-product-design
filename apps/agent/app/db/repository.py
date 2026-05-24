import json
from sqlalchemy.orm import Session
from app.db.models import DesignSession, DesignImage


class DesignImageRepo:
    def __init__(self, db: Session):
        self.db = db

    def create(self, image_id: str, filename: str, purpose: str, file_path: str) -> DesignImage:
        img = DesignImage(id=image_id, filename=filename, purpose=purpose, file_path=file_path)
        self.db.add(img)
        self.db.commit()
        self.db.refresh(img)
        return img

    def get(self, image_id: str) -> DesignImage | None:
        return self.db.query(DesignImage).filter(DesignImage.id == image_id).first()

    def update_vision(self, image_id: str, vision: dict):
        self.db.query(DesignImage).filter(DesignImage.id == image_id).update(
            {"vision_analysis": vision}
        )
        self.db.commit()

    def link_session(self, image_id: str, session_id: int):
        self.db.query(DesignImage).filter(DesignImage.id == image_id).update(
            {"session_id": session_id}
        )
        self.db.commit()


class DesignSessionRepo:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> DesignSession:
        s = DesignSession(**kwargs)
        self.db.add(s)
        self.db.commit()
        self.db.refresh(s)
        return s

    def get(self, session_id: int) -> DesignSession | None:
        return self.db.query(DesignSession).filter(DesignSession.id == session_id).first()

    def update_status(self, session_id: int, status: str):
        self.db.query(DesignSession).filter(DesignSession.id == session_id).update({"status": status})
        self.db.commit()

    def update_result(self, session_id: int, result: dict):
        self.db.query(DesignSession).filter(DesignSession.id == session_id).update({
            "status": "done",
            "result": json.dumps(result, ensure_ascii=False),
        })
        self.db.commit()

    def update_error(self, session_id: int, error: str):
        self.db.query(DesignSession).filter(DesignSession.id == session_id).update({
            "status": "failed",
            "error": error,
        })
        self.db.commit()

    def update_vision_and_strategy(self, session_id: int, vision: dict, strategy: dict):
        self.db.query(DesignSession).filter(DesignSession.id == session_id).update({
            "vision_analysis": vision,
            "platform_strategy": strategy,
        })
        self.db.commit()
