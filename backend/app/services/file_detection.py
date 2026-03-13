import os
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.media import MediaFile
from app.models.post import Post

# Valid stage suffixes
VALID_STAGES = ['original', 'framed', 'detailed']

def parse_filename(filename: str) -> Tuple[str, Optional[str], str]:
    """
    Parse a filename to extract base name, stage, and extension.
    
    Examples:
        "image.jpg" -> ("image", None, "jpg")
        "image_framed.jpg" -> ("image", "framed", "jpg")
        "image_detailed.png" -> ("image", "detailed", "png")
        "image_invalid.jpg" -> ("image", "invalid", "jpg")
    """
    name_without_ext = Path(filename).stem
    extension = Path(filename).suffix.lower().lstrip('.')
    
    # Check if filename has stage suffix
    pattern = r'^(.+)_(.+)$'
    match = re.match(pattern, name_without_ext)
    
    if match:
        base_name, suffix = match.groups()
        
        if suffix in VALID_STAGES:
            return base_name, suffix, extension
        else:
            # For complex filenames, check if the suffix looks like a version or variant
            # Common patterns: v1, v2, _1, _2, copy, final, etc.
            version_patterns = ['v\\d+', '\\d+$', 'copy', 'final', 'edit', 'draft']
            for pattern in version_patterns:
                if re.match(pattern, suffix, re.IGNORECASE):
                    # This might be a version/variant, try to find the base without the version
                    base_without_version = re.sub(r'_v\d+$|_\d+$|_copy$|_final$|_edit$|_draft$', '', name_without_ext, flags=re.IGNORECASE)
                    return base_without_version, suffix, extension
            
            # If no pattern matches, treat the entire filename as base name (no stage)
            return name_without_ext, None, extension
    else:
        return name_without_ext, None, extension

def detect_new_files(post_directory: Path) -> List[Path]:
    """Detect all files in the post directory."""
    if not post_directory.exists():
        return []
    
    files = []
    for file_path in post_directory.rglob('*'):
        if file_path.is_file() and not file_path.name.startswith('.') and 'thumbnails' not in str(file_path.parent):
            files.append(file_path)
    
    return files

def get_existing_media_files(db: Session, post_id: int) -> Dict[str, MediaFile]:
    """Get existing media files for a post, indexed by base filename."""
    media_files = db.query(MediaFile).filter(MediaFile.post_id == post_id).all()
    return {media.base_filename: media for media in media_files}

def classify_file(file_path: Path, existing_media: Dict[str, MediaFile]) -> Dict:
    """Classify a file based on its name and existing media."""
    base_name, stage, extension = parse_filename(file_path.name)
    
    classification = {
        'file_path': file_path,
        'base_name': base_name,
        'stage': stage,
        'extension': extension,
        'classification': None,
        'action': None,
        'existing_media': None
    }
    
    # Special handling for version files - check if they match existing media with version pattern
    if stage and re.match(r'v\d+|\d+$', stage, re.IGNORECASE):
        # Try to find existing media that might be the base for this version
        found_related_media = False
        for existing_base, existing_media_file in existing_media.items():
            # Check if this version file is related to an existing base file
            if (file_path.name.startswith(existing_base + '_') or 
                existing_base + '_' + stage + extension == file_path.stem):
                classification['classification'] = 'duplicate_original'
                classification['action'] = 'review'
                classification['existing_media'] = existing_media_file
                found_related_media = True
                break
        
        # If no related media found, treat as new original file
        if not found_related_media:
            classification['classification'] = 'new_original'
            classification['action'] = 'create_new'
            return classification
    
    if stage is None:
        # No stage suffix - this is a new original file
        if base_name in existing_media:
            classification['classification'] = 'duplicate_original'
            classification['action'] = 'review'
            classification['existing_media'] = existing_media[base_name]
        else:
            classification['classification'] = 'new_original'
            classification['action'] = 'create_new'
    elif stage in VALID_STAGES:
        # Valid stage suffix (framed, detailed) - this is a promoted file
        if base_name in existing_media:
            existing = existing_media[base_name]
            classification['existing_media'] = existing
            
            # Check if this stage already exists for this media
            existing_stage_path = getattr(existing, f"{stage}_path")
            if existing_stage_path:
                classification['classification'] = 'duplicate_stage'
                classification['action'] = 'review'
            else:
                classification['classification'] = 'new_stage'
                classification['action'] = 'update_existing'
        else:
            classification['classification'] = 'orphan_stage'
            classification['action'] = 'create_new_with_stage'
    else:
        # Invalid stage suffix (v1, v2, copy, etc.) - this is an invalid stage file
        if base_name in existing_media:
            classification['classification'] = 'invalid_stage'
            classification['action'] = 'mark_invalid'
            classification['existing_media'] = existing_media[base_name]
        else:
            # No base file exists, treat as new original with invalid naming
            classification['classification'] = 'new_original'
            classification['action'] = 'create_new'
    
    return classification

