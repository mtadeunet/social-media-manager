from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class MediaVersion(Base):
    __tablename__ = "media_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    media_vault_id = Column(Integer, ForeignKey("media_vault.id"), nullable=False)
    filename = Column(String, nullable=False)  # {original}_{hash4}.jpg
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    media_vault = relationship("MediaVault", back_populates="versions")
    enhancement_tags = relationship("EnhancementTag", secondary="version_enhancement_tags", back_populates="versions")
    
    def __repr__(self):
        return f"<MediaVersion(id={self.id}, filename={self.filename}, media_id={self.media_vault_id})>"
    
    @property
    def file_extension(self):
        """Get file extension from filename"""
        return self.filename.split('.')[-1] if '.' in self.filename else ''
    
    @property
    def display_name(self):
        """Get human-readable display name"""
        base_name = '_'.join(self.filename.split('_')[:-1])  # Remove hash part
        return f"{base_name} ({self.upload_date.strftime('%Y-%m-%d')})"
