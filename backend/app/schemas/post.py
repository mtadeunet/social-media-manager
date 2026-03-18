from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional
from pydantic.alias_generators import to_camel

from .media import MediaFileResponse


class BaseSchema(BaseModel):
    """Base schema with camelCase alias generation"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


class PostBase(BaseSchema):
    caption: Optional[str] = None
    stage: str = "draft"


class PostCreate(PostBase):
    pass


class PostUpdate(BaseSchema):
    caption: Optional[str] = None
    stage: Optional[str] = None


class PostResponse(PostBase):
    id: int
    isPosted: bool = Field(default=False, alias='is_posted')
    firstPostedAt: Optional[datetime] = Field(None, alias='first_posted_at')
    firstPlatformId: Optional[int] = Field(None, alias='first_platform_id')
    createdAt: datetime = Field(..., alias='created_at')
    updatedAt: datetime = Field(..., alias='updated_at')
    mediaFiles: List[MediaFileResponse] = Field(default=[], alias='media_files')


class PostList(BaseSchema):
    id: int
    caption: Optional[str] = None
    stage: str
    isPosted: bool = Field(default=False, alias='is_posted')
    createdAt: datetime = Field(..., alias='created_at')
    mediaCount: int = Field(default=0, alias='media_count')
