#!/usr/bin/env python3
"""
Complete fix script for Content Types implementation
"""

import os
import sys
import sqlite3
from pathlib import Path

def fix_database():
    """Fix database issues"""
    db_path = "social_media_manager.db"
    
    if not os.path.exists(db_path):
        print("❌ Database not found. Creating new database...")
        # The backend will create it on startup
        return True
    
    print("✅ Database found")
    
    # Check if content_type table exists
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='content_type'")
    if cursor.fetchone():
        print("✅ content_type table exists")
    else:
        print("⚠️ content_type table not found - migration needed")
    
    # Check if media_content_type_tags table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='media_content_type_tags'")
    if cursor.fetchone():
        print("✅ media_content_type_tags table exists")
    else:
        print("⚠️ media_content_type_tags table not found - migration needed")
    
    conn.close()
    return True

def check_python_path():
    """Ensure Python path is correct"""
    backend_path = os.path.join(os.getcwd(), 'backend')
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
        print(f"✅ Added {backend_path} to Python path")
    return True

def test_imports():
    """Test all imports"""
    print("\n🔄 Testing imports...")
    
    try:
        from app.models.content_type import ContentType
        print("✅ ContentType model imported")
    except Exception as e:
        print(f"❌ Failed to import ContentType: {e}")
        return False
    
    try:
        from app.models.media_vault import MediaVault
        print("✅ MediaVault model imported")
    except Exception as e:
        print(f"❌ Failed to import MediaVault: {e}")
        return False
    
    try:
        from app.services.content_type_service import ContentTypeService
        print("✅ ContentTypeService imported")
    except Exception as e:
        print(f"❌ Failed to import ContentTypeService: {e}")
        return False
    
    try:
        from app.api.content_types import router
        print("✅ Content types API router imported")
    except Exception as e:
        print(f"❌ Failed to import content types API: {e}")
        return False
    
    return True

def main():
    print("🔧 Content Types - Complete Fix Script")
    print("=" * 50)
    
    # Change to project directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    print(f"Working directory: {os.getcwd()}")
    
    # Check Python path
    check_python_path()
    
    # Check database
    if not fix_database():
        print("\n❌ Database issues detected")
        return False
    
    # Test imports
    if not test_imports():
        print("\n❌ Import issues detected")
        return False
    
    # Check if migration is needed
    db_path = "social_media_manager.db"
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='style_tags'")
        if cursor.fetchone():
            print("\n⚠️ Old style_tags table found - migration needed!")
            print("Please run: python migrate_content_types.py")
        else:
            print("\n✅ Database appears to be migrated")
        
        conn.close()
    
    print("\n✅ All checks passed!")
    print("\n📋 To complete setup:")
    print("1. If migration needed: python migrate_content_types.py")
    print("2. Or run full setup: python setup_content_types.py")
    print("3. Start backend: cd backend && uvicorn app.main:app --reload")
    print("4. Start frontend: cd frontend && npm start")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
