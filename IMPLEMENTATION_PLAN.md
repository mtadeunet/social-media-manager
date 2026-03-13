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

## 🏗️ Milestone 1: Core Media Management (Complete)

### System Architecture

**Technology Stack:**
- **Backend**: Python 3.13, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React 18, TypeScript, Tailwind CSS, Axios
- **Media Processing**: FFmpeg, PIL (Pillow)
- **Development**: Vite, uvicorn, hot reload

**Architecture Overview:**
```
┌─────────────────┐    HTTP/REST API    ┌─────────────────┐
│   React SPA     │ ◄─────────────────► │   FastAPI       │
│                 │                     │   Backend       │
│ - Components    │                     │                 │
│ - State Mgmt    │                     │ - Routes        │
│ - UI/UX         │                     │ - Services      │
└─────────────────┘                     │ - Database      │
        │                               └─────────────────┘
        │                                        │
        │                                   File System
        │                               ┌─────────────────┐
        └──────────────────────────────► │   Media Files   │
                                        │                 │
                                        │ - Uploads       │
                                        │ - Thumbnails    │
                                        │ - Processing    │
                                        └─────────────────┘
```

**Data Flow:**
1. **Frontend** → HTTP Request → **FastAPI Router**
2. **Router** → Service Layer → **Database/File System**
3. **Service** → Process Data → **Response**
4. **Response** → JSON → **Frontend State Update**

### Backend Implementation Details

#### FastAPI Application Structure (`app/main.py`)
```python
# Core Configuration
app = FastAPI(title="Social Media Manager API", debug=True)

# Middleware Stack
- CORSMiddleware: Allow localhost:3000
- StaticFiles: Serve /media directory
- Database: Auto-create tables on startup

# Route Structure
/api/posts          → Post CRUD operations
/api/media          → Media upload/management
/api/file-detection → File scanning/classification
/media              → Static file serving
```

#### Database Layer (`app/models/`)

**Post Model:**
```python
class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True)
    caption = Column(Text, nullable=True)
    stage = Column(String, default="draft")  # draft|framed|detailed|done
    is_posted = Column(Boolean, default=False)
    first_posted_at = Column(DateTime, nullable=True)
    first_platform_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    media_files = relationship("MediaFile", back_populates="post", cascade="all, delete-orphan")
```

**MediaFile Model:**
```python
class MediaFile(Base):
    __tablename__ = "media_files"
    
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    base_filename = Column(String, nullable=False)
    file_extension = Column(String, nullable=False)
    
    # Stage-specific paths
    original_path = Column(String, nullable=False)
    framed_path = Column(String, nullable=True)
    detailed_path = Column(String, nullable=True)
    
    # Thumbnail paths
    original_thumbnail_path = Column(String, nullable=True)
    framed_thumbnail_path = Column(String, nullable=True)
    detailed_thumbnail_path = Column(String, nullable=True)
    
    file_type = Column(String, nullable=False)  # image|video
    order_index = Column(Integer, default=0)
    
    # Relationships
    post = relationship("Post", back_populates="media_files")
```

#### API Endpoints

**Posts API (`app/api/posts.py`):**
```python
GET    /api/posts              # List posts (optional stage filter)
POST   /api/posts              # Create new post
GET    /api/posts/{id}         # Get post details
PUT    /api/posts/{id}         # Update post
DELETE /api/posts/{id}         # Delete post
```

**Media API (`app/api/media.py`):**
```python
POST   /api/media/upload       # Upload file to post
POST   /api/media/{id}/promote # Promote media to next stage
DELETE /api/media/{id}         # Delete media file
```

**File Detection API (`app/api/file_detection.py`):**
```python
GET    /api/file-detection/posts/{id}/scan     # Scan and classify files
POST   /api/file-detection/posts/{id}/process  # Process scanned files
GET    /api/file-detection/posts/{id}/conflicts # Get conflicts only
```

#### Services Layer

**File Detection Service (`app/services/file_detection.py`):**
```python
# Core Functions
parse_filename(filename) → (base_name, stage, extension)
detect_new_files(directory) → List[Path]
classify_file(file_path, existing_media) → Classification
detect_and_classify_files(db, post_id) → List[Classification]
process_detected_files(db, post_id, classifications) → Summary

# Classification Types
- new_original: New file without stage suffix
- new_stage: Valid stage suffix for existing media
- duplicate_stage: Stage already exists for media
- invalid_suffix: Unrecognized stage name
- orphan_stage: Stage file without matching original
```