def detect_deleted_files(db: Session, post_id: int, current_files: List[Path]) -> List[MediaFile]:
    """Detect media files that were deleted from the filesystem."""
    existing_media = get_existing_media_files(db, post_id)
    current_file_paths = {str(f) for f in current_files}
    
    deleted_media = []
    for base_filename, media_file in existing_media.items():
        # Check if any of the media file's paths still exist
        file_paths = [
            media_file.original_path,
            media_file.framed_path,
            media_file.detailed_path
        ]
        
        # Filter out None/empty paths
        valid_paths = [path for path in file_paths if path]
        
        # Check if any of the valid file paths exist in current files
        file_exists = any(
            path for path in valid_paths 
            if path in current_file_paths
        )
        
        # If no valid paths exist, this media file is deleted
        if not file_exists and valid_paths:  # Only consider deleted if there were valid paths
            deleted_media.append(media_file)
    
    return deleted_media

def detect_updated_files(current_files: List[Path], existing_thumbnails: Dict[str, str]) -> List[Path]:
    """Detect files that have been updated (newer than existing thumbnails)."""
    updated_files = []
    
    for file_path in current_files:
        if file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
            thumbnail_path = _generate_thumbnail_path(file_path)
            
            # Check if thumbnail exists and if file is newer than thumbnail
            if Path(thumbnail_path).exists():
                try:
                    file_mtime = file_path.stat().st_mtime
                    thumbnail_mtime = Path(thumbnail_path).stat().st_mtime
                    
                    if file_mtime > thumbnail_mtime:
                        updated_files.append(file_path)
                        print(f"Detected updated file: {file_path.name} (file: {file_mtime}, thumb: {thumbnail_mtime})")
                except FileNotFoundError:
                    # Thumbnail doesn't exist, will be treated as new
                    pass
    
    return updated_files

def detect_and_classify_files(db: Session, post_id: int) -> Dict:
    """
    Main function to detect and classify all files for a post.
    Returns classifications for new/updated files and deleted media records.
    """
    import time
    start_time = time.time()
    
    # Get post directory
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError(f"Post {post_id} not found")
    
    # Construct the media directory path based on post ID
    # Assuming the structure is: media/drafts/post_{id}/
    post_directory = Path(f"media/drafts/post_{post_id}")
    
    # Detect all files with timeout protection
    all_files = detect_new_files(post_directory)
    
    # Get existing media and thumbnails
    existing_media = get_existing_media_files(db, post_id)
    
    # Get existing thumbnails for update detection
    existing_thumbnails = {}
    thumbnails_dir = post_directory / "thumbnails"
    if thumbnails_dir.exists():
        for thumb_file in thumbnails_dir.glob("*_thumb.*"):
            # Map thumbnail back to original file
            original_name = thumb_file.stem.replace("_thumb", "")
            original_path = post_directory / f"{original_name}{thumb_file.suffix}"
            existing_thumbnails[str(original_path)] = str(thumb_file)
    
    # Detect deleted files
    deleted_media = detect_deleted_files(db, post_id, all_files)
    
    # Detect updated files
    updated_files = detect_updated_files(all_files, existing_thumbnails)
    
    # Classify each file
    classifications = []
    for file_path in all_files:
        classification = classify_file(file_path, existing_media)
        
        # Mark as updated if file was detected as updated
        if file_path in updated_files:
            classification['updated'] = True
            classification['action'] = 'regenerate_thumbnail'
        else:
            classification['updated'] = False
            
        classifications.append(classification)
    
    total_time = time.time() - start_time
    print(f"Processed {len(all_files)} files for post {post_id} in {total_time:.2f}s")
    
    return {
        'classifications': classifications,
        'deleted_media': deleted_media,
        'updated_files': updated_files
    }

