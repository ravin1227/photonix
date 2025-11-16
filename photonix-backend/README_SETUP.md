# Photonix Backend - Setup Guide

## Overview
Photonix is a self-hosted AI-powered photo gallery application built with Ruby on Rails. This backend provides a complete REST API for photo management, organization, and AI-powered features.

## Architecture

### Technology Stack
- **Backend**: Ruby on Rails 8.1.1 (API mode)
- **Database**: PostgreSQL 16
- **Cache/Jobs**: Redis 7
- **Background Jobs**: Sidekiq
- **Image Processing**: MiniMagick + ImageMagick
- **Deployment**: Docker + Docker Compose

### Core Features
- ✅ User authentication (JWT-based)
- ✅ Photo upload with EXIF extraction
- ✅ Automatic thumbnail generation (3 sizes)
- ✅ Albums management
- ✅ Tag system (user and AI tags)
- ✅ Content-addressed storage (prevents duplicates)
- ✅ Soft delete for photos
- ✅ Background job processing
- ✅ CORS enabled for web clients

## Quick Start

### Prerequisites
- Docker Desktop installed
- At least 4GB RAM available
- 10GB disk space for development

### 1. Initial Setup

```bash
# Clone or navigate to the project directory
cd photonix-backend

# Copy environment variables
cp .env.example .env

# Edit .env if needed (default values work for development)
```

### 2. Build and Start Services

```bash
# Build images and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Rails API** on port 3000
- **Sidekiq** worker for background jobs

### 3. Create Database

```bash
# Run migrations
docker-compose exec web rails db:create db:migrate

# Optional: Load seed data
docker-compose exec web rails db:seed
```

### 4. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/up

# Should return: OK

# Check API root
curl http://localhost:3000

# Should return: Photonix API - v1.0.0
```

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

#### Signup
```bash
POST /api/v1/auth/signup
Content-Type: application/json

{
  "user": {
    "email": "user@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "name": "John Doe"
  }
}

Response:
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "storage_quota": 107374182400
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "user": {
    "email": "user@example.com",
    "password": "password123"
  }
}

Response:
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

### Photos

All photo endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

#### Upload Photo
```bash
POST /api/v1/photos
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
photo: <file>

Response:
{
  "message": "Photo uploaded successfully",
  "photo": {
    "id": 1,
    "original_filename": "IMG_1234.jpg",
    "format": "jpg",
    "file_size": 2456789,
    "width": 4032,
    "height": 3024,
    "processing_status": "pending",
    "thumbnail_urls": {
      "small": "/api/v1/photos/1/thumbnail/small",
      "medium": "/api/v1/photos/1/thumbnail/medium",
      "large": "/api/v1/photos/1/thumbnail/large"
    }
  }
}
```

#### List Photos
```bash
GET /api/v1/photos?page=1&per_page=50
Authorization: Bearer <token>

Response:
{
  "photos": [...],
  "meta": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 234,
    "per_page": 50
  }
}
```

#### Get Photo Details
```bash
GET /api/v1/photos/:id
Authorization: Bearer <token>

Response includes full EXIF data, tags, albums, etc.
```

#### Get Thumbnail
```bash
GET /api/v1/photos/:id/thumbnail/:size
Authorization: Bearer <token>

Sizes: small (200px), medium (800px), large (1600px)
Returns image file
```

#### Delete Photo
```bash
DELETE /api/v1/photos/:id
Authorization: Bearer <token>

Response:
{
  "message": "Photo deleted successfully"
}
```

### Albums

#### Create Album
```bash
POST /api/v1/albums
Content-Type: application/json
Authorization: Bearer <token>

{
  "album": {
    "name": "Vacation 2024",
    "description": "Summer trip to Hawaii",
    "privacy": "private",
    "album_type": "manual"
  }
}
```

#### List Albums
```bash
GET /api/v1/albums
Authorization: Bearer <token>
```

#### Add Photo to Album
```bash
POST /api/v1/albums/:id/photos
Content-Type: application/json
Authorization: Bearer <token>