**Media Processing (`app/core/media_utils.py`):**
```python
# Thumbnail Generation
create_thumbnail(input_path, output_path, size=(256, 256))
create_video_thumbnail(input_path, output_path, size=(256, 256))

# File Type Detection
detect_file_type(extension) → "image" | "video" | "unknown"
get_media_type(file_path) → MIME type

# Validation
validate_file_upload(file) → ValidationResponse
generate_safe_filename(filename) → safe_filename
```

### Frontend Implementation Details

#### Component Architecture

**Component Hierarchy:**
```
App
├── PostsList
│   ├── PostCard
│   └── PostDetailModal
│       ├── MediaGallery
│       │   ├── MediaCard (Image/Video)
│       │   └── StageFilter
│       ├── FileDetection
│       ├── MediaUpload
│       └── PostControls
└── Layout
    ├── Header
    └── Navigation
```

#### State Management

**Custom Hooks (`src/hooks/useApi.ts`):**
```typescript
// Posts Management
usePosts(stage?: string) → { posts, loading, error, createPost, updatePost, deletePost, refetch }
usePost(postId) → { post, loading, error, refetch }

// Media Management
useMedia(postId) → { media, loading, error, uploadMedia, deleteMedia, promoteMedia }
```

**Local State Patterns:**
```typescript
// Modal Management
const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

// Stage Selection
const [selectedMediaStage, setSelectedMediaStage] = useState<'original' | 'framed' | 'detailed'>('original');

// Form State
const [caption, setCaption] = useState('');
const [postStage, setPostStage] = useState('draft');
```

#### Service Layer (`src/services/`)

**API Service (`src/services/api.ts`):**
```typescript
// Axios Configuration
- Base URL: http://localhost:8000
- Timeout: 10s (35s for file operations)
- Interceptors: Error handling, loading states

// Endpoints
postService: CRUD operations for posts
mediaService: Upload, delete, promote media
fileDetectionService: Scan, process, conflict detection
```

**Type System (`src/types/post.ts`):**
```typescript
interface Post {
  id: number;
  caption?: string;
  stage: 'draft' | 'framed' | 'detailed' | 'done';
  is_posted: boolean;
  first_posted_at?: string;
  first_platform_id?: number;
  created_at: string;
  updated_at: string;
  media_files?: MediaFile[];
}

interface MediaFile {
  id: number;
  post_id: number;
  base_filename: string;
  file_extension: string;
  original_path: string;
  framed_path?: string;
  detailed_path?: string;
  original_thumbnail_path?: string;
  framed_thumbnail_path?: string;
  detailed_thumbnail_path?: string;
  file_type: 'image' | 'video';
  order_index: number;
}
```

#### UI Components

**MediaGallery (`src/components/MediaGallery.tsx`):**
```typescript
// Features
- Horizontal carousel layout
- 6x speed mouse wheel scrolling
- Stage-aware filtering
- Count badges per stage
- Responsive card design (300px width)

// Props
interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onPromote: (mediaId: number, stage: string) => void;
  onDelete: (mediaId: number) => void;
  selectedMediaStage?: 'original' | 'framed' | 'detailed';
}
```

**FileDetection (`src/components/FileDetection.tsx`):**
```typescript
// Features
- File scanning with progress
- Classification display with icons
- Conflict detection and warnings
- Batch processing capabilities
- Timeout handling (35s)

// Classification Display
- 🆕 New Original
- ➕ New Stage
- 🔄 Duplicates
- ⚠️ Invalid Suffix
- 🔗 Orphan Stage
```

#### Performance Optimizations

**React Optimizations:**
- `useMemo` for expensive calculations
- `useCallback` for event handlers
- `React.memo` for component memoization
- Virtual scrolling for large media lists (future)

**API Optimizations:**
- Request deduplication
- Response caching for static data
- Lazy loading for media thumbnails
- Progressive image loading

**File Processing:**
- Async file operations
- Progress tracking for uploads
- Thumbnail generation on upload
- File size limits and validation

### File System Structure

