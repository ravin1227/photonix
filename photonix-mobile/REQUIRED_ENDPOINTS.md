# Required API Endpoints for Photo Upload Feature

## ✅ Existing Endpoints (Already Implemented)

### 1. Upload Single Photo
- **Endpoint:** `POST /api/v1/photos`
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:** 
  - `photo`: File (single photo)
- **Response:**
  ```json
  {
    "message": "Photo uploaded successfully",
    "photo": {
      "id": 1,
      "original_filename": "IMG_1234.jpg",
      ...
    }
  }
  ```

### 2. Upload Multiple Photos (Bulk Upload)
- **Endpoint:** `POST /api/v1/photos`
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `photos[]`: Array of Files (multiple photos)
- **Response:**
  ```json
  {
    "message": "Processed X photo(s)",
    "summary": {
      "total": 10,
      "successful": 8,
      "failed": 2
    },
    "results": {
      "successful": [
        {
          "index": 0,
          "filename": "IMG_1234.jpg",
          "photo": { "id": 1, ... }
        },
        ...
      ],
      "failed": [
        {
          "index": 5,
          "filename": "IMG_5678.jpg",
          "errors": ["Error message"]
        },
        ...
      ]
    }
  }
  ```

### 3. Add Photo to Album
- **Endpoint:** `POST /api/v1/albums/:album_id/photos`
- **Method:** POST
- **Body:**
  ```json
  {
    "photo_id": 123
  }
  ```
- **Response:**
  ```json
  {
    "message": "Photo added to album",
    "album": { ... },
    "photo": { ... }
  }
  ```

### 4. List Photos
- **Endpoint:** `GET /api/v1/photos?page=1&per_page=50`
- **Method:** GET
- **Response:**
  ```json
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

### 5. List Albums
- **Endpoint:** `GET /api/v1/albums`
- **Method:** GET
- **Response:**
  ```json
  {
    "albums": [
      {
        "id": 1,
        "name": "Vacation 2024",
        "photo_count": 45,
        "cover_photo_url": "...",
        ...
      },
      ...
    ]
  }
  ```

## 📋 Optional Endpoints (For Future Enhancement)

### 1. Check Upload Status
- **Endpoint:** `GET /api/v1/photos/upload-status/:upload_id`
- **Purpose:** Check status of bulk upload operation
- **Response:**
  ```json
  {
    "upload_id": "uuid-here",
    "status": "processing|completed|failed",
    "progress": {
      "total": 100,
      "completed": 75,
      "failed": 2
    },
    "results": { ... }
  }
  ```

### 2. Get Device Albums (iOS/Android)
- **Endpoint:** `GET /api/v1/device-albums`
- **Purpose:** Sync with device's native photo albums
- **Note:** This would require device-specific implementation
- **Response:**
  ```json
  {
    "device_albums": [
      {
        "name": "Camera Roll",
        "photo_count": 500,
        "last_modified": "2025-01-15T10:30:00Z"
      },
      ...
    ]
  }
  ```

### 3. Upload Photos by Date Range
- **Endpoint:** `POST /api/v1/photos/upload-by-date`
- **Purpose:** Upload all photos from device for a specific date
- **Body:**
  ```json
  {
    "date": "2025-11-16",
    "photos": [...]
  }
  ```
- **Response:** Same as bulk upload

### 4. Batch Add Photos to Album
- **Endpoint:** `POST /api/v1/albums/:album_id/photos/batch`
- **Purpose:** Add multiple photos to album in one request
- **Body:**
  ```json
  {
    "photo_ids": [1, 2, 3, 4, 5]
  }
  ```
- **Response:**
  ```json
  {
    "message": "Added 5 photos to album",
    "added_count": 5,
    "failed_count": 0
  }
  ```

## 🔧 Implementation Notes

### Current Implementation Status:
- ✅ Single photo upload - **Working**
- ✅ Bulk photo upload - **Working** (uses `photos[]` array)
- ✅ Add photo to album - **Working**
- ✅ List photos - **Working**
- ✅ List albums - **Working**

### Frontend Implementation:
- ✅ Photo picker component (`PhotoPicker.tsx`)
- ✅ Upload button component (`UploadButton.tsx`)
- ✅ Upload functionality in HomeScreen (date-based upload)
- ✅ Upload functionality in AlbumsScreen (album upload)
- ✅ Upload progress tracking
- ✅ Error handling

### Backend Compatibility:
The backend already supports:
- Single upload via `photo` parameter
- Bulk upload via `photos[]` parameter
- Proper error handling and response format

### Next Steps:
1. Test bulk upload with multiple photos
2. Verify error handling for failed uploads
3. Add progress tracking for large uploads (if needed)
4. Consider adding background upload support for better UX

