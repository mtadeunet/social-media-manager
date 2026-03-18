"""
Tag Schema Models
Pydantic models for tag API requests and responses with camelCase conversion
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """Base schema with camelCase alias generation"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


class EnhancementTagResponse(BaseSchema):
    """Enhancement tag response model"""
    id: int
    name: str
    description: Optional[str] = None
    color: str
    created_at: str


class EnhancementTagCreate(BaseSchema):
    """Enhancement tag create model"""
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class EnhancementTagUpdate(BaseSchema):
    """Enhancement tag update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class PlatformTagResponse(BaseSchema):
    """Platform tag response model"""
    id: int
    name: str
    icon: Optional[str] = None
    color: str
    created_at: str


class PlatformTagCreate(BaseSchema):
    """Platform tag create model"""
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


class PlatformTagUpdate(BaseSchema):
    """Platform tag update model"""
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class ContentTypeTagResponse(BaseSchema):
    """Content type tag response model"""
    id: int
    name: str
    description: Optional[str] = None
    color: str
    has_phases: bool
    phase_count: Optional[int] = None
    created_at: str


class ContentTypeTagCreate(BaseSchema):
    """Content type tag create model"""
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    has_phases: Optional[bool] = False
    phase_count: Optional[int] = None


class ContentTypeTagUpdate(BaseSchema):
    """Content type tag update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    has_phases: Optional[bool] = None
    phase_count: Optional[int] = None


class PhaseResponse(BaseSchema):
    """Phase response model"""
    id: int
    name: str
    description: Optional[str] = None
    color: str
    phase_number: int


class PhaseCreate(BaseSchema):
    """Phase create model"""
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class PhaseUpdate(BaseSchema):
    """Phase update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class StyleTagResponse(BaseSchema):
    """Style tag response model"""
    id: int
    name: str
    progression_stage: int
    description: Optional[str] = None
    color: str
    created_at: str


class StyleTagCreate(BaseSchema):
    """Style tag create model"""
    name: str
    progression_stage: Optional[int] = 1
    description: Optional[str] = None
    color: Optional[str] = None


class StyleTagUpdate(BaseSchema):
    """Style tag update model"""
    name: Optional[str] = None
    progression_stage: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