def process_detected_files(db: Session, post_id: int, detection_result: Dict) -> Dict:
    """
    Process detected files and update database accordingly.
    Returns summary of actions taken.
    """
    classifications = detection_result['classifications']
    deleted_media = detection_result['deleted_media']
    updated_files = detection_result['updated_files']
    
    # Get existing media for duplicate checking
    existing_media = get_existing_media_files(db, post_id)
    
    summary = {
        'new_original': 0,
        'new_stage': 0,
        'duplicates': 0,
        'invalid_stage': 0,
        'invalid': 0,
        'deleted': 0,
        'updated': 0,
        'processed_files': []
    }
    
    # Process new/updated files
    for classification in classifications:
        base_name = classification['base_name']
        file_path = classification['file_path']
        stage = classification['stage']
        action = classification['action']
        
        try:
            if action == 'create_new':
                # Create new media file
                media = MediaFile(
                    post_id=post_id,
                    base_filename=base_name,
                    file_extension=classification['extension'],
                    file_type=_detect_file_type(classification['extension'])
                )
                media.original_path = str(file_path)
                media.original_thumbnail_path = _generate_thumbnail(file_path)
                db.add(media)
                summary['new_original'] += 1
                summary['processed_files'].append(f"Created new media: {base_name}")
                
            elif action == 'update_existing':
                # Update existing media file with new stage
                existing_media_record = existing_media.get(base_name)
                if existing_media_record:
                    # Update the appropriate stage path
                    stage = classification['stage']
                    if stage == 'framed':
                        existing_media_record.framed_path = str(file_path)
                        existing_media_record.framed_thumbnail_path = _generate_thumbnail(file_path)
                    elif stage == 'detailed':
                        existing_media_record.detailed_path = str(file_path)
                        existing_media_record.detailed_thumbnail_path = _generate_thumbnail(file_path)
                    
                    summary['new_stage'] += 1
                    summary['processed_files'].append(f"Updated {base_name} with {stage} stage")
                else:
                    summary['processed_files'].append(f"Error: Existing media not found for {base_name}")
                
            elif action == 'regenerate_thumbnail':
                # Regenerate thumbnail for updated file
                thumbnail_path = _generate_thumbnail(file_path)
                summary['updated'] += 1
                summary['processed_files'].append(f"Regenerated thumbnail: {base_name} ({thumbnail_path})")
                
            elif action == 'review':
                # Handle different types of review actions
                classification_type = classification.get('classification', '')
                
                if classification_type == 'duplicate_stage':
                    # For duplicate_stage, this means the stage already exists - do nothing
                    base_name = classification['base_name']
                    stage = classification['stage']
                    summary['processed_files'].append(
                        f"Stage already exists: {base_name}_{stage} (no action needed)"
                    )
                    
                elif classification_type == 'duplicate_original':
                    # For duplicate_original, create media record and generate thumbnail
                    if classification['extension'].lower() in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']:
                        # Use the full filename (without extension) as base name for duplicates
                        duplicate_base_name = file_path.stem
                        
                        # Check if media record already exists for this exact file
                        existing_media_for_file = None
                        for existing_base, existing_media_record in existing_media.items():
                            if (existing_media_record.original_path == str(file_path) or
                                existing_base == duplicate_base_name):
                                existing_media_for_file = existing_media_record
                                break
                        
                        if existing_media_for_file:
                            # Update existing record or generate thumbnail if needed
                            if not existing_media_for_file.original_thumbnail_path or not Path(existing_media_for_file.original_thumbnail_path).exists():
                                existing_media_for_file.original_thumbnail_path = _generate_thumbnail(file_path)
                                summary['processed_files'].append(
                                    f"Updated thumbnail for existing duplicate: {duplicate_base_name}"
                                )
                            else:
                                summary['processed_files'].append(
                                    f"Duplicate already exists: {duplicate_base_name}"
                                )
                        else:
                            # Create new media record for duplicate file
                            media = MediaFile(
                                post_id=post_id,
                                base_filename=duplicate_base_name,
                                file_extension=classification['extension'],
                                file_type=_detect_file_type(classification['extension'])
                            )
                            media.original_path = str(file_path)
                            media.original_thumbnail_path = _generate_thumbnail(file_path)
                            db.add(media)
                            summary['processed_files'].append(
                                f"Created media record for duplicate: {duplicate_base_name} ({str(file_path)})"
                            )
                    
                    summary['duplicates'] += 1
                    
            elif action == 'mark_invalid':
                # For invalid stage files, generate thumbnail but flag for user review
                if classification['extension'].lower() in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']:
                    thumbnail_path = _generate_thumbnail(file_path)
                    summary['processed_files'].append(
                        f"Generated thumbnail for invalid stage: {base_name} ({classification['stage']}) - {thumbnail_path}"
                    )
                else:
                    summary['processed_files'].append(
                        f"Flagged invalid stage file: {base_name} ({classification['stage']})"
                    )
                summary['invalid_stage'] = 1
                
        except Exception as e:
            summary['processed_files'].append(f"Error processing {base_name}: {str(e)}")
    
    # Process deleted files
    for media_file in deleted_media:
        try:
            # Delete associated thumbnails
            thumbnail_paths = [
                media_file.original_thumbnail_path,
                media_file.framed_thumbnail_path,
                media_file.detailed_thumbnail_path
            ]
            
            for thumb_path in thumbnail_paths:
                if thumb_path and Path(thumb_path).exists():
                    Path(thumb_path).unlink()
                    summary['processed_files'].append(f"Deleted thumbnail: {thumb_path}")
            
            # Delete media record
            db.delete(media_file)
            summary['deleted'] += 1
            summary['processed_files'].append(f"Deleted media record: {media_file.base_filename}")
            
        except Exception as e:
            summary['processed_files'].append(f"Error deleting {media_file.base_filename}: {str(e)}")
    
    db.commit()
    return summary

