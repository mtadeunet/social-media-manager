"""
Fix for circular imports - ensure all models are properly imported
"""

# Fix the associations import issue
from sqlalchemy import Table

# Make sure this is defined after all models are loaded
def create_association_tables(Base):
    """Create association tables to avoid circular imports"""
    
    media_content_type_tags = Table(
        'media_content_type_tags',
        Base.metadata,
        Column('media_vault_id', Integer, ForeignKey('media_vault.id'), primary_key=True),
        Column('content_type_id', Integer, ForeignKey('content_type.id'), primary_key=True)
    )
    
    return media_content_type_tags
