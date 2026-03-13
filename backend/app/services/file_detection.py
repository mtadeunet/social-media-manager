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
            return base_name, suffix, extension  # suffix is invalid
    else:
        return name_without_ext, None, extension

def detect_new_files(post_directory: Path) -> List[Path]:
    """Detect all files in the post directory."""
    if not post_directory.exists():
        return []
    
    files = []
    for file_path in post_directory.rglob('*'):
        if file_path.is_file() and not file_path.name.startswith('.'):
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
        # Valid stage suffix
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
        # Invalid stage suffix
        classification['classification'] = 'invalid_suffix'
        classification['action'] = 'mark_invalid'
        classification['invalid_suffix'] = stage
    
    return classification

def detect_and_classify_files(db: Session, post_id: int) -> List[Dict]:
    """
    Main function to detect and classify all files for a post.
    """
    import time
    start_time = time.time()
    
    # Get post directory
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError(f"Post {post_id} not found")
    
    post_directory = Path(post.media_root)
    print(f"Scanning directory: {post_directory}")
    
    # Detect all files with timeout protection
    all_files = detect_new_files(post_directory)
    print(f"Found {len(all_files)} files in {time.time() - start_time:.2f}s")
    
    # Get existing media
    existing_media = get_existing_media_files(db, post_id)
    print(f"Found {len(existing_media)} existing media records")
    
    # Classify each file with progress tracking
    classifications = []
    for i, file_path in enumerate(all_files):
        if i % 10 == 0:  # Log progress every 10 files
            print(f"Processing file {i+1}/{len(all_files)}")
        
        classification = classify_file(file_path, existing_media)
        classifications.append(classification)
    
    total_time = time.time() - start_time
    print(f"Classification completed in {total_time:.2f}s")
    
    return classifications

def process_detected_files(db: Session, post_id: int, classifications: List[Dict]) -> Dict:
    """
    Process detected files and update database accordingly.
    Returns summary of actions taken.
    """
    summary = {
        'new_original': 0,
        'new_stage': 0,
        'duplicates': 0,
        'invalid': 0,
        'processed_files': []
    }
    
    for classification in classifications:
        action = classification['action']
        file_path = classification['file_path']
        base_name = classification['base_name']
        stage = classification['stage']
        
        try:
            if action == 'create_new':
                # Create new media file as original
                media = MediaFile(
                    post_id=post_id,
                    base_filename=base_name,
                    file_extension=classification['extension'],
                    original_path=str(file_path),
                    original_thumbnail_path=_generate_thumbnail_path(file_path),
                    file_type=_detect_file_type(classification['extension'])
                )
                db.add(media)
                summary['new_original'] += 1
                summary['processed_files'].append(f"Created new original: {base_name}")
                
            elif action == 'update_existing':
                # Update existing media with new stage
                existing = classification['existing_media']
                setattr(existing, f"{stage}_path", str(file_path))
                setattr(existing, f"{stage}_thumbnail_path", _generate_thumbnail_path(file_path))
                summary['new_stage'] += 1
                summary['processed_files'].append(f"Added {stage} stage to: {base_name}")
                
            elif action == 'create_new_with_stage':
                # Create new media file with stage
                media = MediaFile(
                    post_id=post_id,
                    base_filename=base_name,
                    file_extension=classification['extension'],
                    file_type=_detect_file_type(classification['extension'])
                )
                setattr(media, f"{stage}_path", str(file_path))
                setattr(media, f"{stage}_thumbnail_path", _generate_thumbnail_path(file_path))
                db.add(media)
                summary['new_stage'] += 1
                summary['processed_files'].append(f"Created new media with {stage} stage: {base_name}")
                
            elif action in ['review', 'mark_invalid']:
                summary['duplicates' if action == 'review' else 'invalid'] += 1
                summary['processed_files'].append(
                    f"Flagged for {action}: {base_name} ({classification['classification']})"
                )
                
        except Exception as e:
            summary['processed_files'].append(f"Error processing {base_name}: {str(e)}")
    
    db.commit()
    return summary

def _generate_thumbnail_path(file_path: Path) -> str:
    """Generate thumbnail path for a given file path."""
    # This is a placeholder - you might want to implement actual thumbnail generation
    parent_dir = file_path.parent
    thumbnail_dir = parent_dir / 'thumbnails'
    thumbnail_name = f"{file_path.stem}_thumb.jpg"
    return str(thumbnail_dir / thumbnail_name)

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
