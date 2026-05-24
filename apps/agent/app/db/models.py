import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from app.db.database import Base


class DesignImage(Base):
    __tablename__ = "design_images"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(Integer, ForeignKey("design_sessions.id"), nullable=True)
    filename = Column(String(255))
    purpose = Column(String(50), default="主商品图")
    file_path = Column(String(512))
    vision_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DesignSession(Base):
    __tablename__ = "design_sessions"
    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(50), default="pending")
    product_name = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True)
    platform = Column(String(50), nullable=True)
    style = Column(String(50), nullable=True)
    target_audience = Column(Text, nullable=True)
    selling_points = Column(Text, nullable=True)
    price_range = Column(String(50), nullable=True)
    count = Column(Integer, default=4)
    constraints = Column(Text, nullable=True)
    image_refs = Column(JSON, nullable=True)
    vision_analysis = Column(JSON, nullable=True)
    platform_strategy = Column(JSON, nullable=True)
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
