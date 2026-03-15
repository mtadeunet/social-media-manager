from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..models import EnhancementTag, StyleTag, PlatformTag
from ..models.base import get_db

router = APIRouter(prefix="/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class TagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class StyleTagCreate(BaseModel):
    name: str
    progression_stage: Optional[int] = 1
    description: Optional[str] = None
    color: Optional[str] = None


class StyleTagUpdate(BaseModel):
    name: Optional[str] = None
    progression_stage: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None


class PlatformTagCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


class PlatformTagUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


# ENHANCEMENT TAGS
@router.get("/enhancement")
async def list_enhancement_tags(db: Session = Depends(get_db)):
    """List all enhancement tags"""
    tags = db.query(EnhancementTag).all()
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "description": tag.description,
            "color": tag.color,
            "created_at": tag.created_at.isoformat()
        }
        for tag in tags
    ]


@router.post("/enhancement")
async def create_enhancement_tag(tag: TagCreate, db: Session = Depends(get_db)):
    """Create a new enhancement tag"""
    
    existing = db.query(EnhancementTag).filter(EnhancementTag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag name already exists")
    
    new_tag = EnhancementTag(
        name=tag.name,
        description=tag.description,
        color=tag.color or "#6b7280"
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return {
        "id": new_tag.id,
        "name": new_tag.name,
        "description": new_tag.description,
        "color": new_tag.color,
        "created_at": new_tag.created_at.isoformat()
    }


@router.put("/enhancement/{tag_id}")
async def update_enhancement_tag(tag_id: int, tag: TagUpdate, db: Session = Depends(get_db)):
    """Update an enhancement tag"""
    
    db_tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    if tag.name and tag.name != db_tag.name:
        existing = db.query(EnhancementTag).filter(EnhancementTag.name == tag.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tag name already exists")
    
    if tag.name is not None:
        db_tag.name = tag.name
    if tag.description is not None:
        db_tag.description = tag.description
    if tag.color is not None:
        db_tag.color = tag.color
    
    db.commit()
    db.refresh(db_tag)
    
    return {
        "id": db_tag.id,
        "name": db_tag.name,
        "description": db_tag.description,
        "color": db_tag.color,
        "created_at": db_tag.created_at.isoformat()
    }


@router.delete("/enhancement/{tag_id}")
async def delete_enhancement_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete an enhancement tag"""
    
    tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    
    return {"message": "Enhancement tag deleted successfully"}


# STYLE TAGS
@router.get("/style")
async def list_style_tags(db: Session = Depends(get_db)):
    """List all style tags"""
    tags = db.query(StyleTag).all()
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "progression_stage": tag.progression_stage,
            "description": tag.description,
            "color": tag.color,
            "created_at": tag.created_at.isoformat()
        }
        for tag in tags
    ]


@router.post("/style")
async def create_style_tag(tag: StyleTagCreate, db: Session = Depends(get_db)):
    """Create a new style tag"""
    
    existing = db.query(StyleTag).filter(StyleTag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag name already exists")
    
    if tag.progression_stage < 1 or tag.progression_stage > 5:
        raise HTTPException(status_code=400, detail="Progression stage must be between 1 and 5")
    
    new_tag = StyleTag(
        name=tag.name,
        progression_stage=tag.progression_stage,
        description=tag.description,
        color=tag.color or "#3b82f6"
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return {
        "id": new_tag.id,
        "name": new_tag.name,
        "progression_stage": new_tag.progression_stage,
        "description": new_tag.description,
        "color": new_tag.color,
        "created_at": new_tag.created_at.isoformat()
    }


@router.put("/style/{tag_id}")
async def update_style_tag(tag_id: int, tag: StyleTagUpdate, db: Session = Depends(get_db)):
    """Update a style tag"""
    
    db_tag = db.query(StyleTag).filter(StyleTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    if tag.name and tag.name != db_tag.name:
        existing = db.query(StyleTag).filter(StyleTag.name == tag.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tag name already exists")
    
    if tag.progression_stage is not None:
        if tag.progression_stage < 1 or tag.progression_stage > 5:
            raise HTTPException(status_code=400, detail="Progression stage must be between 1 and 5")
    
    if tag.name is not None:
        db_tag.name = tag.name
    if tag.progression_stage is not None:
        db_tag.progression_stage = tag.progression_stage
    if tag.description is not None:
        db_tag.description = tag.description
    if tag.color is not None:
        db_tag.color = tag.color
    
    db.commit()
    db.refresh(db_tag)
    
    return {
        "id": db_tag.id,
        "name": db_tag.name,
        "progression_stage": db_tag.progression_stage,
        "description": db_tag.description,
        "color": db_tag.color,
        "created_at": db_tag.created_at.isoformat()
    }


@router.delete("/style/{tag_id}")
async def delete_style_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete a style tag"""
    
    tag = db.query(StyleTag).filter(StyleTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    
    return {"message": "Style tag deleted successfully"}


# PLATFORM TAGS
@router.get("/platform")
async def list_platform_tags(db: Session = Depends(get_db)):
    """List all platform tags"""
    tags = db.query(PlatformTag).all()
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "icon": tag.icon,
            "color": tag.color,
            "created_at": tag.created_at.isoformat()
        }
        for tag in tags
    ]


@router.post("/platform")
async def create_platform_tag(tag: PlatformTagCreate, db: Session = Depends(get_db)):
    """Create a new platform tag"""
    
    existing = db.query(PlatformTag).filter(PlatformTag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag name already exists")
    
    new_tag = PlatformTag(
        name=tag.name,
        icon=tag.icon,
        color=tag.color or "#10b981"
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return {
        "id": new_tag.id,
        "name": new_tag.name,
        "icon": new_tag.icon,
        "color": new_tag.color,
        "created_at": new_tag.created_at.isoformat()
    }


@router.put("/platform/{tag_id}")
async def update_platform_tag(tag_id: int, tag: PlatformTagUpdate, db: Session = Depends(get_db)):
    """Update a platform tag"""
    
    db_tag = db.query(PlatformTag).filter(PlatformTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    if tag.name and tag.name != db_tag.name:
        existing = db.query(PlatformTag).filter(PlatformTag.name == tag.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tag name already exists")
    
    if tag.name is not None:
        db_tag.name = tag.name
    if tag.icon is not None:
        db_tag.icon = tag.icon
    if tag.color is not None:
        db_tag.color = tag.color
    
    db.commit()
    db.refresh(db_tag)
    
    return {
        "id": db_tag.id,
        "name": db_tag.name,
        "icon": db_tag.icon,
        "color": db_tag.color,
        "created_at": db_tag.created_at.isoformat()
    }


@router.delete("/platform/{tag_id}")
async def delete_platform_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete a platform tag"""
    
    tag = db.query(PlatformTag).filter(PlatformTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    
    return {"message": "Platform tag deleted successfully"}


# Initialize default tags
@router.post("/initialize-defaults")
async def initialize_default_tags(db: Session = Depends(get_db)):
    """Initialize default tags if they don't exist"""
    
    default_enhancement_tags = [
        {"name": "original", "color": "#6b7280", "description": "Original uploaded file"},
        {"name": "crop", "color": "#f59e0b", "description": "Cropped version"},
        {"name": "edit", "color": "#3b82f6", "description": "General editing applied"},
        {"name": "detail", "color": "#8b5cf6", "description": "Detailed enhancement"}
    ]
    
    for tag_data in default_enhancement_tags:
        existing = db.query(EnhancementTag).filter(EnhancementTag.name == tag_data["name"]).first()
        if not existing:
            tag = EnhancementTag(**tag_data)
            db.add(tag)
    
    default_style_tags = [
        {"name": "fitting room", "color": "#ef4444", "description": "Fitting room content"},
        {"name": "stockings", "color": "#f97316", "description": "Stockings content"},
        {"name": "gym", "color": "#eab308", "description": "Gym/fitness content"},
        {"name": "cosplay", "color": "#22c55e", "description": "Cosplay content"}
    ]
    
    for tag_data in default_style_tags:
        existing = db.query(StyleTag).filter(StyleTag.name == tag_data["name"]).first()
        if not existing:
            tag = StyleTag(**tag_data)
            db.add(tag)
    
    default_platform_tags = [
        {"name": "instagram", "icon": "📷", "color": "#e1306c"},
        {"name": "twitter", "icon": "🐦", "color": "#1da1f2"},
        {"name": "tiktok", "icon": "🎵", "color": "#000000"}
    ]
    
    for tag_data in default_platform_tags:
        existing = db.query(PlatformTag).filter(PlatformTag.name == tag_data["name"]).first()
        if not existing:
            tag = PlatformTag(**tag_data)
            db.add(tag)
    
    db.commit()
    
    return {"message": "Default tags initialized successfully"}
