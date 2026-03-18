from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class EnhancementTag(Base):
    __tablename__ = "enhancement_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#6b7280")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    media_vaults = relationship("MediaVault", secondary="media_enhancement_tags", back_populates="enhancement_tags")
    versions = relationship("MediaVersion", secondary="version_enhancement_tags", back_populates="enhancement_tags")
    
    def __repr__(self):
        return f"<EnhancementTag(id={self.id}, name={self.name})>"


class ContentTypeTag(Base):
    __tablename__ = "content_type_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3b82f6")
    has_phases = Column(Boolean, default=False)
    phase_count = Column(Integer, nullable=True)  # Only used for base types with phases
    parent_id = Column(Integer, ForeignKey("content_type_tags.id"), nullable=True)  # Self-referencing
    phase_number = Column(Integer, nullable=True)  # Which phase this represents (1, 2, 3, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    media_vaults = relationship("MediaVault", secondary="media_content_type_tags", back_populates="content_type_tags")
    phases = relationship("ContentTypeTag", backref="parent_content_type", remote_side=[id])
    
    def __repr__(self):
        if self.parent_id:
            return f"<ContentTypeTag(id={self.id}, name={self.name}, phase={self.phase_number})>"
        else:
            return f"<ContentTypeTag(id={self.id}, name={self.name}, phases={self.phase_count})>"


class PlatformTag(Base):
    __tablename__ = "platform_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, nullable=True)
    color = Column(String, default="#10b981")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    media_vaults = relationship("MediaVault", secondary="media_platform_tags", back_populates="platform_tags")
    
    def __repr__(self):
        return f"<PlatformTag(id={self.id}, name={self.name})>"


class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SystemSetting(key={self.key}, value={self.value})>"
