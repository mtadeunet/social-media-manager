# Modified Milestone 2: Content Types & Phases - Implementation Plan

## 🎯 Overview
Simplify the Content Type system by removing the separate phases table and integrating phase information directly into the content_type table. The frontend will display content types with a zshell-prompt-like chain effect for phases.

## 📋 Phase 1: Database Schema Simplification

### 1.1 Database Changes
```sql
-- Rename style_tags to content_type
ALTER TABLE style_tags RENAME TO content_type;

-- Add phase columns directly to content_type table
ALTER TABLE content_type ADD COLUMN phase_number INTEGER NULL;
ALTER TABLE content_type ADD COLUMN phase_name VARCHAR(100) NULL;

-- Update existing columns
ALTER TABLE content_type ADD COLUMN has_phases BOOLEAN DEFAULT FALSE;
ALTER TABLE content_type ADD COLUMN parent_content_type_id INTEGER NULL;

-- Update association table
ALTER TABLE media_style_tags RENAME TO media_content_type;

-- Add foreign key for parent-child relationship
ALTER TABLE content_type ADD CONSTRAINT fk_content_type_parent 
    FOREIGN KEY (parent_content_type_id) REFERENCES content_type(id);

-- Create unique constraint for phases within parent
ALTER TABLE content_type ADD CONSTRAINT uk_content_type_phase 
    UNIQUE (parent_content_type_id, phase_number);
```

### 1.2 Data Structure
- **Content Type without phases**: `phase_number = NULL`, `phase_name = NULL`
- **Content Type with phases**: Parent has `has_phases = TRUE`, children have `phase_number` and `phase_name`
- **Example**:
  - Food (parent, has_phases = TRUE)
    - Food > Stage 1 (child, phase_number = 1, phase_name = "Stage 1")
    - Food > Stage 2 (child, phase_number = 2, phase_name = "Stage 2")

## 📋 Phase 2: Backend Implementation

### 2.1 Updated Models (`backend/app/models/content_types.py`)
```python
class ContentType(Base):
    __tablename__ = "content_type"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#3b82f6")
    icon = Column(String(50))
    
    # Phase properties
    has_phases = Column(Boolean, default=False)
    phase_number = Column(Integer, nullable=True)  # NULL for parent/main content type
    phase_name = Column(String(100), nullable=True)  # NULL for parent/main content type
    phase_color = Column(String(7), nullable=True)  # Individual phase color
    
    # Relationships
    parent_content_type_id = Column(Integer, ForeignKey("content_type.id"), nullable=True)
    parent = relationship("ContentType", remote_side=[id], back_populates="phases")
    phases = relationship("ContentType", back_populates="parent", cascade="all, delete-orphan")
    
    # Media relationship
    media_vaults = relationship("MediaVault", secondary="media_content_type_tags", back_populates="content_types")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    @property
    def is_phase(self):
        """Check if this is a phase (child) content type"""
        return self.parent_content_type_id is not None
    
    @property
    def display_name(self):
        """Get display name with phase prefix if applicable"""
        if self.is_phase and self.parent:
            return f"{self.parent.name} > {self.phase_name}"
        return self.name
```

### 2.2 Service Layer Updates
```python
class ContentTypeService:
    def create_content_type(self, name: str, has_phases: bool = False, phases: List[Dict] = None):
        """Create content type with optional phases"""
        
        # Create parent content type
        content_type = ContentType(
            name=name,
            has_phases=has_phases
        )
        
        self.db.add(content_type)
        self.db.flush()
        
        # Create phases if specified
        if has_phases and phases:
            for i, phase in enumerate(phases, 1):
                phase_content_type = ContentType(
                    name=name,  # Keep same base name
                    phase_number=i,
                    phase_name=phase.get("name", f"Stage {i}"),
                    phase_color=phase.get("color"),
                    parent_content_type_id=content_type.id
                )
                self.db.add(phase_content_type)
        
        self.db.commit()
        return content_type
    
    def get_content_type_tree(self):
        """Get content types with their phases in a tree structure"""
        parent_types = self.db.query(ContentType).filter(
            ContentType.parent_content_type_id.is_(None)
        ).all()
        
        result = []
        for parent in parent_types:
            content_type_dict = {
                "id": parent.id,
                "name": parent.name,
                "color": parent.color,
                "has_phases": parent.has_phases,
                "phases": []
            }
            
            if parent.has_phases:
                phases = self.db.query(ContentType).filter(
                    ContentType.parent_content_type_id == parent.id
                ).order_by(ContentType.phase_number).all()
                
                content_type_dict["phases"] = [
                    {
                        "id": phase.id,
                        "phase_number": phase.phase_number,
                        "phase_name": phase.phase_name,
                        "color": phase.phase_color or parent.color
                    }
                    for phase in phases
                ]
            
            result.append(content_type_dict)
        
        return result
```

## 📋 Phase 3: Frontend Implementation

### 3.1 Updated TypeScript Types
```typescript
export interface ContentType {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  has_phases: boolean;
  phase_number?: number;
  phase_name?: string;
  phase_color?: string;
  parent_content_type_id?: number;
  phases?: ContentType[];
  created_at: string;
}

export interface ContentTypeDisplay {
  id: number;
  name: string;
  fullName: string; // "Food" or "Food > Stage 1"
  color: string;
  phaseColor?: string;
  hasPhase: boolean;
  isPhase: boolean;
}
```

