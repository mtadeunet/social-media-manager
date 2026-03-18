"""
Content Type Service Layer
Handles content type and phase management
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from ..models.content_type import ContentType
from ..models.media_vault import MediaVault
from ..database import get_db


class ContentTypeService:
    """Service layer for Content Type operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_content_type(
        self,
        name: str,
        description: Optional[str] = None,
        color: str = "#3b82f6",
        icon: Optional[str] = None,
        has_phases: bool = False,
        phases: Optional[List[Dict[str, Any]]] = None
    ) -> ContentType:
        """Create a new content type with optional phases"""
        
        # Create parent content type
        content_type = ContentType(
            name=name,
            description=description,
            color=color,
            icon=icon,
            has_phases=has_phases
        )
        
        self.db.add(content_type)
        self.db.flush()
        
        # Create phases if specified
        if has_phases and phases:
            for i, phase in enumerate(phases, 1):
                phase_content_type = ContentType(
                    name=name,  # Keep same base name for phases
                    phase_number=i,
                    phase_name=phase.get("name", f"Stage {i}"),
                    phase_color=phase.get("color"),
                    parent_content_type_id=content_type.id
                )
                self.db.add(phase_content_type)
        
        self.db.commit()
        return content_type
    
    def get_content_type_tree(self) -> List[Dict[str, Any]]:
        """Get all content types with their phases in a tree structure"""
        
        # Get all parent content types
        parent_types = self.db.query(ContentType).filter(
            ContentType.parent_content_type_id.is_(None)
        ).all()
        
        result = []
        for parent in parent_types:
            content_type_dict = {
                "id": parent.id,
                "name": parent.name,
                "description": parent.description,
                "color": parent.color,
                "icon": parent.icon,
                "has_phases": parent.has_phases,
                "phase_number": None,
                "phase_name": None,
                "phase_color": None,
                "is_phase": False,
                "is_parent": parent.has_phases and parent.parent_content_type_id is None,
                "display_name": parent.display_name,
                "effective_color": parent.effective_color,
                "created_at": parent.created_at.isoformat(),
                "phases": []
            }
            
            # Get phases if this content type has them
            if parent.has_phases:
                phases = self.db.query(ContentType).filter(
                    ContentType.parent_content_type_id == parent.id
                ).order_by(ContentType.phase_number).all()
                
                content_type_dict["phases"] = [
                    {
                        "id": phase.id,
                        "name": phase.name,
                        "description": phase.description,
                        "color": phase.color,
                        "icon": phase.icon,
                        "has_phases": phase.has_phases,
                        "phase_number": phase.phase_number,
                        "phase_name": phase.phase_name,
                        "phase_color": phase.phase_color,
                        "is_phase": phase.is_phase,
                        "is_parent": phase.is_parent,
                        "display_name": phase.display_name,
                        "effective_color": phase.effective_color,
                        "created_at": phase.created_at.isoformat(),
                        "phases": None
                    }
                    for phase in phases
                ]
            
            result.append(content_type_dict)
        
        return result
    
    def get_all_content_types(self, include_phases: bool = True) -> List[ContentType]:
        """Get all content types, optionally including phases"""
        
        if include_phases:
            return self.db.query(ContentType).order_by(
                ContentType.parent_content_type_id.asc().nullsfirst(),
                ContentType.phase_number.asc().nullsfirst()
            ).all()
        else:
            # Only return parent content types
            return self.db.query(ContentType).filter(
                ContentType.parent_content_type_id.is_(None)
            ).all()
    
    def get_content_type_with_phases(self, content_type_id: int) -> Optional[ContentType]:
        """Get a content type with all its phases"""
        
        content_type = self.db.query(ContentType).options(
            joinedload(ContentType.phases)
        ).filter(ContentType.id == content_type_id).first()
        
        return content_type
    
    def add_phase_to_content_type(
        self,
        parent_id: int,
        phase_name: str,
        phase_number: Optional[int] = None,
        phase_color: Optional[str] = None
    ) -> ContentType:
        """Add a phase to an existing content type"""
        
        parent = self.db.query(ContentType).get(parent_id)
        if not parent:
            raise ValueError(f"Content type with ID {parent_id} not found")
        
        if not parent.has_phases:
            parent.has_phases = True
        
        # Determine phase number if not provided
        if phase_number is None:
            last_phase = self.db.query(ContentType).filter(
                ContentType.parent_content_type_id == parent_id
            ).order_by(ContentType.phase_number.desc()).first()
            
            phase_number = (last_phase.phase_number + 1) if last_phase else 1
        
        # Create phase
        phase = ContentType(
            name=parent.name,
            phase_number=phase_number,
            phase_name=phase_name,
            phase_color=phase_color,
            parent_content_type_id=parent_id
        )
        
        self.db.add(phase)
        self.db.commit()
        
        return phase
    
    def update_content_type(
        self,
        content_type_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None
    ) -> ContentType:
        """Update content type details"""
        
        content_type = self.db.query(ContentType).get(content_type_id)
        if not content_type:
            raise ValueError(f"Content type with ID {content_type_id} not found")
        
        if name is not None:
            content_type.name = name
            # Also update phase names if this is a parent
            if content_type.is_parent:
                for phase in content_type.phases:
                    phase.name = name
        
        if description is not None:
            content_type.description = description
        
        if color is not None:
            content_type.color = color
        
        if icon is not None:
            content_type.icon = icon
        
        self.db.commit()
        return content_type
    
    def delete_content_type(self, content_type_id: int) -> bool:
        """Delete a content type and all its phases"""
        
        content_type = self.db.query(ContentType).get(content_type_id)
        if not content_type:
            return False
        
        self.db.delete(content_type)
        self.db.commit()
        return True
    
    def add_content_type_to_media(
        self,
        media_id: int,
        content_type_id: int
    ) -> bool:
        """Add a content type to media"""
        
        media = self.db.query(MediaVault).get(media_id)
        content_type = self.db.query(ContentType).get(content_type_id)
        
        if not media or not content_type:
            return False
        
        # If it's a phase, add the parent instead
        if content_type.is_phase:
            content_type = content_type.parent
        
        if content_type not in media.content_types:
            media.content_types.append(content_type)
            self.db.commit()
        
        return True
    
    def remove_content_type_from_media(
        self,
        media_id: int,
        content_type_id: int
    ) -> bool:
        """Remove a content type from media"""
        
        media = self.db.query(MediaVault).get(media_id)
        if not media:
            return False
        
        content_type = self.db.query(ContentType).get(content_type_id)
        if not content_type:
            return False
        
        if content_type in media.content_types:
            media.content_types.remove(content_type)
            self.db.commit()
        
        return True
    
    def get_media_by_content_type(
        self,
        content_type_id: int,
        include_phases: bool = True,
        only_usable: bool = False
    ) -> List[MediaVault]:
        """Get all media with a specific content type"""
        
        query = self.db.query(MediaVault).join(
            MediaVault.content_types
        ).filter(ContentType.id == content_type_id)
        
        if only_usable:
            query = query.filter(MediaVault.is_usable == True)
        
        media_list = query.all()
        
        # If include_phases and this is a parent, also get media with phases
        if include_phases:
            content_type = self.db.query(ContentType).get(content_type_id)
            if content_type and content_type.has_phases:
                phase_ids = [p.id for p in content_type.phases]
                
                phase_media = self.db.query(MediaVault).join(
                    MediaVault.content_types
                ).filter(
                    ContentType.id.in_(phase_ids)
                )
                
                if only_usable:
                    phase_media = phase_media.filter(MediaVault.is_usable == True)
                
                media_list.extend(phase_media.all())
        
        return media_list
    
    def get_content_type_statistics(self) -> Dict[str, Any]:
        """Get statistics about content types and their usage"""
        
        # Get all content types
        content_types = self.get_all_content_types(include_phases=False)
        
        stats = {
            "total_content_types": len(content_types),
            "content_types_with_phases": sum(1 for ct in content_types if ct.has_phases),
            "total_phases": self.db.query(ContentType).filter(
                ContentType.parent_content_type_id.isnot(None)
            ).count(),
            "usage_by_type": []
        }
        
        # Get usage statistics for each content type
        for ct in content_types:
            media_count = self.db.query(MediaVault).join(
                MediaVault.content_types
            ).filter(ContentType.id == ct.id).count()
            
            stats["usage_by_type"].append({
                "id": ct.id,
                "name": ct.name,
                "color": ct.color,
                "media_count": media_count,
                "has_phases": ct.has_phases
            })
        
        return stats


def get_content_type_service() -> ContentTypeService:
    """Get content type service instance"""
    db = next(get_db())
    return ContentTypeService(db)
