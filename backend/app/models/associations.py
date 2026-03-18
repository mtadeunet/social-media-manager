from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from datetime import datetime

from .base import Base

# Media-Vault to Enhancement Tags (Many-to-Many)
class MediaEnhancementTag(Base):
    __tablename__ = "media_enhancement_tags"
    
    media_vault_id = Column(Integer, ForeignKey("media_vault.id"), primary_key=True)
    enhancement_tag_id = Column(Integer, ForeignKey("enhancement_tags.id"), primary_key=True)
    applied_date = Column(DateTime, default=datetime.utcnow)


# Media-Vault to Style Tags (Many-to-Many)
class MediaStyleTag(Base):
    __tablename__ = "media_style_tags"
    
    media_vault_id = Column(Integer, ForeignKey("media_vault.id"), primary_key=True)
    style_tag_id = Column(Integer, ForeignKey("style_tags.id"), primary_key=True)
    progression_stage = Column(Integer, default=1)


# Media-Vault to Platform Tags (Many-to-Many)
class MediaPlatformTag(Base):
    __tablename__ = "media_platform_tags"
    
    media_vault_id = Column(Integer, ForeignKey("media_vault.id"), primary_key=True)
    platform_tag_id = Column(Integer, ForeignKey("platform_tags.id"), primary_key=True)
    posted_date = Column(DateTime, nullable=True)


# Version to Enhancement Tags (Many-to-Many)
class VersionEnhancementTag(Base):
    __tablename__ = "version_enhancement_tags"
    
    version_id = Column(Integer, ForeignKey("media_versions.id"), primary_key=True)
    enhancement_tag_id = Column(Integer, ForeignKey("enhancement_tags.id"), primary_key=True)
    applied_sequence = Column(Integer, default=0)
    notes = Column(String(255), nullable=True)  # Store invalid tag names here


# Post to Media-Vault References (Many-to-Many)
class PostMediaReference(Base):
    __tablename__ = "post_media_references"
    
    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    media_vault_id = Column(Integer, ForeignKey("media_vault.id"), primary_key=True)
    version_id = Column(Integer, ForeignKey("media_versions.id"), nullable=True)
