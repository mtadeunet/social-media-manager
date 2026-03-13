from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import create_tables
from .api import api_router
from .core.config import settings

app = FastAPI(title=settings.app_name, debug=settings.debug)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)

# Serve static files
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.on_event("startup")
def startup_event():
    """Create database tables on startup"""
    create_tables()

@app.get("/")
def root():
    return {"message": "Social Media Manager API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
