from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..models import EnhancementTag, ContentTypeTag, PlatformTag, SystemSetting
from ..models.base import get_db
from ..schemas.tags import (
    EnhancementTagResponse, EnhancementTagCreate, EnhancementTagUpdate,
    PlatformTagResponse, PlatformTagCreate, PlatformTagUpdate,
    ContentTypeTagResponse, ContentTypeTagCreate, ContentTypeTagUpdate,
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


class ContentTypeTagCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    has_phases: Optional[bool] = False
    phase_count: Optional[int] = None


class ContentTypeTagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    has_phases: Optional[bool] = None
    phase_count: Optional[int] = None


class PhaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class PhaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


# ENHANCEMENT TAGS
@router.get("/enhancement")
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


# CONTENT TYPE TAGS
@router.get("/content-type")
async def list_content_type_tags(db: Session = Depends(get_db)):
    """List all content type tags (base types only, with phase info)"""
    # Get only base content type tags (parent_id is null)
    base_tags = db.query(ContentTypeTag).filter(ContentTypeTag.parent_id.is_(None)).all()
    
    result = []
    for tag in base_tags:
        # Get phases for this content type
        phases = db.query(ContentTypeTag).filter(ContentTypeTag.parent_id == tag.id).order_by(ContentTypeTag.phase_number).all()
        
        tag_data = {
            "id": tag.id,
            "name": tag.name,
            "description": tag.description,
            "color": tag.color,
            "has_phases": tag.has_phases,
            "phase_count": tag.phase_count,
            "created_at": tag.created_at.isoformat(),
            "phases": [
                {
                    "id": phase.id,
                    "name": phase.name,
                    "description": phase.description,
                    "color": phase.color,
                    "phase_number": phase.phase_number,
                    "created_at": phase.created_at.isoformat()
                }
                for phase in phases
            ]
        }
        result.append(tag_data)
    
    return result


@router.post("/content-type")
async def create_content_type_tag(tag: ContentTypeTagCreate, db: Session = Depends(get_db)):
    """Create a new content type tag"""
    
    existing = db.query(ContentTypeTag).filter(ContentTypeTag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Content type name already exists")
    
    # Validate phase count if phases are enabled
    if tag.has_phases and (not tag.phase_count or tag.phase_count < 1):
        raise HTTPException(status_code=400, detail="Phase count must be at least 1 when phases are enabled")
    
    # Create base content type tag
    new_tag = ContentTypeTag(
        name=tag.name,
        description=tag.description,
        color=tag.color or "#3b82f6",
        has_phases=tag.has_phases or False,
        phase_count=tag.phase_count if tag.has_phases else None
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    # Create phase tags if phases are enabled
    phases = []
    if tag.has_phases and tag.phase_count:
        for i in range(1, tag.phase_count + 1):
            phase_name = f"{tag.name} - Phase {i}"
            phase = ContentTypeTag(
                name=phase_name,
                description=f"Phase {i} of {tag.name}",
                color=tag.color or "#3b82f6",
                parent_id=new_tag.id,
                phase_number=i
            )
            db.add(phase)
            phases.append(phase)
        
        db.commit()
    
    # Refresh to get phase IDs
    db.refresh(new_tag)
    
    # Get the created phases
    created_phases = db.query(ContentTypeTag).filter(ContentTypeTag.parent_id == new_tag.id).order_by(ContentTypeTag.phase_number).all()
    
    return {
        "id": new_tag.id,
        "name": new_tag.name,
        "description": new_tag.description,
        "color": new_tag.color,
        "has_phases": new_tag.has_phases,
        "phase_count": new_tag.phase_count,
        "created_at": new_tag.created_at.isoformat(),
        "phases": [
            {
                "id": phase.id,
                "name": phase.name,
                "description": phase.description,
                "color": phase.color,
                "phase_number": phase.phase_number,
                "created_at": phase.created_at.isoformat()
            }
            for phase in created_phases
        ]
    }


@router.put("/content-type/{tag_id}")
async def update_content_type_tag(tag_id: int, tag: ContentTypeTagUpdate, db: Session = Depends(get_db)):
    """Update a content type tag"""
    
    db_tag = db.query(ContentTypeTag).filter(ContentTypeTag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    # Can only update base tags, not phases
    if db_tag.parent_id is not None:
        raise HTTPException(status_code=400, detail="Cannot update phase tags directly. Use phase update endpoint.")
    
    if tag.name and tag.name != db_tag.name:
        existing = db.query(ContentTypeTag).filter(ContentTypeTag.name == tag.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Content type name already exists")
    
    # Validate phase count if phases are being enabled
    if tag.has_phases and tag.phase_count is not None and tag.phase_count < 1:
        raise HTTPException(status_code=400, detail="Phase count must be at least 1 when phases are enabled")
    
    # Update base tag properties
    if tag.name is not None:
        db_tag.name = tag.name
    if tag.description is not None:
        db_tag.description = tag.description
    if tag.color is not None:
        db_tag.color = tag.color
    if tag.has_phases is not None:
        db_tag.has_phases = tag.has_phases
    if tag.phase_count is not None:
        db_tag.phase_count = tag.phase_count
    
    db.commit()
    db.refresh(db_tag)
    
    # Get updated phases
    phases = db.query(ContentTypeTag).filter(ContentTypeTag.parent_id == tag_id).order_by(ContentTypeTag.phase_number).all()
    
    return {
        "id": db_tag.id,
        "name": db_tag.name,
        "description": db_tag.description,
        "color": db_tag.color,
        "has_phases": db_tag.has_phases,
        "phase_count": db_tag.phase_count,
        "created_at": db_tag.created_at.isoformat(),
        "phases": [
            {
                "id": phase.id,
                "name": phase.name,
                "description": phase.description,
                "color": phase.color,
                "phase_number": phase.phase_number,
                "created_at": phase.created_at.isoformat()
            }
            for phase in phases
        ]
    }


@router.delete("/content-type/{tag_id}")
async def delete_content_type_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete a content type tag and all its phases"""
    
    tag = db.query(ContentTypeTag).filter(ContentTypeTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    # Can only delete base tags, not phases
    if tag.parent_id is not None:
        raise HTTPException(status_code=400, detail="Cannot delete phase tags directly. Delete the parent content type instead.")
    
    # Delete all phases first
    db.query(ContentTypeTag).filter(ContentTypeTag.parent_id == tag_id).delete()
    
    # Delete the base tag
    db.delete(tag)
    db.commit()
    
    return {"message": "Content type and all its phases deleted successfully"}


@router.get("/content-type/{tag_id}/phases")
async def get_content_type_phases(tag_id: int, db: Session = Depends(get_db)):
    """Get all phases for a content type"""
    
    # Verify the content type exists and is a base type
    base_tag = db.query(ContentTypeTag).filter(ContentTypeTag.id == tag_id, ContentTypeTag.parent_id.is_(None)).first()
    if not base_tag:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    phases = db.query(ContentTypeTag).filter(ContentTypeTag.parent_id == tag_id).order_by(ContentTypeTag.phase_number).all()
    
    return [
        {
            "id": phase.id,
            "name": phase.name,
            "description": phase.description,
            "color": phase.color,
            "phase_number": phase.phase_number,
            "created_at": phase.created_at.isoformat()
        }
        for phase in phases
    ]


@router.put("/content-type/{tag_id}/phases/{phase_id}")
async def update_phase(tag_id: int, phase_id: int, phase: PhaseUpdate, db: Session = Depends(get_db)):
    """Update an individual phase"""
    
    # Verify the phase exists and belongs to the specified content type
    db_phase = db.query(ContentTypeTag).filter(
        ContentTypeTag.id == phase_id,
        ContentTypeTag.parent_id == tag_id
    ).first()
    
    if not db_phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    if phase.name is not None:
        db_phase.name = phase.name
    if phase.description is not None:
        db_phase.description = phase.description
    if phase.color is not None:
        db_phase.color = phase.color
    
    db.commit()
    db.refresh(db_phase)
    
    return {
        "id": db_phase.id,
        "name": db_phase.name,
        "description": db_phase.description,
        "color": db_phase.color,
        "phase_number": db_phase.phase_number,
        "created_at": db_phase.created_at.isoformat()
    }


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


# SYSTEM SETTINGS
@router.get("/settings/default-phase-count")
async def get_default_phase_count(db: Session = Depends(get_db)):
    """Get the global default phase count"""
    
    setting = db.query(SystemSetting).filter(SystemSetting.key == "default_phase_count").first()
    if not setting:
        # Create default setting if it doesn't exist
        setting = SystemSetting(
            key="default_phase_count",
            value="3",
            description="Default number of phases for new content types"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    
    return {
        "key": setting.key,
        "value": setting.value,
        "description": setting.description
    }


@router.put("/settings/default-phase-count")
async def set_default_phase_count(value: int, db: Session = Depends(get_db)):
    """Update the global default phase count"""
    
    if value < 1 or value > 10:
        raise HTTPException(status_code=400, detail="Default phase count must be between 1 and 10")
    
    setting = db.query(SystemSetting).filter(SystemSetting.key == "default_phase_count").first()
    if setting:
        setting.value = str(value)
    else:
        setting = SystemSetting(
            key="default_phase_count",
            value=str(value),
            description="Default number of phases for new content types"
        )
        db.add(setting)
    
    db.commit()
    
    return {
        "key": "default_phase_count",
        "value": str(value),
        "message": "Default phase count updated successfully"
    }


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
    
    default_content_type_tags = [
        {"name": "fitting room", "color": "#ef4444", "description": "Fitting room content"},
        {"name": "stockings", "color": "#f97316", "description": "Stockings content"},
        {"name": "gym", "color": "#eab308", "description": "Gym/fitness content"},
        {"name": "cosplay", "color": "#22c55e", "description": "Cosplay content"}
    ]
    
    for tag_data in default_content_type_tags:
        existing = db.query(ContentTypeTag).filter(ContentTypeTag.name == tag_data["name"]).first()
        if not existing:
            tag = ContentTypeTag(**tag_data)
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
