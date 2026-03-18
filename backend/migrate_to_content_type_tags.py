#!/usr/bin/env python3
"""
Migration script to convert StyleTag system to ContentTypeTag system
- Rename style_tags table to content_type_tags
- Add new columns for phase support
- Create system_settings table with default phase count
- Migrate existing style tags to content type tags
- Update association tables
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from datetime import datetime

def migrate_to_content_type_tags():
    """Migrate from StyleTag to ContentTypeTag system"""
    
    # Database connection
    engine = create_engine("sqlite:///./app.db")
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            print("Starting migration from StyleTag to ContentTypeTag...")
            
            # Step 1: Create system_settings table
            print("Creating system_settings table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    description TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Insert default phase count setting
            conn.execute(text("""
                INSERT OR REPLACE INTO system_settings (key, value, description, updated_at)
                VALUES ('default_phase_count', '3', 'Default number of phases for new content types', CURRENT_TIMESTAMP)
            """))
            
            # Step 2: Create new content_type_tags table structure
            print("Creating content_type_tags table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS content_type_tags_new (
                    id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    color TEXT DEFAULT '#3b82f6',
                    has_phases BOOLEAN DEFAULT FALSE,
                    phase_count INTEGER,
                    parent_id INTEGER,
                    phase_number INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES content_type_tags_new(id)
                )
            """))
            
            # Step 3: Migrate existing style tags to content type tags
            print("Migrating existing style tags...")
            result = conn.execute(text("SELECT id, name, progression_stage, description, color, created_at FROM style_tags"))
            
            for row in result:
                old_id, name, progression_stage, description, color, created_at = result.fetchone()
                if old_id is None:
                    break
                    
                print(f"  Migrating: {name} (stage {progression_stage})")
                
                # Insert as base content type tag (no phases for existing tags)
                conn.execute(text("""
                    INSERT INTO content_type_tags_new (id, name, description, color, has_phases, created_at)
                    VALUES (:id, :name, :description, :color, FALSE, :created_at)
                """), {
                    'id': old_id,
                    'name': name,
                    'description': description,
                    'color': color,
                    'created_at': created_at
                })
            
            # Step 4: Create new media_content_type_tags association table
            print("Creating media_content_type_tags association table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS media_content_type_tags (
                    media_vault_id INTEGER NOT NULL,
                    content_type_tag_id INTEGER NOT NULL,
                    applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (media_vault_id, content_type_tag_id),
                    FOREIGN KEY (media_vault_id) REFERENCES media_vault(id),
                    FOREIGN KEY (content_type_tag_id) REFERENCES content_type_tags_new(id)
                )
            """))
            
            # Step 5: Migrate existing media_style_tags associations
            print("Migrating media-style tag associations...")
            result = conn.execute(text("SELECT media_vault_id, style_tag_id, progression_stage FROM media_style_tags"))
            
            for row in result:
                media_vault_id, style_tag_id, progression_stage = row
                print(f"  Migrating association: Media {media_vault_id} -> Tag {style_tag_id}")
                
                conn.execute(text("""
                    INSERT INTO media_content_type_tags (media_vault_id, content_type_tag_id, applied_date)
                    VALUES (:media_vault_id, :content_type_tag_id, CURRENT_TIMESTAMP)
                """), {
                    'media_vault_id': media_vault_id,
                    'content_type_tag_id': style_tag_id
                })
            
            # Step 6: Replace old tables
            print("Replacing old tables...")
            
            # Drop old tables
            conn.execute(text("DROP TABLE IF EXISTS media_style_tags"))
            conn.execute(text("DROP TABLE IF EXISTS style_tags"))
            
            # Rename new tables
            conn.execute(text("ALTER TABLE content_type_tags_new RENAME TO content_type_tags"))
            
            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")
            
            # Verify the result
            print("\nVerifying migration...")
            result = conn.execute(text("SELECT COUNT(*) FROM content_type_tags"))
            count = result.fetchone()[0]
            print(f"Content type tags created: {count}")
            
            result = conn.execute(text("SELECT COUNT(*) FROM media_content_type_tags"))
            count = result.fetchone()[0]
            print(f"Media-content type associations created: {count}")
            
            result = conn.execute(text("SELECT key, value FROM system_settings"))
            for row in result:
                print(f"Setting: {row[0]} = {row[1]}")
                
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error during migration: {e}")
            raise

if __name__ == "__main__":
    migrate_to_content_type_tags()