{
  "photo_id": 123
}
```

#### Remove Photo from Album
```bash
DELETE /api/v1/albums/:id/photos/:photo_id
Authorization: Bearer <token>
```

### Tags

#### Add Tag to Photo
```bash
POST /api/v1/photos/:photo_id/tags
Content-Type: application/json
Authorization: Bearer <token>

{
  "tag_name": "sunset"
}
```

#### List All Tags
```bash
GET /api/v1/tags
Authorization: Bearer <token>
```

## Development

### Running Commands

```bash
# Rails console
docker-compose exec web rails console

# Run migrations
docker-compose exec web rails db:migrate

# View logs
docker-compose logs -f web
docker-compose logs -f sidekiq

# Stop all services
docker-compose down

# Reset database (WARNING: destroys all data)
docker-compose exec web rails db:drop db:create db:migrate
```

### Accessing Sidekiq Web UI

Add to `config/routes.rb`:
```ruby
require 'sidekiq/web'
mount Sidekiq::Web => '/sidekiq'
```

Then access at: `http://localhost:3000/sidekiq`

### Storage Structure

Photos are stored in a content-addressed structure:
```
storage/
├── originals/
│   └── 2024/
│       └── 11/
│           └── 3f/
│               └── 3f2a9b4c1d8e...abc123.jpg
└── thumbnails/
    ├── small/
    │   └── 2024/11/3f/3f2a9b4c1d8e...abc123.jpg
    ├── medium/
    │   └── 2024/11/3f/3f2a9b4c1d8e...abc123.jpg
    └── large/
        └── 2024/11/3f/3f2a9b4c1d8e...abc123.jpg
```

### Database Models

- **User**: User accounts with authentication
- **Photo**: Photo metadata and references
- **Album**: Photo collections
- **Tag**: User and AI-generated tags
- **PhotoAlbum**: Join table for photos and albums
- **PhotoTag**: Join table for photos and tags with confidence scores
- **Face**: Detected faces in photos (for future AI features)
- **Person**: Face clusters representing individuals

## Deployment

### Production Configuration

1. Update environment variables:
```bash
RAILS_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/photonix_production
REDIS_URL=redis://redis:6379/0
JWT_SECRET_KEY=your-very-long-secret-key-here
ALLOWED_ORIGINS=https://yourdomain.com
```

2. Build production image:
```bash
docker build -t photonix-backend .
```

3. Run with production docker-compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Raspberry Pi Deployment

The Docker images support ARM64 architecture. To deploy on Raspberry Pi:

1. Ensure Pi is running 64-bit OS
2. Mount external storage for photos
3. Update `STORAGE_ROOT` environment variable
4. Use the same docker-compose setup

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

### Database Connection Issues
```bash
# Restart database
docker-compose restart db

# Check logs
docker-compose logs db
```

### Thumbnail Generation Not Working
```bash
# Check Sidekiq is running
docker-compose ps

# View Sidekiq logs
docker-compose logs sidekiq

# Manually trigger thumbnail generation
docker-compose exec web rails console
> GenerateThumbnailsJob.perform_now(photo_id)
```

### Permission Issues with Storage
```bash
# Fix permissions on host
chmod -R 755 storage/

# Or rebuild with proper permissions
docker-compose down
docker-compose up --build
```

## Testing

```bash
# Run tests (when test suite is added)
docker-compose exec web rails test

# Run RuboCop for code quality
docker-compose exec web rubocop

# Run Brakeman for security checks
docker-compose exec web brakeman
```

## Next Steps

1. ✅ Backend API complete
2. 🔄 Build web UI (React/Vue)
3. 📱 Build mobile apps (iOS/Android)
4. 🤖 Add AI worker service for:
   - Face detection
   - Object/scene tagging
   - Duplicate detection
   - Similarity search

## Support

For issues and questions, refer to the architecture document in the `roadmap` file at the project root.

## License

[Your License Here]
