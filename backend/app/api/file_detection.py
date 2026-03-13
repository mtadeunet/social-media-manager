from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict
from ..database import get_db
from ..services.file_detection import (
    detect_and_classify_files,
    process_detected_files,
    VALID_STAGES
)
import asyncio
from concurrent.futures import TimeoutError
import time

router = APIRouter(prefix="/api/file-detection", tags=["file-detection"])

# Global dictionary to store last scan times for each post
last_scan_times = {}

@router.post("/posts/{post_id}/auto-detect")
async def auto_detect_files(post_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Automatically detect and process files for a post.
    Runs in background and only processes if new files are found.
    """
    try:
        # Check if we've scanned this post recently (within last 5 seconds)
        current_time = time.time()
        if post_id in last_scan_times and (current_time - last_scan_times[post_id]) < 5:
            return {
                'post_id': post_id,
                'message': 'Scan skipped - scanned recently',
                'skipped': True
            }
        
        # Update last scan time
        last_scan_times[post_id] = current_time
        
        # Add background task to scan and process files
        background_tasks.add_task(background_scan_and_process, post_id, db)
        
        return {
            'post_id': post_id,
            'message': 'Auto-detection started',
            'skipped': False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting auto-detection: {str(e)}")

async def background_scan_and_process(post_id: int, db: Session):
    """
    Background task to scan and process files.
    """
    try:
        # Get current classifications
        detection_result = detect_and_classify_files(db, post_id)
        classifications = detection_result['classifications']
        deleted_media = detection_result['deleted_media']
        updated_files = detection_result['updated_files']
        
        # Check if there are any files that need processing
        processable_files = [
            c for c in classifications 
            if c['action'] in ['create_new', 'update_existing', 'create_new_with_stage']
        ]
        
        # Also check for duplicate image files that need thumbnails
        thumbnail_needed_files = [
            c for c in classifications 
            if (c['action'] in ['review', 'mark_invalid'] and 
                c['extension'].lower() in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
        ]
        
        if processable_files or thumbnail_needed_files or deleted_media or updated_files:
            # Process the files
            summary = process_detected_files(db, post_id, detection_result)
            print(f"Auto-processed {len(processable_files)} files for post {post_id}: {summary}")
        else:
            print(f"No new files to process for post {post_id}")
            
    except Exception as e:
        print(f"Error in background scan for post {post_id}: {str(e)}")

@router.get("/posts/{post_id}/scan")
async def scan_post_files(post_id: int, db: Session = Depends(get_db)):
    """
    Scan and classify all files in a post directory.
    Returns classification without modifying the database.
    """
    try:
        # Run the synchronous function in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        detection_result = await asyncio.wait_for(
            loop.run_in_executor(None, detect_and_classify_files, db, post_id),
            timeout=30.0  # 30 second timeout
        )
        
        classifications = detection_result['classifications']
        deleted_media = detection_result['deleted_media']
        updated_files = detection_result['updated_files']
        
        # Group classifications by type for easier frontend consumption
        grouped = {
            'new_original': [],
            'new_stage': [],
            'duplicates': [],
            'invalid': [],
            'orphan_stage': [],
            'updated': []
        }
        
        for classification in classifications:
            classification_type = classification['classification']
            # Map classification types to grouped categories
            if classification_type == 'new_original':
                grouped['new_original'].append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'classification': classification['classification'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path']),
                    'updated': classification.get('updated', False)
                })
            elif classification_type == 'new_stage':
                grouped['new_stage'].append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'classification': classification['classification'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path']),
                    'updated': classification.get('updated', False)
                })
            elif classification_type in ['duplicate_original', 'duplicate_stage']:
                grouped['duplicates'].append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'classification': classification['classification'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path']),
                    'updated': classification.get('updated', False)
                })
            elif classification_type == 'invalid_suffix':
                grouped['invalid'].append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'classification': classification['classification'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path']),
                    'updated': classification.get('updated', False)
                })
            elif classification_type == 'orphan_stage':
                grouped['orphan_stage'].append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'classification': classification['classification'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path']),
                    'updated': classification.get('updated', False)
                })
        
        # Add deleted and updated files info
        return {
            'post_id': post_id,
            'total_files': len(classifications),
            'grouped_classifications': grouped,
            'deleted_files': [
                {
                    'base_filename': media.base_filename,
                    'id': media.id
                } for media in deleted_media
            ],
            'updated_files': [
                {
                    'filename': file_path.name,
                    'file_path': str(file_path)
                } for file_path in updated_files
            ],
            'valid_stages': VALID_STAGES
        }
        
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="File scan timed out")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning files: {str(e)}")

@router.post("/posts/{post_id}/process")
async def process_post_files(post_id: int, db: Session = Depends(get_db)):
    """
    Scan and process all files in a post directory.
    Modifies the database based on file classifications.
    """
    try:
        # Run the synchronous function in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        detection_result = await asyncio.wait_for(
            loop.run_in_executor(None, detect_and_classify_files, db, post_id),
            timeout=30.0  # 30 second timeout
        )
        
        # Process the files
        summary = process_detected_files(db, post_id, detection_result)
        
        return {
            'post_id': post_id,
            'summary': summary,
            'valid_stages': VALID_STAGES
        }
        
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="File processing timed out")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")

@router.get("/posts/{post_id}/conflicts")
async def get_file_conflicts(post_id: int, db: Session = Depends(get_db)):
    """
    Get only files that need attention (duplicates, invalid suffixes, etc.).
    """
    try:
        classifications = detect_and_classify_files(db, post_id)
        
        conflicts = []
        for classification in classifications:
            if classification['action'] in ['review', 'mark_invalid']:
                conflicts.append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'classification': classification['classification'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path']),
                    'existing_media': {
                        'id': classification['existing_media'].id,
                        'base_filename': classification['existing_media'].base_filename
                    } if classification.get('existing_media') else None
                })
        
        return {
            'post_id': post_id,
            'conflicts': conflicts,
            'conflict_count': len(conflicts)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting conflicts: {str(e)}")
