# Social Media Manager - Implementation Plan

## Project Overview
A comprehensive media management system for organizing and posting content to multiple social media platforms with intelligent file detection and stage-based workflow.

---

## ✅ Completed Features

### 1. Core Media Management
- [x] Post creation and management (draft, framed, detailed, done stages)
- [x] Multi-file upload support (images and videos)
- [x] Media file organization by post
- [x] SQLite database with SQLAlchemy ORM
- [x] FastAPI backend with CORS support
- [x] React frontend with TypeScript

### 2. Video Support (MOV Files)
- [x] Accept `video/quicktime` MIME type
- [x] FFmpeg-based thumbnail extraction
- [x] Proper `.jpg` thumbnail storage (not `.mov`)
- [x] Video thumbnail display in frontend
- [x] Cache busting for thumbnail updates

### 3. Horizontal Media Carousel
- [x] Flexbox-based horizontal layout
- [x] Mouse wheel horizontal scrolling (6x speed)
- [x] Non-passive event listeners for scroll control
- [x] Smooth scrolling behavior
- [x] Touch/trackpad support
- [x] Fixed card width (300px) for consistent layout

### 4. Media Stage Filtering System
- [x] Independent media stages (original, framed, detailed)
- [x] Stage selector buttons with visual feedback
- [x] Smart filtering - only show media at selected stage
- [x] Count badges showing media per stage
- [x] Stage-aware thumbnail display
- [x] Empty state messages with guidance
- [x] Separated media stages from post stages

### 5. File Detection & Auto-Classification
- [x] Intelligent filename parsing system
- [x] Automatic stage detection from filenames
- [x] File classification service (`file_detection.py`)
- [x] API endpoints for scanning and processing
- [x] Frontend FileDetection component
- [x] Conflict detection and resolution
- [x] Timeout handling (30s backend, 35s frontend)
- [x] Progress tracking and logging

---

## 🏗️ Milestone 1: Media Vault Foundation (In Progress)

### 🎯 Core System Architecture
The Media Vault system transforms the application from post-centric to media-centric architecture, where media management becomes the core foundation and posts become consumers of media.

### 📊 Database Schema

#### MediaVault Model (Primary Entity)
```python
class MediaVault(Base):
    __tablename__ = "media_vault"
    
    id = Column(Integer, primary_key=True, index=True)
    base_filename = Column(String, nullable=False)  # Original name without hash
    file_type = Column(String, nullable=False)  # image/video
    is_usable = Column(Boolean, default=False)  # Marked for post usage
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    versions = relationship("MediaVersion", back_populates="media_vault", cascade="all, delete-orphan")
    enhancement_tags = relationship("EnhancementTag", secondary="media_enhancement_tags", back_populates="media_vaults")
    style_tags = relationship("StyleTag", secondary="media_style_tags", back_populates="media_vaults")
    platform_tags = relationship("PlatformTag", secondary="media_platform_tags", back_populates="media_vaults")
    posts = relationship("Post", secondary="post_media_references", back_populates="referenced_media")
```

#### MediaVersion Model (Version Tracking)
```python
class MediaVersion(Base):
    __tablename__ = "media_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    media_vault_id = Column(Integer, ForeignKey("media_vault.id"), nullable=False)
    filename = Column(String, nullable=False)  # {original}_{hash4}.jpg
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)  # Soft delete capability
```

#### Tag System Models
```python
class EnhancementTag(Base):
    __tablename__ = "enhancement_tags"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # original, crop, edit, detail
    description = Column(Text, nullable=True)
    color = Column(String, default="#6b7280")

class StyleTag(Base):
    __tablename__ = "style_tags"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # fitting room, stockings, gym, cosplay
    progression_stage = Column(Integer, default=1)  # 1-5 progression
    description = Column(Text, nullable=True)
    color = Column(String, default="#3b82f6")

class PlatformTag(Base):
    __tablename__ = "platform_tags"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # instagram, twitter, tiktok
    icon = Column(String, nullable=True)  # Icon name or emoji
    color = Column(String, default="#10b981")
```

### 🔧 API Endpoints