**Media Organization:**
```
media/
├── drafts/
│   ├── post_1/
│   │   ├── image1.jpg
│   │   ├── image1_framed.jpg
│   │   ├── image1_detailed.jpg
│   │   ├── video1.mov
│   │   ├── video1_framed.mp4
│   │   └── thumbnails/
│   │       ├── image1_thumb.jpg
│   │       └── video1_thumb.jpg
│   └── post_2/
└── uploads/ (temporary)
```

**File Naming Convention:**
- **Original**: `{filename}.{ext}`
- **Framed**: `{filename}_framed.{ext}`
- **Detailed**: `{filename}_detailed.{ext}`
- **Thumbnails**: `{filename}_thumb.jpg`

### Error Handling & Security

**Backend Error Handling:**
```python
# Custom Exceptions
class ValidationError(Exception): pass
class FileNotFoundError(Exception): pass
class InvalidFileTypeError(Exception): pass

# Error Responses
400: Bad Request (validation errors)
404: Not Found (post/media not found)
422: Unprocessable Entity (file validation)
500: Internal Server Error
```

**Security Measures:**
- File type validation (whitelist approach)
- Path traversal prevention
- File size limits
- Sanitized filenames
- SQL injection prevention (SQLAlchemy ORM)

---

## 📋 Future Milestones

### �️ Milestone 2: Post Collection Types & Phases
- [ ] Collection type system (e.g., fetishes → collections)
- [ ] 5-phase progression system per collection
- [ ] Collection management interface
- [ ] Phase-based post organization
- [ ] Time-based phase advancement
- [ ] Collection analytics and progress tracking
- [ ] Phase transition rules and automation

### �🗓️ Milestone 3: Scheduling
- [ ] Post scheduling system
- [ ] Calendar interface
- [ ] Time zone support
- [ ] Automated publishing
- [ ] Queue management
- [ ] Collection-aware scheduling
- [ ] Phase-based content planning

### 🌐 Milestone 4: Multi-platform Integration
- [ ] Social media platform APIs
- [ ] Platform-specific formatting
- [ ] OAuth authentication
- [ ] Cross-platform posting
- [ ] Platform analytics
- [ ] Collection-specific platform strategies
- [ ] Phase-based content adaptation

### 📊 Milestone 5: Analytics & Performance Tracking
- [ ] Engagement metrics
- [ ] Performance dashboard
- [ ] A/B testing
- [ ] Optimal posting times
- [ ] Growth analytics
- [ ] Collection performance analysis
- [ ] Phase progression analytics

### 🚀 Milestone 6: Advanced Features & Production Deployment
- [ ] User authentication
- [ ] Team collaboration
- [ ] Advanced workflows
- [ ] Production deployment
- [ ] Monitoring & logging
- [ ] Collection management tools
- [ ] Advanced phase automation

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
│   └── file_detection.py     # File scanning endpoints
├── models/
│   ├── post.py               # Post model
│   └── media.py              # MediaFile model
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
│   └── MediaUpload.tsx       # File upload
├── services/
│   ├── api.ts                # Axios setup
│   └── fileDetectionService.ts
├── hooks/
│   └── useApi.ts             # API hooks
└── types/
    └── post.ts               # TypeScript types
```

---

## 🚀 Current Workflow

### User Flow:
1. **Create Post** → New post in draft stage
2. **Upload Media** → Files uploaded to `media/drafts/post_{id}/`
3. **Scan Files** → Click "Scan Files" to detect and classify
4. **Review Results** → See classification (new, duplicates, invalid)
5. **Process Files** → Click "Process Files" to update database
6. **Filter by Stage** → Use Original/Framed/Detailed buttons
7. **View Media** → Horizontal carousel with fast scrolling
8. **Update Post Stage** → Use dropdown to change post workflow stage

### Alternative Flow (External Processing):
1. User drops files directly into post directory
2. Files named with stage suffixes (`image_framed.jpg`)
3. Click "Scan Files" in modal
4. System auto-detects stages from filenames
5. Click "Process Files" to sync with database

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

### Current:
- ⚠️ File detection needs refinement (per user feedback)

---

## 📝 Notes

- Media stages are independent of post stages
- File naming convention eliminates need for manual promotion
- System supports both upload and external file workflows
- Timeout protection prevents hanging on large directories
- All changes are atomic - either all succeed or none applied

---

**Last Updated**: March 13, 2026
**Status**: Active Development
**Milestone 1**: Complete ✅
