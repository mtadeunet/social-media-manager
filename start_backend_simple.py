#!/usr/bin/env python3
"""
Start the backend server
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = '/home/miguel/Development/Miguel/social-media-manager/backend'
sys.path.insert(0, backend_dir)

print(f"Starting backend from: {backend_dir}")

try:
    from app.main import app
    print("✅ Backend imported successfully")
    
    try:
        import uvicorn
        print("✅ Starting server on http://localhost:8000")
        print("✅ API docs available at http://localhost:8000/docs")
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    except ImportError:
        print("❌ Uvicorn not installed. Installing...")
        os.system(f"cd {backend_dir} && pip3 install uvicorn fastapi sqlalchemy")
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
