"""
Content Type API Endpoints
RESTful API for managing content types and phases
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.content_type_service import ContentTypeService, get_content_type_service
from ..models.content_type import ContentType
from ..schemas import (
    ContentTypeCreate, ContentTypeUpdate, ContentTypeResponse,
    PhaseCreate, ContentTypeTreeResponse, MediaTypeResponse,
    ContentTypeStatisticsResponse
)

router = APIRouter(prefix="/content-types", tags=["content-types"])


@router.get("/", response_model=List[ContentTypeResponse])
async def list_content_types(
    include_phases: bool = Query(True, description="Include phase content types in the list"),
    tree_view: bool = Query(False, description="Return in tree structure with parent-child relationships"),
    db: Session = Depends(get_db)
):
    """List all content types"""
    service = ContentTypeService(db)
    
    if tree_view:
        # Return tree structure
        tree = service.get_content_type_tree()
        return [ContentTypeResponse(**ct) for ct in tree]
    else:
        # Return flat list
        content_types = service.get_all_content_types(include_phases=include_phases)
        return [ContentTypeResponse.model_validate(ct.to_dict()) for ct in content_types]


@router.get("/{content_type_id}", response_model=ContentTypeResponse)
async def get_content_type(
    content_type_id: int,
    include_phases: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get a specific content type"""
    service = ContentTypeService(db)
    
    if include_phases:
        content_type = service.get_content_type_with_phases(content_type_id)
    else:
        content_type = db.query(ContentType).get(content_type_id)
    
    if not content_type:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    return ContentTypeResponse.model_validate(content_type.to_dict())


@router.post("/", response_model=ContentTypeResponse)
async def create_content_type(
    content_type: ContentTypeCreate,
    db: Session = Depends(get_db)
):
    """Create a new content type"""
    service = ContentTypeService(db)
    
    try:
        new_content_type = service.create_content_type(
            name=content_type.name,
            description=content_type.description,
            color=content_type.color,
            icon=content_type.icon,
            has_phases=content_type.has_phases,
            phases=content_type.phases
        )
        
        return ContentTypeResponse.model_validate(new_content_type)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{content_type_id}", response_model=ContentTypeResponse)
async def update_content_type(
    content_type_id: int,
    content_type_update: ContentTypeUpdate,
    db: Session = Depends(get_db)
):
    """Update a content type"""
    service = ContentTypeService(db)
    
    try:
        updated = service.update_content_type(
            content_type_id=content_type_id,
            name=content_type_update.name,
            description=content_type_update.description,
            color=content_type_update.color,
            icon=content_type_update.icon
        )
        
        if not updated:
            raise HTTPException(status_code=404, detail="Content type not found")
        
        return ContentTypeResponse.model_validate(updated)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{content_type_id}")
async def delete_content_type(content_type_id: int, db: Session = Depends(get_db)):
    """Delete a content type"""
    service = ContentTypeService(db)
    
    success = service.delete_content_type(content_type_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    return {"message": "Content type deleted successfully"}


@router.post("/{content_type_id}/phases", response_model=ContentTypeResponse)
async def add_phase(
    content_type_id: int,
    phase: PhaseCreate,
    db: Session = Depends(get_db)
):
    """Add a phase to a content type"""
    service = ContentTypeService(db)
    
    try:
        new_phase = service.add_phase_to_content_type(
            parent_id=content_type_id,
            phase_name=phase.phase_name,
            phase_number=phase.phase_number,
            phase_color=phase.phase_color
        )
        
        # Return the parent content type with all phases
        parent = service.get_content_type_with_phases(content_type_id)
        
        if not parent:
            raise HTTPException(status_code=404, detail="Content type not found")
        
        return ContentTypeResponse.model_validate(parent)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{content_type_id}/media")
async def get_media_by_content_type(
    content_type_id: int,
    include_phases: bool = Query(True),
    only_usable: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get media items with a specific content type"""
    service = ContentTypeService(db)
    
    media_list = service.get_media_by_content_type(
        content_type_id=content_type_id,
        include_phases=include_phases,
        only_usable=only_usable
    )
    
    # Apply pagination
    total = len(media_list)
    media_paginated = media_list[skip:skip + limit]
    
    return {
        "items": [media.to_dict() for media in media_paginated],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/media/{media_id}/{content_type_id}")
async def add_content_type_to_media(
    media_id: int,
    content_type_id: int,
    db: Session = Depends(get_db)
):
    """Add a content type to a media item"""
    service = ContentTypeService(db)
    
    success = service.add_content_type_to_media(media_id, content_type_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Media or content type not found"
        )
    
    return {"message": "Content type added to media successfully"}


@router.delete("/media/{media_id}/{content_type_id}")
async def remove_content_type_from_media(
    media_id: int,
    content_type_id: int,
    db: Session = Depends(get_db)
):
    """Remove a content type from a media item"""
    service = ContentTypeService(db)
    
    success = service.remove_content_type_from_media(media_id, content_type_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Media or content type not found"
        )
    
    return {"message": "Content type removed from media successfully"}


@router.get("/statistics/overview")
async def get_content_type_statistics(db: Session = Depends(get_db)):
    """Get content type usage statistics"""
    service = ContentTypeService(db)
    
    stats = service.get_content_type_statistics()
    
    return stats


@router.post("/initialize-defaults")
async def initialize_default_content_types(db: Session = Depends(get_db)):
    """Initialize default content types"""
    service = ContentTypeService(db)
    
    default_types = [
        {
            "name": "Travel",
            "description": "Travel and adventure content",
            "color": "#22c55e",
            "icon": "✈️",
            "has_phases": True,
            "phases": [
                {"name": "Local", "color": "#86efac"},
                {"name": "National", "color": "#22c55e"},
                {"name": "International", "color": "#16a34a"}
            ]
        },
        {
            "name": "Fashion",
            "description": "Fashion and style content",
            "color": "#ec4899",
            "icon": "👗",
            "has_phases": True,
            "phases": [
                {"name": "Casual", "color": "#f9a8d4"},
                {"name": "Business", "color": "#ec4899"},
                {"name": "High Fashion", "color": "#db2777"}
            ]
        },
        {
            "name": "Food",
            "description": "Food and culinary content",
            "color": "#f59e0b",
            "icon": "🍽️",
            "has_phases": False
        },
        {
            "name": "Fitness",
            "description": "Fitness and workout content",
            "color": "#ef4444",
            "icon": "💪",
            "has_phases": True,
            "phases": [
                {"name": "Beginner", "color": "#fca5a5"},
                {"name": "Intermediate", "color": "#ef4444"},
                {"name": "Advanced", "color": "#dc2626"}
            ]
        }
    ]
    
    created = []
    for ct_data in default_types:
        # Check if already exists
        existing = db.query(ContentType).filter(
            ContentType.name == ct_data["name"]
        ).first()
        
        if not existing:
            created.append(service.create_content_type(**ct_data))
    
    return {
        "message": f"Created {len(created)} default content types",
        "created": [ct.name for ct in created]
    }
