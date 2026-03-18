"""
Media Vault Schema Models
Pydantic models for media vault API requests and responses with camelCase conversion
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


class EnhancementTagResponse(BaseSchema):
    """Enhancement tag response model"""
    id: int
    name: str
    description: Optional[str] = None
    color: str
    created_at: str
    notes: Optional[str] = None  # For invalid tags to store the actual tag name


class MediaVersionResponse(BaseSchema):
    """Media version response model"""
    id: int
    media_vault_id: int
    filename: str
    file_path: str
    thumbnail_path: Optional[str] = None
    file_size: int
    upload_date: str
    is_active: bool
    enhancement_tags: Optional[List[EnhancementTagResponse]] = []


class MediaVaultResponse(BaseSchema):
    """Media vault response model"""
    id: int
    base_filename: str
    file_type: str  # 'image' | 'video'
    is_usable: bool
    created_at: str
    updated_at: str
    latest_version: Optional[MediaVersionResponse] = None
    versions: Optional[List[MediaVersionResponse]] = []
    version_count: Optional[int] = None
    enhancement_tags: Optional[List[EnhancementTagResponse]] = []
    content_types: Optional[List[Dict[str, Any]]] = []
    platform_tags: Optional[List[Dict[str, Any]]] = []


class MediaVaultListResponse(BaseSchema):
    """Media vault list response model"""
    media: List[MediaVaultResponse]
    total: int
    skip: int
    limit: int


class MediaUploadResponse(BaseSchema):
    """Media upload response model"""
    id: int
    base_filename: str
    file_type: str
    latest_version: Dict[str, Any]
    message: str


class MediaTypeCount(BaseSchema):
    """Media type count for statistics"""
    id: int
    name: str
    count: int


class MediaStatisticsResponse(BaseSchema):
    """Media statistics response model"""
    total_media: int
    usable_media: int
    total_versions: int
    file_types: List[MediaTypeCount]
    average_versions_per_media: float
