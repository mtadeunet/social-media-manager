from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from pydantic.alias_generators import to_camel
from datetime import datetime


class BaseSchema(BaseModel):
    """Base schema with camelCase alias generation"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


class MediaFileBase(BaseSchema):
    baseFilename: str = Field(..., alias='base_filename')
    fileExtension: str = Field(..., alias='file_extension')
    fileType: str = Field(..., alias='file_type')
    orderIndex: int = Field(default=0, alias='order_index')


class MediaFileCreate(MediaFileBase):
    originalPath: str = Field(..., alias='original_path')


class MediaFileUpdate(BaseSchema):
    orderIndex: Optional[int] = Field(None, alias='order_index')


class MediaFileResponse(MediaFileBase):
    id: int
    postId: int = Field(..., alias='post_id')
    originalPath: str = Field(..., alias='original_path')
    framedPath: Optional[str] = Field(None, alias='framed_path')
    detailedPath: Optional[str] = Field(None, alias='detailed_path')
    originalThumbnailPath: Optional[str] = Field(None, alias='original_thumbnail_path')
    thumbnailPath: Optional[str] = Field(None, alias='thumbnail_path')
    framedThumbnailPath: Optional[str] = Field(None, alias='framed_thumbnail_path')
    detailedThumbnailPath: Optional[str] = Field(None, alias='detailed_thumbnail_path')


class FileValidationRequest(BaseSchema):
    filename: str
    targetStage: str = Field(..., alias='target_stage')


class FileValidationResponse(BaseSchema):
    valid: bool
    stageFiles: List[dict] = Field(default=[], alias='stage_files')
    requiresAction: bool = Field(default=False, alias='requires_action')


class StageUploadRequest(BaseSchema):
    stage: str
    action: str  # "replace" | "new" | "original"
    targetMediaId: Optional[int] = Field(None, alias='target_media_id')
