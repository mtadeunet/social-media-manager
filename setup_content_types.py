#!/usr/bin/env python3
"""
Setup script for Content Types system
Runs migration and initializes default content types
"""

import os
import sys
import subprocess

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(f"Output: {result.stdout[:200]}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🚀 Setting up Content Types System")
    print("=" * 50)
    
    # Get the project directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Step 1: Run migration
    if not run_command("python migrate_content_types.py", "Database Migration"):
        print("\n❌ Migration failed. Please check the error above.")
        sys.exit(1)
    
    # Step 2: Start backend in background and initialize defaults
    print("\n🔄 Starting backend to initialize defaults...")
    try:
        # Import and run the initialization directly
        sys.path.insert(0, os.path.join(script_dir, 'backend'))
        
        from app.database import get_db
        from app.services.content_type_service import ContentTypeService
        
        # Get database session
        db = next(get_db())
        service = ContentTypeService(db)
        
        # Check if content types already exist
        existing = service.get_all_content_types(include_phases=False)
        if existing:
            print(f"✅ Found {len(existing)} existing content types")
        else:
            # Create defaults
            print("🔄 Creating default content types...")
            
            default_types = [
                {
                    "name": "Travel",
                    "description": "Travel and adventure content",
                    "color": "#22c55e",
                    "icon": "✈️",
                    "has_phases": True,
                    "phases": [
                        {"name": "Local", "color": "#86efac"},
                        {"name": "National", "color": "#22c55e"},
                        {"name": "International", "color": "#16a34a"}
                    ]
                },
                {
                    "name": "Fashion",
                    "description": "Fashion and style content",
                    "color": "#ec4899",
                    "icon": "👗",
                    "has_phases": True,
                    "phases": [
                        {"name": "Casual", "color": "#f9a8d4"},
                        {"name": "Business", "color": "#ec4899"},
                        {"name": "High Fashion", "color": "#db2777"}
                    ]
                },
                {
                    "name": "Food",
                    "description": "Food and culinary content",
                    "color": "#f59e0b",
                    "icon": "🍽️",
                    "has_phases": False
                },
                {
                    "name": "Fitness",
                    "description": "Fitness and workout content",
                    "color": "#ef4444",
                    "icon": "💪",
                    "has_phases": True,
                    "phases": [
                        {"name": "Beginner", "color": "#fca5a5"},
                        {"name": "Intermediate", "color": "#ef4444"},
                        {"name": "Advanced", "color": "#dc2626"}
                    ]
                }
            ]
            
            created = []
            for ct_data in default_types:
                ct = service.create_content_type(**ct_data)
                created.append(ct.name)
            
            print(f"✅ Created {len(created)} default content types: {', '.join(created)}")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Failed to initialize defaults: {e}")
        sys.exit(1)
    
    print("\n✅ Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Start the backend: cd backend && uvicorn app.main:app --reload")
    print("2. Start the frontend: cd frontend && npm start")
    print("3. Visit http://localhost:3000 to use the application")

if __name__ == "__main__":
    main()