#### Media Vault Management
```python
GET    /api/media-vault/                    # List with filtering
POST   /api/media-vault/upload              # Upload new media
GET    /api/media-vault/{id}                 # Get media details
PUT    /api/media-vault/{id}/usable          # Toggle usability
DELETE /api/media-vault/{id}                 # Delete media

# Version Management
POST   /api/media-vault/{id}/versions        # Add new version
DELETE /api/media-vault/{id}/versions/{v_id} # Delete specific version
```

#### Tag Management
```python
GET    /api/tags/enhancement                 # List enhancement tags
POST   /api/tags/enhancement                 # Create enhancement tag
PUT    /api/tags/enhancement/{id}            # Update enhancement tag
DELETE /api/tags/enhancement/{id}            # Delete enhancement tag

GET    /api/tags/style                       # List style tags
POST   /api/tags/style                       # Create style tag
PUT    /api/tags/style/{id}                  # Update style tag
DELETE /api/tags/style/{id}                  # Delete style tag

GET    /api/tags/platform                    # List platform tags
POST   /api/tags/platform                    # Create platform tag
PUT    /api/tags/platform/{id}               # Update platform tag
DELETE /api/tags/platform/{id}               # Delete platform tag

POST   /api/tags/initialize-defaults         # Initialize default tags
```

### 🎨 Frontend Components

#### MediaVaultGallery (Main Interface)
```typescript
interface MediaVaultGalleryProps {
  mediaItems: MediaVault[];
  selectedFilters: FilterState;
  onMediaClick: (mediaId: number) => void;
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  searchTerm: string;
  enhancementTags: number[];
  styleTags: number[];
  platformTags: number[];
  dateRange: [Date, Date] | null;
  showUsableOnly: boolean;
}
```

#### MediaManagementModal (Version Control)
```typescript
interface MediaManagementModalProps {
  media: MediaVault;
  isOpen: boolean;
  onClose: () => void;
  onVersionUpload: (file: File, tags: number[]) => void;
  onVersionDelete: (versionId: number) => void;
  onTagUpdate: (versionId: number, tags: TagUpdate[]) => void;
  onUsabilityToggle: (mediaId: number, isUsable: boolean) => void;
}
```

#### MediaComparer (Version Comparison)
```typescript
interface MediaComparerProps {
  media: MediaVault;
  selectedVersions: [number, number];
  onVersionSelect: (position: 'left' | 'right', versionId: number) => void;
}
```

### 🎯 File Processing Pipeline

#### Upload Processing
1. **File Validation**: Check file type and size
2. **Format Conversion**: PNG → JPG for storage optimization
3. **Hash Generation**: SHA-256 hash for unique naming
4. **Filename Creation**: `{original}_{hash4}.jpg`
5. **Thumbnail Generation**: 256x256 thumbnail
6. **Database Storage**: Create MediaVault and MediaVersion records

#### File Structure
```
media/vault/
├── 2026/03/  # Date-based organization
│   ├── {media_id}/
│   │   ├── original_{hash4}.jpg
│   │   ├── crop_detail_{hash4}.jpg
│   │   ├── thumbnail_{hash4}.jpg
│   │   └── metadata.json
```

### 📊 Default Tags Configuration

#### Enhancement Tags
```json
[
  { "name": "original", "color": "#6b7280", "description": "Original uploaded file" },
  { "name": "crop", "color": "#f59e0b", "description": "Cropped version" },
  { "name": "edit", "color": "#3b82f6", "description": "General editing applied" },
  { "name": "detail", "color": "#8b5cf6", "description": "Detailed enhancement" }
]
```

#### Style Tags
```json
[
  { "name": "fitting room", "color": "#ef4444", "progression_stage": 1 },
  { "name": "stockings", "color": "#f97316", "progression_stage": 1 },
  { "name": "gym", "color": "#eab308", "progression_stage": 1 },
  { "name": "cosplay", "color": "#22c55e", "progression_stage": 1 }
]
```

#### Platform Tags
```json
[
  { "name": "instagram", "icon": "📷", "color": "#e1306c" },
  { "name": "twitter", "icon": "🐦", "color": "#1da1f2" },
  { "name": "tiktok", "icon": "🎵", "color": "#000000" }
]
```

