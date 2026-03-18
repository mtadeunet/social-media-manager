from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from typing import List, Optional
import os

from ..database import get_db
from ..models import Post, MediaFile
from ..schemas import MediaFileResponse, FileValidationRequest, FileValidationResponse, StageUploadRequest
from ..core import (
    get_media_directory, get_thumbnail_path, validate_file, get_file_type,
    parse_filename, get_stage_filename, create_thumbnail, create_video_thumbnail,
    save_upload_file
)

router = APIRouter(prefix="/media", tags=["media"])

@router.get("/posts/{post_id}/files")
def get_post_files(
    post_id: int, 
    stage: str = Query(..., description="Stage: original, framed, detailed"),
    db: Session = Depends(get_db)
):
    """Get files for specific stage of a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    media_files = db.query(MediaFile).filter(MediaFile.post_id == post_id).all()
    
    stage_files = []
    for media in media_files:
        stage_path = media.get_stage_path(stage)
        if stage_path and os.path.exists(stage_path):
            stage_files.append({
                "id": media.id,
                "filename": media.get_stage_filename(stage),
                "path": stage_path,
                "thumbnail_path": media.get_stage_path(f"{stage}_thumbnail"),
                "file_type": media.file_type
            })
    
    return {"files": stage_files}

@router.post("/posts/{post_id}/upload-stage")
async def upload_to_stage(
    post_id: int,
    stage: str = Form(...),
    action: str = Form(...),  # "replace" | "new" | "original"
    target_media_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload file to specific stage with validation"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Validate file
    validate_file(file)
    file_type = get_file_type(file.content_type)
    base_filename, file_extension = parse_filename(file.filename)
    
    # Get media directory
    media_dir = get_media_directory(post_id, post.is_posted)
    
    # Determine filename and path
    if action == "original":
        filename = get_stage_filename(base_filename, file_extension, "original")
        file_path = media_dir / filename
    else:
        filename = get_stage_filename(base_filename, file_extension, stage)
        file_path = media_dir / filename
    
    # Save file
    await save_upload_file(file, file_path)
    
    # Create thumbnail
    thumbnail_path = get_thumbnail_path(file_path)
    if file_type == "image":
        await create_thumbnail(file_path, thumbnail_path)
        actual_thumbnail_path = thumbnail_path
    else:
        # For videos, always use .jpg extension for thumbnails
        video_thumbnail_path = thumbnail_path.with_suffix('.jpg')
        await create_video_thumbnail(file_path, video_thumbnail_path)
        actual_thumbnail_path = video_thumbnail_path
    
    # Update database
    if action == "original":
        # Create new media file
        media = MediaFile(
            post_id=post_id,
            base_filename=base_filename,
            file_extension=file_extension,
            original_path=str(file_path),
            original_thumbnail_path=str(actual_thumbnail_path),
            file_type=file_type
        )
        db.add(media)
    else:
        # Update existing media file or create new
        if action == "replace" and target_media_id:
            media = db.query(MediaFile).filter(MediaFile.id == target_media_id).first()
            if not media:
                raise HTTPException(status_code=404, detail="Target media file not found")
            
            if stage == "framed":
                media.framed_path = str(file_path)
                media.framed_thumbnail_path = str(actual_thumbnail_path)
            elif stage == "detailed":
                media.detailed_path = str(file_path)
                media.detailed_thumbnail_path = str(actual_thumbnail_path)
        else:
            # Create new media file for staged content
            media = MediaFile(
                post_id=post_id,
                base_filename=base_filename,
                file_extension=file_extension,
                original_path="",  # No original file
                original_thumbnail_path="",  # No original thumbnail
                file_type=file_type
            )
            if stage == "framed":
                media.framed_path = str(file_path)
                media.framed_thumbnail_path = str(actual_thumbnail_path)
            elif stage == "detailed":
                media.detailed_path = str(file_path)
                media.detailed_thumbnail_path = str(actual_thumbnail_path)
            elif stage == "original":
                media.original_path = str(file_path)
                media.original_thumbnail_path = str(actual_thumbnail_path)
            db.add(media)
    
    db.commit()
    db.refresh(media)
    
    return {"message": "File uploaded successfully", "media_id": media.id}

@router.post("/posts/{post_id}/validate-upload")
def validate_upload(
    post_id: int,
    request: FileValidationRequest,
    db: Session = Depends(get_db)
):
    """Validate filename for stage upload"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get existing files in target stage
    media_files = db.query(MediaFile).filter(MediaFile.post_id == post_id).all()
    
    stage_files = []
    for media in media_files:
        stage_path = media.get_stage_path(request.target_stage)
        if stage_path and os.path.exists(stage_path):
            stage_files.append({
                "id": media.id,
                "filename": media.get_stage_filename(request.target_stage),
                "thumbnail_path": media.get_stage_path(f"{request.target_stage}_thumbnail"),
                "file_type": media.file_type
            })
    
    # Check if filename matches any existing files
    base_filename, file_extension = parse_filename(request.filename)
    expected_filename = get_stage_filename(base_filename, file_extension, request.target_stage)
    
    matching_files = [f for f in stage_files if f["filename"] == expected_filename]
    
    return FileValidationResponse(
        valid=len(matching_files) == 0,
        stage_files=stage_files,
        requires_action=len(matching_files) > 0
    )

@router.post("/media/{media_id}/promote")
async def promote_media(
    media_id: int,
    target_stage: str = Form(...),
    db: Session = Depends(get_db)
):
    """Promote media file to next stage"""
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media file not found")
    
    post = db.query(Post).filter(Post.id == media.post_id).first()
    media_dir = get_media_directory(media.post_id, post.is_posted)
    
    # Determine source and target paths
    if target_stage == "framed":
        source_path = media.original_path
        target_filename = media.get_stage_filename("framed")
        target_path = media_dir / target_filename
        media.framed_path = str(target_path)
    elif target_stage == "detailed":
        source_path = media.framed_path or media.original_path
        target_filename = media.get_stage_filename("detailed")
        target_path = media_dir / target_filename
        media.detailed_path = str(target_path)
    else:
        raise HTTPException(status_code=400, detail="Invalid target stage")
    
    # Copy file to new stage
    if source_path and os.path.exists(source_path):
        try:
            import shutil
            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, target_path)
            
            # Create thumbnail for new stage
            thumbnail_path = get_thumbnail_path(target_path)
            if media.file_type == "image":
                await create_thumbnail(target_path, thumbnail_path)
                actual_thumbnail_path = thumbnail_path
            else:
                # For videos, always use .jpg extension for thumbnails
                video_thumbnail_path = thumbnail_path.with_suffix('.jpg')
                await create_video_thumbnail(target_path, video_thumbnail_path)
                actual_thumbnail_path = video_thumbnail_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to copy file from {source_path} to {target_path}: {str(e)}")
        
        if target_stage == "framed":
            media.framed_thumbnail_path = str(actual_thumbnail_path)
        elif target_stage == "detailed":
            media.detailed_thumbnail_path = str(actual_thumbnail_path)
    
    db.commit()
    
    return {"message": f"Media promoted to {target_stage}"}

@router.get("/media/{post_id}/{filename}")
def serve_media(post_id: int, filename: str, db: Session = Depends(get_db)):
    """Serve media files"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    media_dir = get_media_directory(post_id, post.is_posted)
    file_path = media_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
