# Milestone 2: Collection Types & Phases - Implementation Plan

## 🎯 Overview
Transform the Style Tag system into a comprehensive Content Type tagging system with optional progression phases, enabling users to categorize media by content type (e.g., Travel, Fashion, Food) with configurable phase-based progression.

## 📋 Phase 1: Database Schema Migration

### 1.1 Database Changes
```sql
-- Rename style_tags to content_type_tags
ALTER TABLE style_tags RENAME TO content_type_tags;

-- Add progression support
ALTER TABLE content_type_tags ADD COLUMN has_progression BOOLEAN DEFAULT FALSE;
ALTER TABLE content_type_tags ADD COLUMN default_phase_count INTEGER DEFAULT 3;
ALTER TABLE content_type_tags ADD COLUMN phase_config JSON; -- Store phase details

-- Create phases table
CREATE TABLE content_type_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type_id INTEGER NOT NULL,
    phase_number INTEGER NOT NULL,
    phase_name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_type_id) REFERENCES content_type_tags(id),
    UNIQUE(content_type_id, phase_number)
);

-- Update association table
ALTER TABLE media_style_tags RENAME TO media_content_type_tags;
```

### 1.2 Migration Script
```python
# migrate_content_types.py
def migrate_style_to_content_types():
    """Migrate existing style tags to content type tags"""
    
    # 1. Rename table
    # 2. Add new columns
    # 3. Create default phases for existing tags
    # 4. Update foreign key references
```

## 📋 Phase 2: Backend Implementation

### 2.1 Models (`backend/app/models/content_types.py`)
```python
class ContentTypeTag(Base):
    __tablename__ = "content_type_tags"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#3b82f6")
    icon = Column(String(50))
    has_progression = Column(Boolean, default=False)
    default_phase_count = Column(Integer, default=3)
    phase_config = Column(JSON)  # {"phases": [{"name": "Beginner", "color": "#22c55e"}, ...]}
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    phases = relationship("ContentTypePhase", back_populates="content_type", cascade="all, delete-orphan")
    media_vaults = relationship("MediaVault", secondary="media_content_type_tags", back_populates="content_type_tags")

class ContentTypePhase(Base):
    __tablename__ = "content_type_phases"
    
    id = Column(Integer, primary_key=True)
    content_type_id = Column(Integer, ForeignKey("content_type_tags.id"), nullable=False)
    phase_number = Column(Integer, nullable=False)
    phase_name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#3b82f6")
    icon = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    content_type = relationship("ContentTypeTag", back_populates="phases")
```

### 2.2 Service Layer (`backend/app/services/content_type_service.py`)
```python
class ContentTypeService:
    def create_content_type(self, name: str, has_progression: bool = False, phase_count: int = 3):
        """Create new content type with optional phases"""
        
    def add_phase(self, content_type_id: int, phase_name: str, phase_number: int):
        """Add phase to content type"""
        
    def get_content_type_with_phases(self, content_type_id: int):
        """Get content type with all phases"""
        
    def update_media_phase(self, media_id: int, content_type_id: int, phase_id: int):
        """Update media's phase within content type"""
```

### 2.3 API Endpoints (`backend/app/api/content_types.py`)
```python
@router.post("/content-types")
async def create_content_type(content_type: ContentTypeCreate):
    """Create new content type"""

@router.get("/content-types")
async def list_content_types():
    """List all content types with phases"""

@router.post("/content-types/{id}/phases")
async def add_phase(content_type_id: int, phase: PhaseCreate):
    """Add phase to content type"""

@router.put("/media/{media_id}/content-type-phase")
async def update_media_phase(media_id: int, phase_update: PhaseUpdate):
    """Update media's content type and phase"""
```

## 📋 Phase 3: Frontend Implementation

### 3.1 TypeScript Types (`frontend/src/types/contentTypes.ts`)
```typescript
interface ContentTypeTag {
    id: number;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    hasProgression: boolean;
    defaultPhaseCount: number;
    phaseConfig?: PhaseConfig;
    phases?: ContentTypePhase[];
}

interface ContentTypePhase {
    id: number;
    contentTypeId: number;
    phaseNumber: number;
    phaseName: string;
    description?: string;
    color: string;
    icon?: string;
}

interface MediaContentType {
    contentTypeId: number;
    phaseId?: number;
}
```

