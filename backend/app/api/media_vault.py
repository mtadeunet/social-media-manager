from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import hashlib
from datetime import datetime
from PIL import Image
import io

from ..models import MediaVault, MediaVersion, EnhancementTag
from ..models.associations import VersionEnhancementTag
from ..models.base import get_db

router = APIRouter(prefix="/media-vault", tags=["media-vault"])


def generate_hash_filename(base_name: str, content: bytes) -> str:
    """Generate {base_name}_{hash4}.jpg filename"""
    # base_name should already be cleaned (no extension, no tags)
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


def parse_filename_tags(filename: str) -> tuple[str, list[str], list[str]]:
    """
    Parse filename to extract base name and enhancement tags.
    Examples:
    - "photo_v1_crop" -> ("photo", ["v1", "crop"])
    - "20260305_143433_000_1c977861d3b507c588a8e6e401d60701-00:00:00.000_v1" -> ("20260305_143433_000_1c977861d3b507c588a8e6e401d60701-00:00:00.000", ["v1"])
    - "image" -> ("image", [])
    """
    # Remove file extension
    name_without_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
    
    # Split by underscores and look for enhancement tags
    parts = name_without_ext.split('_')
    base_parts = []
    detected_tags = []
    invalid_tags = []
    
    # Known enhancement tags (version tags are not valid enhancement tags)
    known_tags = {'crop', 'edit', 'detail', 'original'}
    
    for part in parts:
        if part.lower() in known_tags:
            detected_tags.append(part.lower())
        elif part.lower().startswith('v') and part.lower()[1:].isdigit():
            # This is a version tag (v1, v2, etc.) - treat as invalid tag
            invalid_tags.append(part.lower())
        else:
            base_parts.append(part)
    
    base_name = '_'.join(base_parts)
    return base_name, detected_tags, invalid_tags


def get_tag_notes(version_id: int, tag_id: int, db: Session) -> str:
    """Get notes for a specific version-tag association"""
    association = db.query(VersionEnhancementTag).filter(
        VersionEnhancementTag.version_id == version_id,
        VersionEnhancementTag.enhancement_tag_id == tag_id
    ).first()
    return association.notes if association else None


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
    
    # Parse filename to extract base name and detected enhancement tags
    if file.filename:
        base_filename, detected_tags, invalid_tags = parse_filename_tags(file.filename)
    else:
        base_filename = "unnamed"
        detected_tags = []
        invalid_tags = []
    
    # Generate storage filename using base filename (without tags)
    new_filename = generate_hash_filename(base_filename, processed_content)
    
    # Check if this is a version of an existing media item
    existing_media = db.query(MediaVault).filter(MediaVault.base_filename == base_filename).first()
    
    media_dir = f"media/vault/{datetime.now().strftime('%Y/%m')}"
    os.makedirs(media_dir, exist_ok=True)
    os.makedirs(f"{media_dir}/thumbnails", exist_ok=True)
    
    file_path = f"{media_dir}/{new_filename}"
    with open(file_path, 'wb') as f:
        f.write(processed_content)
    
    thumbnail_path = f"{media_dir}/thumbnails/thumb_{new_filename}"
    create_thumbnail(file_path, thumbnail_path)
    
    file_type = "video" if file.content_type.startswith("video") else "image"
    
    if existing_media:
        # This is a version of existing media
        media_vault = existing_media
    else:
        # This is a new original media item
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
    
    # Add "original" tag to first version of a media item
    if not existing_media:
        original_tag = db.query(EnhancementTag).filter(EnhancementTag.name == 'original').first()
        if original_tag:
            media_version.enhancement_tags.append(original_tag)
    
    # Add manually selected tags
    if enhancement_tags:
        tag_ids = [int(tag_id.strip()) for tag_id in enhancement_tags.split(',') if tag_id.strip()]
        for tag_id in tag_ids:
            tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
            if tag:
                media_version.enhancement_tags.append(tag)
    
    # Add detected tags from filename
    for detected_tag in detected_tags:
        tag = db.query(EnhancementTag).filter(EnhancementTag.name == detected_tag).first()
        if tag:
            media_version.enhancement_tags.append(tag)
    
    db.commit()
    
    # Add invalid tags (version tags) with invalid tag ID and notes
    # This must be done after commit so media_version.id is available
    if invalid_tags:
        invalid_tag = db.query(EnhancementTag).filter(EnhancementTag.name == 'invalid').first()
        if invalid_tag:
            for invalid_tag_name in invalid_tags:
                # Create the association with notes
                association = VersionEnhancementTag(
                    version_id=media_version.id,
                    enhancement_tag_id=invalid_tag.id,
                    notes=invalid_tag_name
                )
                db.add(association)
    
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
    
    result = []
    for media in media_items:
        # Get latest version by upload date for thumbnail and basic info
        latest_version = None
        if media.versions:
            latest_version = sorted(media.versions, key=lambda v: v.upload_date, reverse=True)[0]
        
        # Aggregate ALL tags from ALL versions
        all_tags = []
        seen_tags = set()  # Avoid duplicate normal tags
        
        for version in media.versions:
            for tag in version.enhancement_tags:
                if tag.name == 'invalid':
                    # For invalid tags, get notes and add as separate entries
                    notes = get_tag_notes(version.id, tag.id, db)
                    if notes:
                        all_tags.append({
                            "id": tag.id,
                            "name": tag.name,
                            "color": tag.color,
                            "notes": notes
                        })
                elif tag.id not in seen_tags:
                    # For normal tags, only add once
                    all_tags.append({
                        "id": tag.id,
                        "name": tag.name,
                        "color": tag.color,
                        "notes": None
                    })
                    seen_tags.add(tag.id)
        
        result.append({
            "id": media.id,
            "base_filename": media.base_filename,
            "file_type": media.file_type,
            "is_usable": media.is_usable,
            "created_at": media.created_at.isoformat(),
            "latest_version": {
                "id": latest_version.id if latest_version else None,
                "filename": latest_version.filename if latest_version else None,
                "thumbnail_path": latest_version.thumbnail_path if latest_version else None,
                "enhancement_tags": all_tags
            } if latest_version else None,
            "version_count": len(media.versions)
        })
    
    return {
        "media": result,
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
                        "color": tag.color,
                        "notes": get_tag_notes(version.id, tag.id, db) if tag.name == 'invalid' else None
                    }
                    for tag in version.enhancement_tags
                ]
            }
            for version in sorted(media.versions, key=lambda v: v.upload_date)
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