### 3.2 Zshell-Prompt Style Component
```typescript
// ContentTypeTag.tsx
interface ContentTypeTagProps {
  contentType: ContentType;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const ContentTypeTag: React.FC<ContentTypeTagProps> = ({ 
  contentType, 
  size = 'md',
  onClick 
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };
  
  // If it's not a phase, show simple rounded tag
  if (!contentType.phase_number) {
    return (
      <span
        onClick={onClick}
        className={`
          inline-flex items-center rounded-full
          ${sizeClasses[size]}
          font-medium
          cursor-pointer
          transition-colors
        `}
        style={{ 
          backgroundColor: contentType.color,
          color: 'white'
        }}
      >
        {contentType.name}
      </span>
    );
  }
  
  // If it's a phase, show zshell-prompt style
  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        font-medium
        cursor-pointer
        transition-colors
      `}
    >
      {/* Left part - Content type with its color */}
      <span
        className="rounded-l pl-3 pr-1 py-1"
        style={{ 
          backgroundColor: contentType.color,
          color: 'white'
        }}
      >
        {contentType.name} &gt;
      </span>
      
      {/* Right part - Phase with phase color */}
      <span
        className="rounded-r pr-3 py-1"
        style={{ 
          backgroundColor: contentType.phase_color || contentType.color,
          color: 'white'
        }}
      >
        {contentType.phase_name}
      </span>
    </span>
  );
};
```

### 3.3 Media Card Integration
```typescript
// Updated MediaCard component
const MediaCard: React.FC<MediaCardProps> = ({ media }) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Media Thumbnail */}
      <img src={media.thumbnailPath} alt={media.baseFilename} />
      
      {/* Tags Section */}
      <div className="p-3 space-y-2">
        {/* Enhancement Tags - Outlined style */}
        <div className="flex flex-wrap gap-1">
          {media.enhancement_tags?.map(tag => (
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
        
        {/* Content Type Tags - Filled or zshell style */}
        <div className="flex flex-wrap gap-1">
          {media.content_type_tags?.map(ct => (
            <ContentTypeTag
              key={ct.id}
              contentType={ct}
              size="sm"
              onClick={() => handleContentTypeClick(ct)}
            />
          ))}
        </div>
        
        {/* Platform Tags - Semi-transparent */}
        <div className="flex flex-wrap gap-1">
          {media.platform_tags?.map(tag => (
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

### 3.4 Content Type Management Modal
```typescript
// ContentTypeModal.tsx
const ContentTypeModal: React.FC<ContentTypeModalProps> = ({
  isOpen,
  onClose,
  contentType,
  onSave
}) => {
  const [name, setName] = useState('');
  const [hasPhases, setHasPhases] = useState(false);
  const [phases, setPhases] = useState([
    { name: 'Stage 1', color: '#22c55e' },
    { name: 'Stage 2', color: '#3b82f6' },
    { name: 'Stage 3', color: '#8b5cf6' }
  ]);
  
  const handleSave = () => {
    const contentTypeData = {
      name,
      has_phases: hasPhases,
      phases: hasPhases ? phases : null
    };
    
    onSave(contentTypeData);
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">
          {contentType ? 'Edit' : 'Create'} Content Type
        </h2>
        
        <Input
          label="Content Type Name"
          value={name}
          onChange={setName}
          placeholder="e.g., Food, Travel, Fashion"
        />
        
        <Checkbox
          label="Enable Progression Phases"
          checked={hasPhases}
          onChange={setHasPhases}
          className="mt-4"
        />
        
        {hasPhases && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Phases</h3>
            <div className="space-y-2">
              {phases.map((phase, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-20">
                    Stage {index + 1}:
                  </span>
                  <Input
                    value={phase.name}
                    onChange={(value) => {
                      const newPhases = [...phases];
                      newPhases[index].name = value;
                      setPhases(newPhases);
                    }}
                    placeholder="Phase name"
                  />
                  <ColorPicker
                    value={phase.color}
                    onChange={(color) => {
                      const newPhases = [...phases];
                      newPhases[index].color = color;
                      setPhases(newPhases);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

## 📋 Phase 4: Migration Strategy

### 4.1 Migration Script
```python
def migrate_style_to_content_type():
    """Migrate from style_tags to simplified content_type table"""
    
    # 1. Rename table
    # 2. Add new columns
    # 3. Convert existing progression_stage to has_phases
    # 4. Create phase entries for content types with progression
    
    # Example: Convert existing style tags with progression
    # "gym" with progression_stage 3 becomes:
    # - "gym" (parent, has_phases = TRUE)
    # - "gym > Stage 1" (phase_number = 1)
    # - "gym > Stage 2" (phase_number = 2)
    # - "gym > Stage 3" (phase_number = 3)
```

## 🎯 Key Benefits of This Approach

1. **Simpler Database**: No separate phases table
2. **Cleaner Relationships**: Parent-child within same table
3. **Visual Distinction**: Zshell-prompt style makes phases immediately recognizable
4. **Flexible**: Can have content types without phases
5. **Intuitive**: The ">" symbol clearly shows progression

## 📊 Success Metrics

- Content types display correctly with or without phases
- Zshell-prompt visual effect works across different sizes
- Migration preserves all existing data
- Performance remains optimal with simplified schema
