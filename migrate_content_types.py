"""
Migration script: Convert style_tags to content_type with integrated phases
"""

import sqlite3
import os
from datetime import datetime
from typing import Dict, List, Tuple

def backup_database(db_path: str):
    """Create backup of existing database"""
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if os.path.exists(db_path):
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return backup_path
    return None

def migrate_style_to_content_type(db_path: str):
    """Migrate from style_tags to simplified content_type table"""
    
    if not os.path.exists(db_path):
        print("❌ Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔄 Starting migration...")
        
        # 1. Check if style_tags table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='style_tags'")
        if not cursor.fetchone():
            print("⚠️ style_tags table not found, skipping migration")
            return
        
        # 2. Rename style_tags to content_type
        print("📝 Renaming style_tags to content_type...")
        cursor.execute("ALTER TABLE style_tags RENAME TO content_type")
        
        # 3. Add new columns for phase support
        print("📝 Adding phase columns...")
        cursor.execute("ALTER TABLE content_type ADD COLUMN phase_number INTEGER NULL")
        cursor.execute("ALTER TABLE content_type ADD COLUMN phase_name VARCHAR(100) NULL")
        cursor.execute("ALTER TABLE content_type ADD COLUMN phase_color VARCHAR(7) NULL")
        cursor.execute("ALTER TABLE content_type ADD COLUMN has_phases BOOLEAN DEFAULT FALSE")
        cursor.execute("ALTER TABLE content_type ADD COLUMN parent_content_type_id INTEGER NULL")
        
        # 4. Rename media_style_tags to media_content_type
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='media_style_tags'")
        if cursor.fetchone():
            print("📝 Renaming media_style_tags to media_content_type...")
            cursor.execute("ALTER TABLE media_style_tags RENAME TO media_content_type")
        
        # 5. Create foreign key constraint for parent-child relationship
        print("📝 Adding parent-child relationship constraint...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_type_new (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                color VARCHAR(7) DEFAULT '#3b82f6',
                icon VARCHAR(50),
                progression_stage INTEGER DEFAULT 1,
                phase_number INTEGER NULL,
                phase_name VARCHAR(100) NULL,
                phase_color VARCHAR(7) NULL,
                has_phases BOOLEAN DEFAULT FALSE,
                parent_content_type_id INTEGER NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_content_type_id) REFERENCES content_type_new(id)
            )
        """)
        
        # 6. Migrate existing data
        print("📝 Migrating existing content types...")
        
        # Get all existing style tags
        cursor.execute("SELECT * FROM content_type")
        existing_tags = cursor.fetchall()
        
        # Get column names
        cursor.execute("PRAGMA table_info(content_type)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Create mapping of column names to indices
        col_map = {col: idx for idx, col in enumerate(columns)}
        
        # Track which content types need phases
        content_types_with_phases = []
        
        for tag in existing_tags:
            tag_id = tag[col_map['id']]
            name = tag[col_map['name']] if 'name' in col_map else f"Type_{tag_id}"
            description = tag[col_map['description']] if 'description' in col_map else None
            color = tag[col_map['color']] if 'color' in col_map else '#3b82f6'
            progression_stage = tag[col_map['progression_stage']] if 'progression_stage' in col_map else 1
            
            # Insert as parent content type
            cursor.execute("""
                INSERT INTO content_type_new (
                    id, name, description, color, progression_stage, has_phases
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (tag_id, name, description, color, progression_stage, progression_stage > 1))
            
            if progression_stage > 1:
                content_types_with_phases.append((tag_id, name, color, progression_stage))
        
        # 7. Create phases for content types with progression
        print("📝 Creating phases for content types with progression...")
        for tag_id, name, color, stage_count in content_types_with_phases:
            for i in range(1, stage_count + 1):
                phase_name = f"Stage {i}"
                
                # Generate phase colors (gradient from parent color)
                phase_color = generate_phase_color(color, i, stage_count)
                
                cursor.execute("""
                    INSERT INTO content_type_new (
                        name, phase_number, phase_name, phase_color, 
                        parent_content_type_id, has_phases
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (name, i, phase_name, phase_color, tag_id, False))
        
        # 8. Drop old table and rename new one
        print("📝 Finalizing table structure...")
        cursor.execute("DROP TABLE content_type")
        cursor.execute("ALTER TABLE content_type_new RENAME TO content_type")
        
        # 9. Update media_content_type foreign key if needed
        cursor.execute("PRAGMA foreign_key_list(media_content_type)")
        fks = cursor.fetchall()
        
        # 10. Create indexes
        print("📝 Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_type_parent ON content_type(parent_content_type_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_type_phase ON content_type(phase_number)")
        
        # 11. Update existing media associations to point to parent content types
        print("📝 Updating media associations...")
        cursor.execute("""
            UPDATE media_content_type 
            SET content_type_id = (
                SELECT parent_content_type_id 
                FROM content_type ct 
                WHERE ct.id = media_content_type.content_type_id 
                AND ct.parent_content_type_id IS NOT NULL
            )
            WHERE EXISTS (
                SELECT 1 FROM content_type ct 
                WHERE ct.id = media_content_type.content_type_id 
                AND ct.parent_content_type_id IS NOT NULL
            )
        """)
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Show statistics
        cursor.execute("SELECT COUNT(*) FROM content_type WHERE parent_content_type_id IS NULL")
        parent_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM content_type WHERE parent_content_type_id IS NOT NULL")
        phase_count = cursor.fetchone()[0]
        
        print(f"\n📊 Migration Statistics:")
        print(f"  Parent content types: {parent_count}")
        print(f"  Phase content types: {phase_count}")
        print(f"  Total content types: {parent_count + phase_count}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def generate_phase_color(base_color: str, phase_number: int, total_phases: int) -> str:
    """Generate phase colors as a gradient from the base color"""
    # Remove # if present
    base_color = base_color.lstrip('#')
    
    # Convert hex to RGB
    r = int(base_color[0:2], 16)
    g = int(base_color[2:4], 16)
    b = int(base_color[4:6], 16)
    
    # Create lighter variants for phases
    factor = 0.3 + (0.7 * phase_number / total_phases)
    
    # Blend with white
    r = int(r + (255 - r) * (1 - factor))
    g = int(g + (255 - g) * (1 - factor))
    b = int(b + (255 - b) * (1 - factor))
    
    # Convert back to hex
    return f"#{r:02x}{g:02x}{b:02x}"

def main():
    """Run the migration"""
    print("🚀 Content Type Migration")
    print("=" * 50)
    
    db_path = "backend/app.db"
    
    # Create backup
    backup_path = backup_database(db_path)
    
    # Run migration
    migrate_style_to_content_type(db_path)
    
    if backup_path:
        print(f"\n💾 Backup saved at: {backup_path}")
    
    print("\n📋 Next steps:")
    print("1. Update backend models to use new ContentType structure")
    print("2. Update frontend components for zshell-prompt display")
    print("3. Test the migration results")

if __name__ == "__main__":
    main()
