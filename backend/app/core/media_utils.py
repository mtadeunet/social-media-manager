import os
import shutil
from pathlib import Path
from typing import Tuple, Optional
import aiofiles
from fastapi import UploadFile, HTTPException
from datetime import datetime

from .config import settings

def get_media_directory(post_id: int, is_posted: bool = False, posted_date: Optional[str] = None) -> Path:
    """Get the media directory for a post"""
    if is_posted and posted_date:
        # Posted posts: media/posts/YYYY/YYYY-MM/YYYY-MM-DD/post_{id}/
        date_obj = datetime.fromisoformat(posted_date.replace('Z', '+00:00'))
        date_dir = date_obj.strftime("%Y/%Y-%m/%Y-%m-%d")
        return Path(settings.media_root) / "posts" / date_dir / f"post_{post_id}"
    else:
        # Draft posts: media/drafts/post_{id}/
        return Path(settings.media_root) / "drafts" / f"post_{post_id}"

def get_thumbnail_path(media_path: Path) -> Path:
    """Get thumbnail path for a media file"""
    thumbnail_dir = media_path.parent / "thumbnails"
    thumbnail_dir.mkdir(parents=True, exist_ok=True)
    
    # Always use .jpg extension for thumbnails
    filename = media_path.stem + "_thumb.jpg"
    return thumbnail_dir / filename

def validate_file(file: UploadFile) -> bool:
    """Validate file type and size"""
    # Check file size
    if file.size and file.size > settings.max_file_size:
        raise HTTPException(status_code=413, detail=f"File too large. Max size: {settings.max_file_size // (1024*1024)}MB")
    
    # Check file type
    allowed_types = settings.allowed_image_types + settings.allowed_video_types
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {allowed_types}"
        )
    
    return True

def get_file_type(content_type: str) -> str:
    """Determine if file is image or video"""
    if content_type in settings.allowed_image_types:
        return "image"
    elif content_type in settings.allowed_video_types:
        return "video"
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

def parse_filename(filename: str) -> Tuple[str, str]:
    """Parse filename into base name and extension"""
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    return stem, suffix

def get_stage_filename(base_filename: str, extension: str, stage: str) -> str:
    """Generate filename for specific stage"""
    if stage == "original":
        return f"{base_filename}{extension}"
    else:
        return f"{base_filename}_{stage}{extension}"

async def create_thumbnail(image_path: Path, thumbnail_path: Path) -> None:
    """Create thumbnail for image using PIL"""
    try:
        from PIL import Image
        from ..core.config import settings
        
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Create thumbnail directory
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Open image and create thumbnail
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, P, etc.)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Create thumbnail maintaining aspect ratio
            img.thumbnail(settings.thumbnail_size, Image.Resampling.LANCZOS)
            
            # Save thumbnail
            img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
    except ImportError as e:
        # Let it fail loudly if PIL is not available - no silent fallbacks
        raise HTTPException(status_code=500, detail=f"PIL (Pillow) is not installed or not accessible: {str(e)}. Please install Pillow to create thumbnails.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create thumbnail: {str(e)}")

async def create_video_thumbnail(video_path: Path, thumbnail_path: Path) -> None:
    """Create thumbnail for video by extracting a frame using ffmpeg"""
    try:
        if video_path.exists():
            thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Use ffmpeg to extract a thumbnail from the video
            import subprocess
            
            cmd = [
                'ffmpeg',
                '-i', str(video_path),
                '-ss', '00:00:01',  # Seek to 1 second
                '-vframes', '1',     # Extract only 1 frame
                '-vf', 'scale=256:256:force_original_aspect_ratio=decrease',  # Scale to fit in 256x256
                '-y',                # Overwrite output file
                str(thumbnail_path)  # thumbnail_path already has .jpg extension
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                # If ffmpeg fails, fall back to placeholder
                with open(video_path, 'rb') as src:
                    with open(thumbnail_path, 'wb') as dst:
                        dst.write(src.read(1024))  # Just 1KB placeholder
                print(f"Warning: ffmpeg failed for {video_path}, using placeholder. Error: {result.stderr}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create video thumbnail: {str(e)}")

async def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    """Save uploaded file to destination"""
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(destination, 'wb') as f:
            content = await upload_file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

def move_post_directory(post_id: int, source_is_posted: bool, target_is_posted: bool, posted_date: Optional[str] = None):
    """Move post directory from drafts to posts or vice versa"""
    source_dir = get_media_directory(post_id, source_is_posted)
    target_dir = get_media_directory(post_id, target_is_posted, posted_date)
    
    if source_dir.exists():
        try:
            target_dir.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source_dir), str(target_dir))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to move post directory from {source_dir} to {target_dir}: {str(e)}")
