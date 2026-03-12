from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship

from .base import Base

class MediaFile(Base):
    __tablename__ = "media_files"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    base_filename = Column(String, nullable=False)  # my_photo (without extension)
    file_extension = Column(String, nullable=False)  # .jpg
    original_path = Column(String, nullable=False)
    framed_path = Column(String, nullable=True)
    detailed_path = Column(String, nullable=True)
    original_thumbnail_path = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    framed_thumbnail_path = Column(String, nullable=True)
    detailed_thumbnail_path = Column(String, nullable=True)
    file_type = Column(String, nullable=False)  # image or video
    order_index = Column(Integer, default=0)
    
    # Relationships
    post = relationship("Post", back_populates="media_files")
    
    def __repr__(self):
        return f"<MediaFile(id={self.id}, base_filename={self.base_filename})>"
    
    @property
    def original_filename(self):
        return f"{self.base_filename}{self.file_extension}"
    
    def get_stage_filename(self, stage: str) -> str:
        """Get filename for specific stage"""
        if stage == "original":
            return self.original_filename
        else:
            return f"{self.base_filename}_{stage}{self.file_extension}"
    
    def get_stage_path(self, stage: str) -> str:
        """Get file path for specific stage"""
        if stage == "original":
            return self.original_path
        elif stage == "framed":
            return self.framed_path
        elif stage == "detailed":
            return self.detailed_path
        else:
            return None
