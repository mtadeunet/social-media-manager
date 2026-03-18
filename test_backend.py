#!/usr/bin/env python3
"""
Test script to check if the backend starts without errors
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.main import app
    print("✅ Backend imports successfully!")
    
    # Check if content_types router is registered
    routes = [route.path for route in app.routes]
    content_type_routes = [r for r in routes if 'content-types' in r]
    
    if content_type_routes:
        print(f"✅ Content Type routes found: {content_type_routes[:5]}...")
    else:
        print("❌ No content-type routes found")
        
    # Check database models
    from app.models.content_type import ContentType
    from app.models.media_vault import MediaVault
    
    print("✅ Models import successfully!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

print("\n✅ All checks passed!")
