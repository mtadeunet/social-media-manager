from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from typing import List, Optional
import os
import hashlib
from datetime import datetime
from PIL import Image
import io

from ..models import MediaVault, MediaVersion, EnhancementTag, ContentType
from ..models.associations import VersionEnhancementTag, MediaContentTypeTag
from ..models.base import get_db
from ..schemas.media_vault import (
    MediaVaultResponse, MediaVaultListResponse, MediaVersionResponse,
    EnhancementTagResponse, MediaUploadResponse, ContentTypesUpdateRequest,
    BatchContentTypesUpdateRequest
)

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
    
    return MediaUploadResponse(
        id=media_vault.id,
        base_filename=media_vault.base_filename,
        file_type=media_vault.file_type,
        latest_version={
            "id": media_version.id,
            "filename": media_version.filename,
            "file_size": media_version.file_size
        },
        message="Media uploaded successfully"
    )


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
                if tag.id not in seen_tags:
                    all_tags.append(EnhancementTagResponse(
                        id=tag.id,
                        name=tag.name,
                        description=tag.description,
                        color=tag.color,
                        created_at=tag.created_at.isoformat(),
                        notes=get_tag_notes(version.id, tag.id, db)
                    ))
                    seen_tags.add(tag.id)
        
        # Get content types using ContentTypeTag model
        content_types = []
        ct_ids = db.query(MediaContentTypeTag.content_type_id).filter(
            MediaContentTypeTag.media_vault_id == media.id
        ).all()
        ct_ids_list = [ct_id[0] for ct_id in ct_ids]
        
        if ct_ids_list:
            cts = db.query(ContentType).filter(ContentType.id.in_(ct_ids_list)).all()
            for ct in cts:
                content_types.append({
                    "id": ct.id,
                    "name": ct.name,
                    "description": ct.description,
                    "color": ct.color,
                    "icon": ct.icon,
                    "hasPhases": ct.has_phases,
                    "phaseNumber": ct.phase_number,
                    "phaseName": ct.phase_name,
                    "phaseColor": ct.phase_color,
                    "isPhase": ct.parent_content_type_id is not None,
                    "isParent": ct.has_phases and ct.parent_content_type_id is None,
                    "displayName": ct.name,
                    "effectiveColor": ct.color,
                    "parentContentTypeId": ct.parent_content_type_id,
                    "createdAt": ct.created_at.isoformat()
                })
        
        # Create latest version response
        latest_version_response = None
        if latest_version:
            latest_version_response = MediaVersionResponse(
                id=latest_version.id,
                media_vault_id=latest_version.media_vault_id,
                parent_version_id=latest_version.parent_version_id,
                sequence_order=latest_version.sequence_order,
                filename=latest_version.filename,
                file_path=latest_version.file_path,
                thumbnail_path=latest_version.thumbnail_path,
                file_size=latest_version.file_size,
                upload_date=latest_version.upload_date.isoformat(),
                is_active=latest_version.is_active,
                enhancement_tags=all_tags
            )
        
        result.append(MediaVaultResponse(
            id=media.id,
            base_filename=media.base_filename,
            file_type=media.file_type,
            is_usable=media.is_usable,
            created_at=media.created_at.isoformat(),
            updated_at=media.updated_at.isoformat(),
            latest_version=latest_version_response,
            version_count=len(media.versions),
            enhancement_tags=all_tags,
            content_types=content_types
        ))
    
    return MediaVaultListResponse(
        media=result,
        total=len(media_items),
        skip=skip,
        limit=limit
    )


