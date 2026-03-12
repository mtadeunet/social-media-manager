from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    caption = Column(Text, nullable=True)
    stage = Column(String, nullable=False, default="draft")
    is_posted = Column(Boolean, default=False)
    first_posted_at = Column(DateTime, nullable=True)
    first_platform_id = Column(Integer, nullable=True)  # Remove foreign key for now
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    media_files = relationship("MediaFile", back_populates="post", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Post(id={self.id}, stage={self.stage})>"
