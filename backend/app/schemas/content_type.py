"""
Content Type Schema Models
Pydantic models for content type API requests and responses
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """Base schema with camelCase alias generation"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


class ContentTypeBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#3b82f6", pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None
    has_phases: bool = False


class ContentTypeCreate(ContentTypeBase):
    phases: Optional[List[Dict[str, Any]]] = None


class ContentTypeUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None


class PhaseCreate(BaseSchema):
    phase_name: str = Field(..., min_length=1, max_length=100)
    phase_number: Optional[int] = None
    phase_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class ContentTypeResponse(BaseSchema):
    id: int
    name: str
    description: Optional[str]
    color: str
    icon: Optional[str]
    has_phases: bool
    phase_number: Optional[int]
    phase_name: Optional[str]
    phase_color: Optional[str]
    is_phase: bool
    is_parent: bool
    display_name: str
    effective_color: str
    created_at: str
    phases: Optional[List[Dict[str, Any]]] = None


class ContentTypeTreeResponse(BaseSchema):
    """Response model for tree-structured content types"""
    id: int
    name: str
    description: Optional[str]
    color: str
    icon: Optional[str]
    has_phases: bool
    phases: Optional[List[ContentTypeResponse]] = None


class MediaTypeResponse(BaseSchema):
    """Media type response for content type statistics"""
    id: int
    name: str
    count: int


class ContentTypeStatisticsResponse(BaseSchema):
    """Response model for content type statistics"""
    total_content_types: int
    total_media_items: int
    content_types: List[MediaTypeResponse]
    phases: List[MediaTypeResponse]
