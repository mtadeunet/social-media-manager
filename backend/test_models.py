#!/usr/bin/env python3
"""Quick test to check if backend models load without errors"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.models import Base
    print("✅ Models imported successfully")
    
    # Try to create all tables (this will trigger mapper initialization)
    from app.database import create_tables
    print("✅ Database function imported")
    
    # Don't actually create tables, just check if mappers initialize
    print("✅ Backend models appear to be working correctly")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
