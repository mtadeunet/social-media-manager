from sqlalchemy import Column, Integer, String, DateTime, Text
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


class StyleTag(Base):
    __tablename__ = "style_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    progression_stage = Column(Integer, default=1)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    media_vaults = relationship("MediaVault", secondary="media_style_tags", back_populates="style_tags")
    
    def __repr__(self):
        return f"<StyleTag(id={self.id}, name={self.name}, stage={self.progression_stage})>"


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
