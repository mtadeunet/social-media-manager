from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base
from .content_type import ContentType
from .associations import MediaContentTypeTag

class MediaVault(Base):
    __tablename__ = "media_vault"
    
    id = Column(Integer, primary_key=True, index=True)
    base_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # image/video
    is_usable = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    versions = relationship("MediaVersion", back_populates="media_vault", cascade="all, delete-orphan")
    enhancement_tags = relationship("EnhancementTag", secondary="media_enhancement_tags", back_populates="media_vaults")
    content_types = relationship("ContentType", secondary="media_content_type_tags", back_populates="media_vaults")
    platform_tags = relationship("PlatformTag", secondary="media_platform_tags", back_populates="media_vaults")
    posts = relationship("Post", secondary="post_media_references", back_populates="referenced_media")
    
    def __repr__(self):
        return f"<MediaVault(id={self.id}, base_filename={self.base_filename}, type={self.file_type})>"
    
    @property
    def latest_version(self):
        """Get the most recently uploaded version"""
        if not self.versions:
            return None
        return max(self.versions, key=lambda v: v.upload_date)
    
    @property
    def thumbnail_path(self):
        """Get thumbnail path from latest version"""
        latest = self.latest_version
        return latest.thumbnail_path if latest else None