### 3.2 ContentTypeModal Component
```typescript
// ContentTypeModal.tsx
interface ContentTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentType?: ContentTypeTag;
    onSave: (contentType: ContentTypeTag) => void;
}

const ContentTypeModal: React.FC<ContentTypeModalProps> = ({
    isOpen,
    onClose,
    contentType,
    onSave
}) => {
    const [name, setName] = useState('');
    const [hasProgression, setHasProgression] = useState(false);
    const [phaseCount, setPhaseCount] = useState(3);
    const [phases, setPhases] = useState<PhaseConfig[]>([]);
    
    // Handle phase creation
    const addPhase = () => {
        setPhases([...phases, {
            name: `Phase ${phases.length + 1}`,
            color: '#3b82f6',
            description: ''
        }]);
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                    {contentType ? 'Edit' : 'Create'} Content Type
                </h2>
                
                {/* Basic Fields */}
                <Input
                    label="Name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g., Travel, Fashion, Food"
                />
                
                <Checkbox
                    label="Enable Progression Phases"
                    checked={hasProgression}
                    onChange={setHasProgression}
                />
                
                {hasProgression && (
                    <div>
                        <NumberInput
                            label="Number of Phases"
                            value={phaseCount}
                            onChange={setPhaseCount}
                            min={2}
                            max={10}
                        />
                        
                        {/* Phase Configuration */}
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Phases</h3>
                            {phases.map((phase, index) => (
                                <PhaseEditor
                                    key={index}
                                    phase={phase}
                                    onChange={(updated) => {
                                        const newPhases = [...phases];
                                        newPhases[index] = updated;
                                        setPhases(newPhases);
                                    }}
                                />
                            ))}
                            <Button onClick={addPhase} variant="outline">
                                Add Phase
                            </Button>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button onClick={() => onSave({...})}>
                        Save
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
```

### 3.3 MediaGallery with Content Types
```typescript
// Enhanced MediaCard component
interface MediaCardProps {
    media: MediaVault;
    contentType?: ContentTypeTag;
    phase?: ContentTypePhase;
    onContentTypeChange: (contentTypeId: number) => void;
    onPhaseChange: (phaseId: number) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({
    media,
    contentType,
    phase,
    onContentTypeChange,
    onPhaseChange
}) => {
    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Media Thumbnail */}
            <img src={media.thumbnailPath} alt={media.baseFilename} />
            
            {/* Stacked Tag Layout */}
            <div className="p-3">
                {/* Enhancement Tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {media.aggregatedTags.enhancement.map(tag => (
                        <span
                            key={tag.id}
                            className="px-2 py-1 text-xs rounded-full border"
                            style={{
                                backgroundColor: 'transparent',
                                borderColor: tag.color,
                                color: tag.color
                            }}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
                
                {/* Content Type Tags - Filled Style */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {media.aggregatedTags.contentType.map(tag => (
                        <span
                            key={tag.id}
                            className="px-2 py-1 text-xs rounded-full text-white"
                            style={{ backgroundColor: tag.color }}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
                
                {/* Phase Display */}
                {phase && (
                    <div className="flex items-center gap-1">
                        <span
                            className="px-2 py-1 text-xs rounded"
                            style={{
                                backgroundColor: `${phase.color}20`,
                                color: phase.color,
                                border: `1px solid ${phase.color}`
                            }}
                        >
                            {phase.phaseName}
                        </span>
                    </div>
                )}
                
                {/* Platform Tags */}
                <div className="flex flex-wrap gap-1">
                    {media.aggregatedTags.platform.map(tag => (
                        <span
                            key={tag.id}
                            className="px-2 py-1 text-xs rounded-full"
                            style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color
                            }}
                        >
                            {tag.icon} {tag.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
```

## 📋 Phase 4: Global Settings

### 4.1 Settings Model
```python
class GlobalSettings(Base):
    __tablename__ = "global_settings"
    
    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow)
```

### 4.2 Default Phase Configuration
```python
# Default settings
DEFAULT_SETTINGS = {
    "content_type_defaults": {
        "default_phase_count": 3,
        "default_colors": ["#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"],
        "auto_create_phases": True
    }
}
```

## 📋 Phase 5: Testing & Deployment

### 5.1 Unit Tests
```python
# test_content_type_service.py
def test_create_content_type_with_phases():
    """Test creating content type with progression phases"""

def test_add_phase_to_content_type():
    """Test adding phases to existing content type"""

def test_media_phase_assignment():
    """Test assigning media to specific phase"""
```

### 5.2 Integration Tests
```python
# test_content_type_api.py
def test_content_type_crud():
    """Test full CRUD operations for content types"""

def test_phase_management():
    """Test phase creation and management"""
```

## 🎯 Implementation Timeline

### Week 1: Database & Backend
- Day 1-2: Database migration and models
- Day 3-4: Service layer implementation
- Day 5: API endpoints

### Week 2: Frontend & UI
- Day 1-2: TypeScript types and services
- Day 3-4: ContentTypeModal component
- Day 5: MediaGallery integration

### Week 3: Polish & Testing
- Day 1-2: Global settings implementation
- Day 3: Testing and bug fixes
- Day 4-5: Documentation and deployment

## 📊 Success Metrics

- All existing style tags migrated to content types
- New content types can be created with optional phases
- Media can be assigned to content types and phases
- UI clearly distinguishes content types from other tags
- Phase progression is visual and intuitive

## 🔄 Migration Strategy

1. **Backward Compatibility**: Old style tags continue to work
2. **Gradual Migration**: Users can opt-in to phases per content type
3. **Data Integrity**: All existing associations preserved
4. **Rollback Plan**: Migration script includes rollback capability
