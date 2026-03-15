from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import hashlib
from datetime import datetime
from PIL import Image
import io

from ..models import MediaVault, MediaVersion, EnhancementTag
from ..models.base import get_db

router = APIRouter(prefix="/media-vault", tags=["media-vault"])


def generate_hash_filename(original_name: str, content: bytes) -> str:
    """Generate {original}_{hash4}.jpg filename"""
    base_name = os.path.splitext(original_name)[0]
    hash_obj = hashlib.sha256(content)
    hash_suffix = hash_obj.hexdigest()[-4:]
    return f"{base_name}_{hash_suffix}.jpg"


def convert_to_jpg(content: bytes, original_filename: str) -> bytes:
    """Convert PNG to JPG for storage optimization"""
    if original_filename.lower().endswith('.png'):
        try:
            img = Image.open(io.BytesIO(content))
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            else:
                img = img.convert('RGB')
            
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85)
            return output.getvalue()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to convert PNG to JPG: {str(e)}")
    return content


def create_thumbnail(file_path: str, thumbnail_path: str):
    """Create thumbnail for media file"""
    try:
        img = Image.open(file_path)
        img.thumbnail((256, 256))
        img.save(thumbnail_path, 'JPEG', quality=85)
    except Exception as e:
        print(f"Warning: Failed to create thumbnail: {e}")


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    enhancement_tags: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a new media file to the vault"""
    
    if not file.content_type:
        raise HTTPException(status_code=400, detail="No content type provided")
    
    content = await file.read()
    processed_content = convert_to_jpg(content, file.filename)
    new_filename = generate_hash_filename(file.filename, processed_content)
    
    media_dir = f"media/vault/{datetime.now().strftime('%Y/%m')}"
    os.makedirs(media_dir, exist_ok=True)
    os.makedirs(f"{media_dir}/thumbnails", exist_ok=True)
    
    file_path = f"{media_dir}/{new_filename}"
    with open(file_path, 'wb') as f:
        f.write(processed_content)
    
    thumbnail_path = f"{media_dir}/thumbnails/thumb_{new_filename}"
    create_thumbnail(file_path, thumbnail_path)
    
    file_type = "video" if file.content_type.startswith("video") else "image"
    base_filename = file.filename.split('.')[0] if file.filename else "unnamed"
    
    media_vault = MediaVault(
        base_filename=base_filename,
        file_type=file_type,
        is_usable=False
    )
    db.add(media_vault)
    db.flush()
    
    media_version = MediaVersion(
        media_vault_id=media_vault.id,
        filename=new_filename,
        file_path=file_path,
        thumbnail_path=thumbnail_path,
        file_size=len(processed_content)
    )
    db.add(media_version)
    
    if enhancement_tags:
        tag_ids = [int(tag_id.strip()) for tag_id in enhancement_tags.split(',') if tag_id.strip()]
        for tag_id in tag_ids:
            tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
            if tag:
                media_version.enhancement_tags.append(tag)
    
    db.commit()
    
    return {
        "id": media_vault.id,
        "base_filename": media_vault.base_filename,
        "file_type": media_vault.file_type,
        "latest_version": {
            "id": media_version.id,
            "filename": media_version.filename,
            "file_size": media_version.file_size
        },
        "message": "Media uploaded successfully"
    }


@router.get("/")
async def list_media(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    usable_only: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """List media with filtering options"""
    
    query = db.query(MediaVault)
    
    if usable_only:
        query = query.filter(MediaVault.is_usable == True)
    
    if search:
        query = query.filter(MediaVault.base_filename.contains(search))
    
    media_items = query.offset(skip).limit(limit).all()
    
    return {
        "media": [
            {
                "id": media.id,
                "base_filename": media.base_filename,
                "file_type": media.file_type,
                "is_usable": media.is_usable,
                "created_at": media.created_at.isoformat(),
                "latest_version": {
                    "id": media.latest_version.id if media.latest_version else None,
                    "filename": media.latest_version.filename if media.latest_version else None,
                    "thumbnail_path": media.latest_version.thumbnail_path if media.latest_version else None
                } if media.latest_version else None,
                "version_count": len(media.versions)
            }
            for media in media_items
        ],
        "total": len(media_items),
        "skip": skip,
        "limit": limit
    }


@router.get("/{media_id}")
async def get_media(media_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific media item"""
    
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {
        "id": media.id,
        "base_filename": media.base_filename,
        "file_type": media.file_type,
        "is_usable": media.is_usable,
        "created_at": media.created_at.isoformat(),
        "updated_at": media.updated_at.isoformat(),
        "versions": [
            {
                "id": version.id,
                "filename": version.filename,
                "file_path": version.file_path,
                "file_size": version.file_size,
                "upload_date": version.upload_date.isoformat(),
                "thumbnail_path": version.thumbnail_path,
                "enhancement_tags": [
                    {
                        "id": tag.id,
                        "name": tag.name,
                        "color": tag.color
                    }
                    for tag in version.enhancement_tags
                ]
            }
            for version in sorted(media.versions, key=lambda v: v.upload_date, reverse=True)
        ]
    }


