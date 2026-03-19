"""
Content Type Models - Simplified with integrated phases
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Dict, Optional
from .base import Base


class ContentType(Base):
    __tablename__ = "content_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#3b82f6")
    icon = Column(String(50))
    has_phases = Column(Boolean, default=False)
    phase_number = Column(Integer)
    phase_name = Column(String(100))
    phase_color = Column(String(7))
    parent_content_type_id = Column(Integer, ForeignKey("content_types.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    parent = relationship("ContentType", remote_side=[id], back_populates="phases")
    phases = relationship("ContentType", back_populates="parent", cascade="all, delete-orphan")
    media_vaults = relationship("MediaVault", secondary="media_content_type_tags", back_populates="content_types")
    
    @property
    def is_phase(self) -> bool:
        """Check if this is a phase (child) content type"""
        return self.parent_content_type_id is not None
    
    @property
    def is_parent(self) -> bool:
        """Check if this is a parent content type"""
        return self.has_phases and self.parent_content_type_id is None
    
    @property
    def display_name(self) -> str:
        """Get display name with phase prefix if applicable"""
        if self.is_phase and self.parent:
            return f"{self.parent.name} > {self.phase_name}"
        return self.name
    
    @property
    def effective_color(self) -> str:
        """Get the effective color for display"""
        if self.is_phase:
            return self.phase_color or (self.parent.color if self.parent else self.color)
        return self.color
    
    def get_phase_hierarchy(self) -> Dict:
        """Get the full hierarchy for this content type"""
        if self.is_phase:
            return {
                "parent": {
                    "id": self.parent.id,
                    "name": self.parent.name,
                    "color": self.parent.color
                },
                "phase": {
                    "id": self.id,
                    "phase_number": self.phase_number,
                    "phase_name": self.phase_name,
                    "color": self.effective_color
                }
            }
        return {
            "parent": {
                "id": self.id,
                "name": self.name,
                "color": self.color,
                "has_phases": self.has_phases
            },
            "phase": None
        }
    
    def to_dict(self, include_phases: bool = False) -> Dict:
        """Convert to dictionary for API responses"""
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "icon": self.icon,
            "has_phases": self.has_phases,
            "phase_number": self.phase_number,
            "phase_name": self.phase_name,
            "phase_color": self.phase_color,
            "is_phase": self.is_phase,
            "is_parent": self.is_parent,
            "display_name": self.display_name,
            "effective_color": self.effective_color,
            "created_at": self.created_at.isoformat()
        }
        
        if include_phases and self.is_parent:
            result["phases"] = [
                {
                    "id": phase.id,
                    "phase_number": phase.phase_number,
                    "phase_name": phase.phase_name,
                    "phase_color": phase.phase_color,
                    "display_name": phase.display_name
                }
                for phase in sorted(self.phases, key=lambda x: x.phase_number or 0)
            ]
        
        return result
