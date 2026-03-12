from pydantic import BaseModel
from typing import Optional

class MediaFileBase(BaseModel):
    base_filename: str
    file_extension: str
    file_type: str
    order_index: int = 0

class MediaFileCreate(MediaFileBase):
    original_path: str

class MediaFileUpdate(BaseModel):
    order_index: Optional[int] = None

class MediaFileResponse(MediaFileBase):
    id: int
    post_id: int
    original_path: str
    framed_path: Optional[str] = None
    detailed_path: Optional[str] = None
    original_thumbnail_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    framed_thumbnail_path: Optional[str] = None
    detailed_thumbnail_path: Optional[str] = None
    
    class Config:
        from_attributes = True

class FileValidationRequest(BaseModel):
    filename: str
    target_stage: str

class FileValidationResponse(BaseModel):
    valid: bool
    stage_files: list = []
    requires_action: bool = False

class StageUploadRequest(BaseModel):
    stage: str
    action: str  # "replace" | "new" | "original"
    target_media_id: Optional[int] = None