@router.put("/{media_id}/usable")
async def toggle_usability(media_id: int, db: Session = Depends(get_db)):
    """Toggle media usability for posts"""
    
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    media.is_usable = not media.is_usable
    media.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "id": media.id,
        "is_usable": media.is_usable,
        "message": f"Media marked as {'usable' if media.is_usable else 'not usable'}"
    }


@router.delete("/{media_id}")
async def delete_media(media_id: int, db: Session = Depends(get_db)):
    """Delete a media item and all its versions"""
    
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    for version in media.versions:
        try:
            if version.file_path and os.path.exists(version.file_path):
                os.remove(version.file_path)
            if version.thumbnail_path and os.path.exists(version.thumbnail_path):
                os.remove(version.thumbnail_path)
        except Exception as e:
            print(f"Warning: Failed to delete file {version.file_path}: {e}")
    
    db.delete(media)
    db.commit()
    
    return {"message": "Media deleted successfully"}


@router.post("/{media_id}/versions")
async def add_version(
    media_id: int,
    file: UploadFile = File(...),
    enhancement_tags: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Add a new version to existing media"""
    
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    content = await file.read()
    processed_content = convert_to_jpg(content, file.filename)
    new_filename = generate_hash_filename(media.base_filename, processed_content)
    
    media_dir = f"media/vault/{datetime.now().strftime('%Y/%m')}"
    os.makedirs(media_dir, exist_ok=True)
    os.makedirs(f"{media_dir}/thumbnails", exist_ok=True)
    
    file_path = f"{media_dir}/{new_filename}"
    with open(file_path, 'wb') as f:
        f.write(processed_content)
    
    thumbnail_path = f"{media_dir}/thumbnails/thumb_{new_filename}"
    create_thumbnail(file_path, thumbnail_path)
    
    media_version = MediaVersion(
        media_vault_id=media.id,
        filename=new_filename,
        file_path=file_path,
        thumbnail_path=thumbnail_path,
        file_size=len(processed_content)
    )
    db.add(media_version)
    
    if enhancement_tags:
        tag_ids = [int(tag_id.strip()) for tag_id in enhancement_tags.split(',') if tag_id.strip()]
        for tag_id in tag_ids:
            tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
            if tag:
                media_version.enhancement_tags.append(tag)
    
    db.commit()
    
    return {
        "id": media_version.id,
        "filename": media_version.filename,
        "message": "Version added successfully"
    }


@router.delete("/{media_id}/versions/{version_id}")
async def delete_version(media_id: int, version_id: int, db: Session = Depends(get_db)):
    """Delete a specific version of media"""
    
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    version = db.query(MediaVersion).filter(
        MediaVersion.id == version_id,
        MediaVersion.media_vault_id == media_id
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if len(media.versions) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only version")
    
    try:
        if version.file_path and os.path.exists(version.file_path):
            os.remove(version.file_path)
        if version.thumbnail_path and os.path.exists(version.thumbnail_path):
            os.remove(version.thumbnail_path)
    except Exception as e:
        print(f"Warning: Failed to delete file {version.file_path}: {e}")
    
    db.delete(version)
    db.commit()
    
    return {"message": "Version deleted successfully"}
