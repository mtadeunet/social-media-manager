from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..models import EnhancementTag, PlatformTag, SystemSetting
from ..models.base import get_db
from ..schemas.tags import (
    EnhancementTagResponse, EnhancementTagCreate, EnhancementTagUpdate,
    PlatformTagResponse, PlatformTagCreate, PlatformTagUpdate,
    PhaseResponse, PhaseCreate as TagPhaseCreate, PhaseUpdate,
    StyleTagResponse, StyleTagCreate, StyleTagUpdate
)

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
@router.get("/enhancement", response_model=List[EnhancementTagResponse])
async def list_enhancement_tags(db: Session = Depends(get_db)):
    """List all enhancement tags"""
    tags = db.query(EnhancementTag).all()
    return [
        EnhancementTagResponse(
            id=tag.id,
            name=tag.name,
            description=tag.description,
            color=tag.color,
            created_at=tag.created_at.isoformat()
        )
        for tag in tags
    ]


@router.post("/enhancement")
async def create_enhancement_tag(tag: EnhancementTagCreate, db: Session = Depends(get_db)):
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
    
    return EnhancementTagResponse(
        id=new_tag.id,
        name=new_tag.name,
        description=new_tag.description,
        color=new_tag.color,
        created_at=new_tag.created_at.isoformat()
    )


@router.put("/enhancement/{tag_id}")
async def update_enhancement_tag(tag_id: int, tag: EnhancementTagUpdate, db: Session = Depends(get_db)):
    """Update an enhancement tag"""
    
    # Protect invalid (ID 1) and original (ID 2) tags from modification
    if tag_id in [1, 2]:
        raise HTTPException(status_code=403, detail="Cannot modify system tags (invalid/original)")
    
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
    
    return EnhancementTagResponse(
        id=db_tag.id,
        name=db_tag.name,
        description=db_tag.description,
        color=db_tag.color,
        created_at=db_tag.created_at.isoformat()
    )


@router.delete("/enhancement/{tag_id}")
async def delete_enhancement_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete an enhancement tag"""
    
    # Protect invalid (ID 1) and original (ID 2) tags from deletion
    if tag_id in [1, 2]:
        raise HTTPException(status_code=403, detail="Cannot delete system tags (invalid/original)")
    
    tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    
    return {"message": "Enhancement tag deleted successfully"}


# PLATFORM TAGS
@router.get("/platform", response_model=List[PlatformTagResponse])
async def list_platform_tags(db: Session = Depends(get_db)):
    """List all platform tags"""
    tags = db.query(PlatformTag).all()
    return [
        PlatformTagResponse(
            id=tag.id,
            name=tag.name,
            icon=tag.icon,
            color=tag.color,
            created_at=tag.created_at.isoformat()
        )
        for tag in tags
    ]


@router.post("/platform")
async def create_platform_tag(tag: PlatformTagCreate, db: Session = Depends(get_db)):
    """Create a new platform tag"""
    
    existing = db.query(PlatformTag).filter(PlatformTag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Platform name already exists")
    
    new_tag = PlatformTag(
        name=tag.name,
        icon=tag.icon,
        color=tag.color or "#10b981"
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return PlatformTagResponse(
        id=new_tag.id,
        name=new_tag.name,
        icon=new_tag.icon,
        color=new_tag.color,
        created_at=new_tag.created_at.isoformat()
    )


@router.put("/platform/{tag_id}")
async def update_platform_tag(tag_id: int, tag: PlatformTagUpdate, db: Session = Depends(get_db)):
    """Update a platform tag"""
    
    db_tag = db.query(PlatformTag).filter(PlatformTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Platform tag not found")
    
    if tag.name and tag.name != db_tag.name:
        existing = db.query(PlatformTag).filter(PlatformTag.name == tag.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Platform name already exists")
    
    if tag.name is not None:
        db_tag.name = tag.name
    if tag.icon is not None:
        db_tag.icon = tag.icon
    if tag.color is not None:
        db_tag.color = tag.color
    
    db.commit()
    db.refresh(db_tag)
    
    return PlatformTagResponse(
        id=db_tag.id,
        name=db_tag.name,
        icon=db_tag.icon,
        color=db_tag.color,
        created_at=db_tag.created_at.isoformat()
    )


@router.delete("/platform/{tag_id}")
async def delete_platform_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete a platform tag"""
    
    tag = db.query(PlatformTag).filter(PlatformTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Platform tag not found")
    
    db.delete(tag)
    db.commit()
    
    return {"message": "Platform tag deleted successfully"}