## 🏗️ Milestone 2: Post-Centric Workflow (Complete ✅)

### 📋 File Classification Rules

**Core File Classification Logic:**

1. **Original Files** (`new_original`)
   - **Definition**: Filenames that are unrelated to any existing file in the post directory
   - **Pattern**: `{filename}.{ext}` (no stage suffix)
   - **Condition**: Base filename doesn't exist in database
   - **Action**: Create new media record
   - **Example**: `image1.jpg` (if `image1` doesn't exist)

2. **Promoted Files** (`new_stage`)
   - **Definition**: File that relates to an original file but is suffixed with a valid stage name
   - **Pattern**: `{filename}_{stage}.{ext}`
   - **Valid Stages**: `framed`, `detailed`
   - **Condition**: Base filename exists in database + valid stage suffix
   - **Action**: Update existing media record with stage
   - **Example**: `image1_framed.jpg` relates to `image1.jpg` and adds "framed" stage

3. **Invalid Stage Files** (`invalid_stage`)
   - **Definition**: File that relates to an original file but has an invalid/unclear stage suffix
   - **Pattern**: `{filename}_{unknown_suffix}.{ext}`
   - **Invalid Suffixes**: `v1`, `v2`, `copy`, `final`, `edit`, `draft`, numbers, etc.
   - **Condition**: Base filename exists + invalid stage suffix
   - **Action**: Mark as invalid - user needs to determine the correct stage
   - **Example**: `image1_v1.jpg` relates to `image1.jpg` but user must decide the stage

**File Processing Behavior:**
- **Original Files**: Create media record + generate thumbnail
- **Promoted Files**: Update existing record + generate thumbnail for stage
- **Invalid Stage Files**: Generate thumbnail but flag for user review

**Stage Validation:**
```python
VALID_STAGES = ['original', 'framed', 'detailed']  # original is implicit (no suffix)
VERSION_PATTERNS = ['v\\d+', '\\d+$', 'copy', 'final', 'edit', 'draft']  # Invalid stages
```

### System Architecture

**Technology Stack:**
- **Backend**: Python 3.13, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React 18, TypeScript, Tailwind CSS, Axios
- **Media Processing**: FFmpeg, PIL (Pillow)

### 🎯 Invalid File Handling System (Complete)

**Core Functionality:**
- **Invalid File Detection**: Automatically identifies files with invalid stage suffixes
- **Visual Indicators**: Red borders, "INVALID" badges, and hover effects
- **Import Workflow**: One-click import to convert invalid files to valid stages
- **Real-time Sync**: Automatic detection of filesystem changes every 10 seconds

**Frontend Features:**
- **Red Border Display**: Invalid files shown with distinctive red borders
- **Hover Import Button**: Appears when hovering anywhere over the card
- **Smooth Animations**: Card lift effect, button scaling, and transitions
- **Full Filename Tooltips**: Consistent help cursor behavior
- **Stage-specific Import**: Import to current selected stage
- **Real-time Updates**: Auto-refresh when files are added/deleted

**Backend API Endpoints:**
- **`/posts/{id}/scan`**: Detect and classify files including invalid stages
- **`/posts/{id}/process`**: Process files and handle deletions automatically
- **`/posts/{id}/import-invalid`**: Rename invalid files to valid stages
- **`/posts/{id}/clear-stage`**: Remove incorrect stage paths from media records

**User Experience Flow:**
1. **Detection**: Invalid files automatically detected and flagged
2. **Display**: Shown with red borders and "INVALID" badges
3. **Interaction**: Hover reveals import button with smooth animations
4. **Import**: Click to rename file to valid stage (e.g., `file_v1.jpg` → `file_framed.jpg`)
5. **Integration**: File becomes normal media file in selected stage
6. **Cleanup**: Database automatically updated and synced

## 📋 Future Milestones

### 🎯 Milestone 3: Collection Types & Phases
- [ ] Collection type system (e.g., fetishes → collections)
- [ ] 5-phase progression system per collection
- [ ] Collection management interface
- [ ] Phase-based post organization
- [ ] Time-based phase advancement
- [ ] Collection analytics and progress tracking

### 📅 Milestone 4: Scheduling System
- [ ] Post scheduling system
- [ ] Calendar interface
- [ ] Time zone support
- [ ] Automated publishing
- [ ] Queue management
- [ ] Collection-aware scheduling
- [ ] Phase-based content planning

### 🌐 Milestone 5: Multi-Platform Integration
- [ ] Social media platform APIs
- [ ] Platform-specific formatting
- [ ] OAuth authentication
- [ ] Cross-platform posting
- [ ] Platform analytics
- [ ] Collection-specific platform strategies
- [ ] Phase-based content adaptation

### 📊 Milestone 6: Analytics & Performance Tracking
- [ ] Engagement metrics
- [ ] Performance dashboard
- [ ] A/B testing
- [ ] Optimal posting times
- [ ] Growth analytics
- [ ] Collection performance analysis
- [ ] Phase progression analytics

### 🚀 Milestone 7: Advanced Features & Production Deployment
- [ ] User authentication
- [ ] Team collaboration
- [ ] Advanced workflows
- [ ] Production deployment
- [ ] Monitoring & logging
- [ ] Collection management tools
- [ ] Advanced phase automation

---

## 🎉 Recent Achievements & Current Status

### ✅ Completed Features (March 18, 2026)

#### **Milestone 2: Post-Centric Workflow (Complete ✅)**
- **File Classification**: Detects files with invalid stage suffixes (v1, v2, copy, etc.)
- **Visual UI**: Red borders, "INVALID" badges, and hover effects
- **Import Workflow**: One-click import to convert invalid files to valid stages
- **Real-time Sync**: Automatic filesystem monitoring every 10 seconds
- **Enhanced UX**: Full-card hover effects, smooth animations, consistent tooltips

#### **Filesystem Synchronization**
- **Deletion Detection**: Automatically removes database records for deleted files
- **Auto-processing**: Handles filesystem changes without manual intervention
- **Stage Management**: Clear incorrect stage assignments via API
- **Robust Error Handling**: Graceful fallbacks and user feedback

#### **Milestone 1: Media Vault Foundation (Complete ✅)**
- **Complete Database Schema**: MediaVault, MediaVersion, and Tag system fully implemented
- **Version Management**: Multi-version support with hash-based file naming
- **Tag System**: Enhancement, Style, and Platform tags with color coding
- **Invalid Tag System**: Advanced version tag detection and storage with notes
- **Frontend Components**: MediaVaultGallery, MediaVersionModal, and tag management
- **API Endpoints**: Full CRUD operations for media and tags
- **File Processing**: Robust upload pipeline with thumbnail generation

### 🚀 Major Implementation: Invalid Tag System (March 18, 2026)

#### **Database Schema Enhancements**
```sql
-- Added "invalid" tag to enhancement_tags
INSERT INTO enhancement_tags (name, color, description) 
VALUES ('invalid', '#dc2626', 'Invalid version tags (v1, v2, etc.)');

-- Added notes column to version_enhancement_tags
ALTER TABLE version_enhancement_tags 
ADD COLUMN notes VARCHAR(255) NULL;
```

#### **Backend Implementation**
- **Version Tag Detection**: `parse_filename_tags()` function detects v1, v2, etc. in filenames
- **Invalid Tag Storage**: Version tags stored as "invalid" tag with notes containing actual tag name
- **API Response Enhancement**: All endpoints include notes field for invalid tags
- **Tag Aggregation**: Gallery shows ALL tags from ALL versions, not just latest version

#### **Frontend Implementation**
- **Invalid Tag Display**: Shows as "invalid - v1" in red color (#dc2626)
- **Gallery View**: Aggregates tags from all versions with proper deduplication
- **Modal View**: Per-version detailed tag information
- **Overlay Delete Buttons**: Consistent UX with gallery-style delete overlays
- **TypeScript Support**: Updated interfaces with notes property

#### **File Processing Pipeline**
```python
def parse_filename_tags(filename: str) -> tuple[str, list[str], list[str]]:
    """Parse filename to extract base name, valid tags, and invalid version tags"""
    # Returns: (base_name, detected_tags, invalid_tags)
    # Example: "photo_v1_crop.jpg" → ("photo", ["crop"], ["v1"])
```

#### **API Response Structure**
```json
{
  "latest_version": {
    "enhancement_tags": [
      {"id": 1, "name": "original", "color": "#307e88", "notes": null},
      {"id": 2, "name": "crop", "color": "#f59e0b", "notes": null},
      {"id": 5, "name": "invalid", "color": "#dc2626", "notes": "v1"},
      {"id": 5, "name": "invalid", "color": "#dc2626", "notes": "v2"}
    ]
  }
}
```

### 🔄 Current Status: Production Ready

#### **Completed Components:**
- ✅ **MediaVaultGallery**: Full gallery with tag aggregation and delete overlays
- ✅ **MediaVersionModal**: Version management with per-version tag display
- ✅ **EnhancementTagModal**: Tag management interface
- ✅ **TagService**: Frontend service for tag operations
- ✅ **Upload System**: Complete file upload with version tag detection
- ✅ **Delete System**: Overlay-style delete buttons for both gallery and modal

#### **System Capabilities:**
- **Multi-Version Support**: Unlimited versions per media item
- **Smart Tag Detection**: Automatic parsing of enhancement and version tags
- **Invalid Tag Handling**: Version tags (v1, v2, etc.) properly stored and displayed
- **Consistent UI**: Overlay delete buttons and red invalid tag styling
- **Robust API**: Full CRUD with proper error handling and validation

### 📊 System Metrics
- **File Classification**: 3 types (original, promoted, invalid)
- **Valid Stages**: original, framed, detailed
- **Invalid Suffixes**: 10+ patterns detected automatically (v1, v2, v3, etc.)
- **Tag Types**: Enhancement, Style, Platform with color coding
- **Version Support**: Unlimited versions per media item
- **Sync Frequency**: Every 10 seconds (configurable)
- **UI Responsiveness**: <200ms animations and transitions
- **Database Tables**: 8 core tables with proper relationships
- **API Endpoints**: 15+ endpoints for complete media management

---

## 🎯 File Naming Convention

### Implemented Rules:
1. **`filename.ext`** → New original file
2. **`filename_framed.ext`** → Framed stage of "filename"
3. **`filename_detailed.ext`** → Detailed stage of "filename"
4. **`filename_invalid.ext`** → Invalid suffix (flagged for user)

### Valid Stage Suffixes:
- `original` (implicit, no suffix needed)
- `framed`
- `detailed`

### Classification Types:
- **new_original**: Files without stage suffix that don't exist in DB
- **new_stage**: Valid stage suffix for existing media
- **duplicates**: Files that already exist in DB
- **invalid_suffix**: Files with unrecognized stage names
- **orphan_stage**: Stage files without matching original

---

## 📁 Directory Structure

```
media/
└── drafts/
    └── post_{id}/
        ├── image1.jpg                    # Original
        ├── image1_framed.jpg             # Framed stage
        ├── image1_detailed.jpg           # Detailed stage
        ├── video1.mov                    # Original video
        ├── video1_framed.mp4             # Framed video
        └── thumbnails/
            ├── image1_thumb.jpg
            ├── video1_thumb.jpg
            └── ...
```

---

## 🔧 Technical Architecture

### Backend (`/backend`)
```
app/
├── api/
│   ├── posts.py              # Post CRUD endpoints
│   ├── media.py              # Media upload/management
│   ├── file_detection.py     # File scanning endpoints
│   ├── media_vault.py        # ✅ Media Vault endpoints (COMPLETE)
│   └── tags.py               # ✅ Tag management endpoints (COMPLETE)
├── models/
│   ├── post.py               # Post model
│   ├── media.py              # MediaFile model
│   ├── media_vault.py        # ✅ MediaVault model (COMPLETE)
│   ├── media_version.py      # ✅ MediaVersion model (COMPLETE)
│   ├── tags.py               # ✅ Tag models (COMPLETE)
│   └── associations.py       # ✅ Association tables with notes column (COMPLETE)
├── services/
│   └── file_detection.py     # File classification logic
├── core/
│   ├── config.py             # App configuration
│   └── media_utils.py        # Thumbnail generation
├── database.py               # Database setup
└── main.py                   # FastAPI app
```

### Frontend (`/frontend`)
```
src/
├── components/
│   ├── MediaGallery.tsx      # Horizontal carousel
│   ├── PostDetailModal.tsx   # Post editing modal
│   ├── FileDetection.tsx     # File scanning UI
│   ├── MediaUpload.tsx       # File upload
│   ├── MediaVaultGallery.tsx  # ✅ Main media vault interface (COMPLETE)
│   ├── MediaVersionModal.tsx  # ✅ Version management modal (COMPLETE)
│   ├── MediaComparer.tsx      # Version comparison (PLANNED)
│   ├── MediaDropZone.tsx     # ✅ Enhanced drop zone with tag detection (COMPLETE)
│   └── EnhancementTagModal.tsx # ✅ Tag management interface (COMPLETE)
├── services/
│   ├── api.ts                # Axios setup
│   ├── fileDetectionService.ts
│   ├── mediaVaultService.ts  # ✅ Media Vault API (COMPLETE)
│   ├── tagService.ts         # ✅ Tag API (COMPLETE)
│   └── autoDetectionService.ts # ✅ Auto-detection service (COMPLETE)
├── hooks/
│   └── useApi.ts             # API hooks
└── types/
    ├── post.ts               # TypeScript types
    ├── mediaVault.ts         # ✅ Media Vault types with notes property (COMPLETE)
    └── tags.ts               # ✅ Tag types (COMPLETE)
```

---

## 🐛 Known Issues & Fixes

### Fixed:
- ✅ MOV thumbnails stored with wrong extension
- ✅ Video thumbnails not displaying
- ✅ Modal closing on stage change
- ✅ Post list stuck in "Loading..." state
- ✅ Passive event listener preventing scroll
- ✅ Missing `__init__.py` in services directory
- ✅ Import path errors in file_detection.py
- ✅ Post model missing `media_root` attribute
- ✅ Timeout errors on file scanning
- ✅ Invalid files not displaying in frontend (March 2026)
- ✅ Frontend not syncing with filesystem changes (March 2026)
- ✅ Missing tooltips on invalid files (March 2026)
- ✅ Inconsistent cursor behavior on filenames (March 2026)
- ✅ Import button only visible on small hover area (March 2026)
- ✅ Stage display issue caused by database constraints (March 2026)
- ✅ Upload 500 error due to missing VersionEnhancementTag import (March 18, 2026)
- ✅ NOT NULL constraint error in invalid tag creation (March 18, 2026)
- ✅ Gallery only showing latest version tags instead of all versions (March 18, 2026)
- ✅ TypeScript compilation errors for invalid tag system (March 18, 2026)
- ✅ Backend server startup issues with module imports (March 18, 2026)

### Current:
- ✅ Media Vault system implementation COMPLETE (March 18, 2026)
- ✅ Database schema migration from MediaFile to MediaVault COMPLETE
- ✅ Frontend components for Media Vault interface COMPLETE
- ✅ Invalid tag system with notes field COMPLETE
- ✅ Version management with overlay delete buttons COMPLETE

---

## 📝 Notes

- Media stages are independent of post stages
- File naming convention eliminates need for manual promotion
- System supports both upload and external file workflows
- Timeout protection prevents hanging on large directories
- All changes are atomic - either all succeed or none applied
- **NEW**: Media Vault becomes the core system with posts as consumers
- **NEW**: Hash-based file naming prevents conflicts
- **NEW**: Multi-category tagging system for enhanced organization
- **NEW**: Invalid tag system with notes for version tracking
- **NEW**: Complete version management with overlay UI
- **NEW**: Tag aggregation across all versions for gallery view

---

**Last Updated**: March 18, 2026
**Status**: Production Ready 🚀
**Milestone 1**: Media Vault Foundation (Complete ✅)
**Milestone 2**: Post-Centric Workflow (Complete ✅)
**Latest Commit**: `cb2dd21` - Implement complete invalid tag system with notes and UI improvements

## 🎯 Next Steps: Milestone 3 - Collection Types & Phases
Ready to begin implementation of collection-based organization system with 5-phase progression.