@router.get("/{media_id}")
async def get_media(media_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific media item"""
    
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Build versions with proper schema
    versions = []
    # Order by sequence_order first, then upload_date as fallback
    ordered_versions = sorted(media.versions, key=lambda v: (v.sequence_order or 999, v.upload_date))
    for version in ordered_versions:
        tags = []
        for tag in version.enhancement_tags:
            notes = get_tag_notes(version.id, tag.id, db) if tag.name == 'invalid' else None
            tags.append(EnhancementTagResponse(
                id=tag.id,
                name=tag.name,
                color=tag.color,
                created_at=tag.created_at.isoformat(),
                notes=notes
            ))
        
        versions.append(MediaVersionResponse(
            id=version.id,
            media_vault_id=version.media_vault_id,
            parent_version_id=version.parent_version_id,
            sequence_order=version.sequence_order,
            filename=version.filename,
            file_path=version.file_path,
            thumbnail_path=version.thumbnail_path,
            file_size=version.file_size,
            upload_date=version.upload_date.isoformat(),
            is_active=version.is_active,
            enhancement_tags=tags
        ))
    
    return MediaVaultResponse(
        id=media.id,
        base_filename=media.base_filename,
        file_type=media.file_type,
        is_usable=media.is_usable,
        created_at=media.created_at.isoformat(),
        updated_at=media.updated_at.isoformat(),
        versions=versions
    )


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
        "isUsable": media.is_usable,
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


@router.put("/{version_id}/tags")
async def update_version_tags(version_id: int, tag_data: dict, db: Session = Depends(get_db)):
    """Update tags for a specific version - replace/remove old tags and add new ones"""
    
    version = db.query(MediaVersion).filter(MediaVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    tags_to_add = tag_data.get("tags_to_add", [])
    tags_to_remove = tag_data.get("tags_to_remove", [])
    invalid_tags_to_remove = tag_data.get("invalid_tags_to_remove", [])
    
    # Remove specified invalid tags (with protection)
    for invalid_tag_name in invalid_tags_to_remove:
        # Allow removal of invalid tags - these are meant to be fixed/replaced
        # Invalid tags (ID 1) are different from original tag protection
        invalid_tag = db.query(EnhancementTag).filter(EnhancementTag.id == 1).first()
        if invalid_tag:
            invalid_association = db.query(VersionEnhancementTag).filter(
                VersionEnhancementTag.version_id == version_id,
                VersionEnhancementTag.enhancement_tag_id == invalid_tag.id,
                VersionEnhancementTag.notes == invalid_tag_name
            ).first()
            if invalid_association:
                db.delete(invalid_association)
    
    # Remove specified valid tags (with protection)
    for tag_id in tags_to_remove:
        # Protect original tag (ID 2) from being removed
        if tag_id == 2:
            continue  # Skip removing original tag
        
        association = db.query(VersionEnhancementTag).filter(
            VersionEnhancementTag.version_id == version_id,
            VersionEnhancementTag.enhancement_tag_id == tag_id
        ).first()
        if association:
            db.delete(association)
    
    # Add new tags (check for duplicates and restrictions)
    for tag_id in tags_to_add:
        new_tag = db.query(EnhancementTag).filter(EnhancementTag.id == tag_id).first()
        if new_tag:
            # Prevent adding "original" tag (ID 2) to versions that don't already have it
            if new_tag.id == 2:
                # Only allow if this version already has the original tag
                has_original = db.query(VersionEnhancementTag).filter(
                    VersionEnhancementTag.version_id == version_id,
                    VersionEnhancementTag.enhancement_tag_id == 2
                ).first()
                if not has_original:
                    continue  # Skip adding original tag
            
            existing_association = db.query(VersionEnhancementTag).filter(
                VersionEnhancementTag.version_id == version_id,
                VersionEnhancementTag.enhancement_tag_id == tag_id
            ).first()
            if not existing_association:
                version.enhancement_tags.append(new_tag)
    
    db.commit()
    
    return {"message": "Tags updated successfully"}


@router.put("/{media_id}/content-types")
def update_media_content_types(
    media_id: int,
    content_types: ContentTypesUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update content types for a media item"""
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Clear existing content types
    db.query(MediaContentTypeTag).filter(
        MediaContentTypeTag.media_vault_id == media_id
    ).delete()
    
    # Add new content types
    for ct_id in content_types.contentTypes:
        content_type = db.query(ContentType).filter(ContentType.id == ct_id).first()
        if content_type:
            media.content_types.append(content_type)
    
    db.commit()
    return {"message": "Content types updated successfully"}


@router.post("/batch-update-content-types")
def batch_update_content_types(
    data: BatchContentTypesUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update content types for multiple media items"""
    if not data.mediaIds:
        raise HTTPException(status_code=400, detail="No media IDs provided")
    
    # Get content types
    content_types = db.query(ContentType).filter(
        ContentType.id.in_(data.contentTypes)
    ).all()
    
    # Update each media item
    for media_id in data.mediaIds:
        media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
        if media:
            # Clear existing content types
            db.query(MediaContentTypeTag).filter(
                MediaContentTypeTag.media_vault_id == media_id
            ).delete()
            
            # Add new content types
            for content_type in content_types:
                media.content_types.append(content_type)
    
    db.commit()
    return {"message": f"Content types updated for {len(data.mediaIds)} media items"}


@router.put("/{media_id}/versions/{version_id}/move")
async def move_version(
    media_id: int,
    version_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Move a version to a new parent (for drag'n'drop reordering)"""
    
    # Parse JSON body manually
    try:
        body = await request.json()
        new_parent_id = body.get("new_parent_id")
    except:
        new_parent_id = None
    
    print(f"Move version: media_id={media_id}, version_id={version_id}, new_parent_id={new_parent_id}")
    
    # Verify media exists
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Verify version exists and belongs to this media
    version = db.query(MediaVersion).filter(
        MediaVersion.id == version_id,
        MediaVersion.media_vault_id == media_id
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Don't allow moving the original version
    if version.enhancement_tags and any(tag.name == 'original' for tag in version.enhancement_tags):
        raise HTTPException(status_code=400, detail="Cannot move the original version")
    
    # If new_parent_id is provided, verify it exists and belongs to the same media
    if new_parent_id:
        new_parent = db.query(MediaVersion).filter(
            MediaVersion.id == new_parent_id,
            MediaVersion.media_vault_id == media_id
        ).first()
        if not new_parent:
            raise HTTPException(status_code=404, detail="Parent version not found")
        
        # Prevent circular references
        current = new_parent
        while current and current.parent_version_id:
            if current.parent_version_id == version_id:
                raise HTTPException(status_code=400, detail="Cannot create circular reference")
            current = current.parent_version
    
    # Update the parent
    print(f"Before update: version.parent_version_id = {version.parent_version_id}")
    version.parent_version_id = new_parent_id
    print(f"After update: version.parent_version_id = {version.parent_version_id}")
    db.commit()
    print(f"After commit: checking from DB...")
    
    # Verify the update
    db.refresh(version)
    print(f"Verified: version.parent_version_id = {version.parent_version_id}")
    
    return {"message": "Version moved successfully"}


@router.put("/{media_id}/versions/reorder")
async def reorder_versions(
    media_id: int,
    version_ids: List[int] = Body(...),
    db: Session = Depends(get_db)
):
    """Reorder versions by updating their sequence_order"""
    
    # Verify all versions belong to this media
    versions = db.query(MediaVersion).filter(
        MediaVersion.media_vault_id == media_id,
        MediaVersion.id.in_(version_ids)
    ).all()
    
    if len(versions) != len(version_ids):
        raise HTTPException(status_code=400, detail="Some versions not found")
    
    # Update sequence_order based on the provided order
    for index, version_id in enumerate(version_ids):
        version = next(v for v in versions if v.id == version_id)
        version.sequence_order = index + 1
    
    db.commit()
    
    return {"message": "Versions reordered successfully"}


@router.put("/{media_id}/filename")
async def update_media_filename(
    media_id: int,
    new_base_filename: str = Body(...),
    db: Session = Depends(get_db)
):
    """Update the base filename for all versions of a media item"""
    
    # Verify media exists
    media = db.query(MediaVault).filter(MediaVault.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Validate new filename
    if not new_base_filename or not new_base_filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty")
    
    # Extract extension from first version
    if not media.versions:
        raise HTTPException(status_code=400, detail="No versions found")
    
    first_version = media.versions[0]
    file_extension = first_version.filename.split('.')[-1] if '.' in first_version.filename else 'jpg'
    
    # Update media base filename
    old_base_filename = media.base_filename
    media.base_filename = new_base_filename.strip()
    
    # Update all version filenames
    for version in media.versions:
        # Extract hash from current filename
        parts = version.filename.split('_')
        if len(parts) >= 2:
            hash_part = parts[-1].split('.')[0]  # Get hash without extension
            version.filename = f"{new_base_filename.strip()}_{hash_part}.{file_extension}"
    
    db.commit()
    
    return {
        "message": "Filename updated successfully",
        "old_filename": old_base_filename,
        "new_filename": new_base_filename.strip()
    }
