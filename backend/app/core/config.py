from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "Social Media Manager"
    debug: bool = True
    database_url: str = "sqlite:///./app.db"
    media_root: str = "./media"
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    allowed_image_types: list = ["image/jpeg", "image/png", "image/gif"]
    allowed_video_types: list = ["video/mp4", "video/webm", "video/quicktime"]
    thumbnail_size: tuple = (256, 256)  # 256p for smaller thumbnails
    
    class Config:
        env_file = ".env"

settings = Settings()