def detect_new_files(post_directory: Path) -> List[Path]:
    """Detect all files in the post directory."""
    if not post_directory.exists():
        return []
    
    files = []
    for file_path in post_directory.rglob('*'):
        if file_path.is_file() and not file_path.name.startswith('.') and 'thumbnails' not in str(file_path.parent):
            files.append(file_path)
    
    return files

def _generate_thumbnail_path(file_path: Path) -> str:
    """Generate the thumbnail path for a given file."""
    parent_dir = file_path.parent
    thumbnail_dir = parent_dir / 'thumbnails'
    thumbnail_name = f"{file_path.stem}_thumb.jpg"
    return str(thumbnail_dir / thumbnail_name)

def _generate_thumbnail(file_path: Path) -> str:
    """Generate actual thumbnail file and return the path."""
    try:
        from PIL import Image
        import os
        
        thumbnail_path = _generate_thumbnail_path(file_path)
        thumbnail_dir = Path(thumbnail_path).parent
        
        # Create thumbnails directory if it doesn't exist
        thumbnail_dir.mkdir(exist_ok=True)
        
        # Generate thumbnail for images
        if file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Resize to thumbnail size
                img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                img.save(thumbnail_path, 'JPEG', quality=85)
                return thumbnail_path
        
        # For videos and other files, create a placeholder or return the path
        # For now, just return the path (the frontend will show a placeholder)
        return thumbnail_path
        
    except Exception as e:
        print(f"Error generating thumbnail for {file_path}: {e}")
        return _generate_thumbnail_path(file_path)

def _detect_file_type(extension: str) -> str:
    """Detect file type from extension."""
    image_extensions = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'}
    video_extensions = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}
    
    if extension.lower() in image_extensions:
        return 'image'
    elif extension.lower() in video_extensions:
        return 'video'
    else:
        return 'unknown'
