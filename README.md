# Social Media Manager

A comprehensive media management system for organizing and posting content to multiple social media platforms.

## Features

- **Content Management**: Create and manage posts with multiple media files
- **Stage Management**: Independent media promotion through draft → framed → detailed stages
- **File Validation**: Visual filename matching with thumbnail selection
- **Multi-Platform Support**: Integration with n8n for platform posting
- **Analytics**: Track engagement and optimize posting times

## Technology Stack

- **Backend**: Python FastAPI + SQLite
- **Frontend**: React + TypeScript + Tailwind CSS
- **Integration**: n8n for social media platform APIs
- **Deployment**: Docker containers

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up
```

## Project Structure

```
social-media-manager/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration and utilities
│   │   ├── models/       # Database models
│   │   └── schemas/      # Pydantic schemas
│   ├── media/            # File storage
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## Development

### Adding New Features

1. **Backend**: Add models, schemas, and API endpoints
2. **Frontend**: Create components and update types
3. **Database**: Models are automatically created on startup

### File Organization

- **Draft Posts**: `media/drafts/post_{id}/`
- **Posted Posts**: `media/posts/YYYY/YYYY-MM/YYYY-MM-DD/post_{id}/`
- **Thumbnails**: `thumbnails/` subdirectory in each post folder

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
