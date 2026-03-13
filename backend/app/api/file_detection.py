from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(prefix="/api/file-detection", tags=["file-detection"])

@router.get("/posts/{post_id}/scan")
async def scan_post_files(post_id: int, db: Session = Depends(get_db)):
    """
    Scan and classify all files in a post directory.
    Returns classification without modifying the database.
    """
    try:
        # Run the synchronous function in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        classifications = await asyncio.wait_for(
            loop.run_in_executor(None, detect_and_classify_files, db, post_id),
            timeout=30.0  # 30 second timeout
        )
        
        # Group classifications by type for easier frontend consumption
        grouped = {
            'new_original': [],
            'new_stage': [],
            'duplicates': [],
            'invalid': [],
            'orphan_stage': []
        }
        
        for classification in classifications:
            classification_type = classification['classification']
            if classification_type in grouped:
                grouped[classification_type].append({
                    'filename': classification['file_path'].name,
                    'base_name': classification['base_name'],
                    'stage': classification['stage'],
                    'extension': classification['extension'],
                    'action': classification['action'],
                    'file_path': str(classification['file_path'])
                })
        
        return {
            'post_id': post_id,
            'total_files': len(classifications),
            'grouped_classifications': grouped,
            'valid_stages': VALID_STAGES
        }
        
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="File scanning timed out. The directory may be too large or contain too many files.")
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
        # First, classify the files
        classifications = detect_and_classify_files(db, post_id)
        
        # Then process them
        summary = process_detected_files(db, post_id, classifications)
        
        return {
            'post_id': post_id,
            'summary': summary,
            'valid_stages': VALID_STAGES
        }
        
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
