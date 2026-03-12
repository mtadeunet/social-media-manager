from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from .media import MediaFileResponse

class PostBase(BaseModel):
    caption: Optional[str] = None
    stage: str = "draft"

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    caption: Optional[str] = None
    stage: Optional[str] = None

class PostResponse(PostBase):
    id: int
    is_posted: bool = False
    first_posted_at: Optional[datetime] = None
    first_platform_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    media_files: List[MediaFileResponse] = []
    
    class Config:
        from_attributes = True

class PostList(BaseModel):
    id: int
    caption: Optional[str] = None
    stage: str
    is_posted: bool = False
    created_at: datetime
    media_count: int = 0
    
    class Config:
        from_attributes = True
