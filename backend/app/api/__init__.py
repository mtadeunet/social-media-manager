from fastapi import APIRouter
from .posts import router as posts_router
from .media import router as media_router
from .file_detection import router as file_detection_router

api_router = APIRouter()
api_router.include_router(posts_router)
api_router.include_router(media_router)
api_router.include_router(file_detection_router)

__all__ = ["api_router"]
