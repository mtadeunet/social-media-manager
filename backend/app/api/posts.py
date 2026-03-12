from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Post, MediaFile
from ..schemas import PostCreate, PostUpdate, PostResponse, PostList

router = APIRouter(prefix="/api/posts", tags=["posts"])

@router.get("/", response_model=List[PostList])
def get_posts(
    stage: Optional[str] = Query(None, description="Filter by stage"),
    db: Session = Depends(get_db)
):
    """Get all posts with optional stage filtering"""
    query = db.query(Post)
    
    if stage:
        query = query.filter(Post.stage == stage)
    
    posts = query.order_by(Post.created_at.desc()).all()
    
    # Add media count
    post_lists = []
    for post in posts:
        media_count = db.query(MediaFile).filter(MediaFile.post_id == post.id).count()
        post_list = PostList(
            id=post.id,
            caption=post.caption,
            stage=post.stage,
            is_posted=post.is_posted,
            created_at=post.created_at,
            media_count=media_count
        )
        post_lists.append(post_list)
    
    return post_lists

@router.post("/", response_model=PostResponse)
def create_post(post: PostCreate, db: Session = Depends(get_db)):
    """Create a new post"""
    db_post = Post(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    return db_post

@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """Get post by ID"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return post

@router.put("/{post_id}", response_model=PostResponse)
def update_post(post_id: int, post_update: PostUpdate, db: Session = Depends(get_db)):
    """Update post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = post_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)
    
    db.commit()
    db.refresh(post)
    
    return post

@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    """Delete post and associated media"""
    import os
    import shutil
    from pathlib import Path
    
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Delete entire post directory
    try:
        # Determine post directory path
        if post.is_posted:
            # Posted posts are in dated directories
            if post.first_posted_at:
                date_str = post.first_posted_at.strftime("%Y-%m-%d")
                post_dir = Path("media") / "posted" / date_str / f"post_{post_id}"
            else:
                post_dir = Path("media") / "drafts" / f"post_{post_id}"
        else:
            post_dir = Path("media") / "drafts" / f"post_{post_id}"
        
        # Remove entire directory if it exists
        if post_dir.exists():
            shutil.rmtree(post_dir)
    except Exception as e:
        print(f"Error deleting post directory: {e}")
        # Continue anyway to delete from database
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}
