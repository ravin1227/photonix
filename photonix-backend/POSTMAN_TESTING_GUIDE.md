# Photonix API - Postman Testing Guide

## Setup

1. **Base URL**: `http://localhost:3000`
2. **Create a new Postman Collection** called "Photonix API"
3. **Set Collection Variables**:
   - `base_url` = `http://localhost:3000`
   - `token` = (will be set after login)

## Testing Flow

### 1. Create Account (Signup)

**POST** `{{base_url}}/api/v1/auth/signup`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "user": {
    "email": "test@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "name": "Test User"
  }
}
```

**Expected Response** (201 Created):
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User",
    "storage_quota": 107374182400,
    "created_at": "2024-11-15T..."
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Post-Response Script** (save token automatically):
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.collectionVariables.set("token", response.token);
    console.log("Token saved:", response.token);
}
```

---

### 2. Login

**POST** `{{base_url}}/api/v1/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "user": {
    "email": "test@example.com",
    "password": "password123"
  }
}
```

**Expected Response** (200 OK):
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User",
    "storage_quota": 107374182400
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Post-Response Script**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.collectionVariables.set("token", response.token);
    console.log("Token saved:", response.token);
}
```

---

### 3. Upload Photo

**POST** `{{base_url}}/api/v1/photos`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Body** (form-data):
- Key: `photo`
- Type: File
- Value: [Select a photo file from your computer]

**Expected Response** (201 Created):
```json
{
  "message": "Photo uploaded successfully",
  "photo": {
    "id": 1,
    "original_filename": "IMG_1234.jpg",
    "format": "jpg",
    "file_size": 2456789,
    "width": 4032,
    "height": 3024,
    "captured_at": "2024-01-15T10:30:00.000Z",
    "processing_status": "pending",
    "thumbnail_urls": {
      "small": "/api/v1/photos/1/thumbnail/small",
      "medium": "/api/v1/photos/1/thumbnail/medium",
      "large": "/api/v1/photos/1/thumbnail/large"
    },
    "created_at": "2024-11-15T..."
  }
}
```

---

### 4. List All Photos

**GET** `{{base_url}}/api/v1/photos?page=1&per_page=20`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response** (200 OK):
```json
{
  "photos": [
    {
      "id": 1,
      "original_filename": "IMG_1234.jpg",
      "format": "jpg",
      "file_size": 2456789,
      "width": 4032,
      "height": 3024,
      "captured_at": "2024-01-15T10:30:00.000Z",
      "processing_status": "pending",
      "thumbnail_urls": {
        "small": "/api/v1/photos/1/thumbnail/small",
        "medium": "/api/v1/photos/1/thumbnail/medium",
        "large": "/api/v1/photos/1/thumbnail/large"
      },
      "created_at": "2024-11-15T..."
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 1,
    "total_count": 1,
    "per_page": 20
  }
}
```

---

### 5. Get Photo Details

**GET** `{{base_url}}/api/v1/photos/1`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response** (200 OK):
```json
{
  "photo": {
    "id": 1,
    "original_filename": "IMG_1234.jpg",
    "format": "jpg",
    "file_size": 2456789,
    "width": 4032,
    "height": 3024,
    "captured_at": "2024-01-15T10:30:00.000Z",
    "processing_status": "pending",
    "thumbnail_urls": {
      "small": "/api/v1/photos/1/thumbnail/small",
      "medium": "/api/v1/photos/1/thumbnail/medium",
      "large": "/api/v1/photos/1/thumbnail/large"
    },
    "created_at": "2024-11-15T...",
    "camera_make": "Apple",
    "camera_model": "iPhone 12 Pro",
    "iso": 100,
    "aperture": 1.6,
    "shutter_speed": "1/120",
    "focal_length": 26,
    "latitude": 37.7749,
    "longitude": -122.4194,
    "tags": [],
    "albums": []
  }
}
```

---

### 6. Get Photo Thumbnail

**GET** `{{base_url}}/api/v1/photos/1/thumbnail/medium`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response**: Image file (JPEG/PNG)

**Note**: You can view this URL directly in your browser or use Postman's image preview.

---

### 7. Create Album

**POST** `{{base_url}}/api/v1/albums`

**Headers**:
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "album": {
    "name": "Vacation 2024",
    "description": "Summer trip to Hawaii",
    "privacy": "private",
    "album_type": "manual"
  }
}
```

**Expected Response** (201 Created):
```json
{
  "message": "Album created successfully",
  "album": {
    "id": 1,
    "name": "Vacation 2024",
    "description": "Summer trip to Hawaii",
    "privacy": "private",
    "album_type": "manual",
    "photo_count": 0,
    "cover_photo_url": null,
    "created_at": "2024-11-15T...",
    "updated_at": "2024-11-15T..."
  }
}
```

---

### 8. List All Albums

**GET** `{{base_url}}/api/v1/albums`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response** (200 OK):
```json
{
  "albums": [
    {
      "id": 1,
      "name": "Vacation 2024",
      "description": "Summer trip to Hawaii",
      "privacy": "private",
      "album_type": "manual",
      "photo_count": 0,
      "cover_photo_url": null,
      "created_at": "2024-11-15T...",
      "updated_at": "2024-11-15T..."
    }
  ]
}
```

---

### 9. Add Photo to Album

**POST** `{{base_url}}/api/v1/albums/1/photos`

**Headers**:
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "photo_id": 1
}
```

**Expected Response** (200 OK):
```json
{
  "message": "Photo added to album"
}
```

---

### 10. Get Album with Photos

**GET** `{{base_url}}/api/v1/albums/1`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response** (200 OK):
```json
{
  "album": {
    "id": 1,
    "name": "Vacation 2024",
    "description": "Summer trip to Hawaii",
    "privacy": "private",
    "album_type": "manual",
    "photo_count": 1,
    "cover_photo_url": "/api/v1/photos/1/thumbnail/medium",
    "created_at": "2024-11-15T...",
    "updated_at": "2024-11-15T...",
    "photos_count": 1
  },
  "photos": [
    {
      "id": 1,
      "original_filename": "IMG_1234.jpg",
      "thumbnail_url": "/api/v1/photos/1/thumbnail/small",
      "captured_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 11. Add Tag to Photo

**POST** `{{base_url}}/api/v1/photos/1/tags`

**Headers**:
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "tag_name": "sunset"
}
```

**Expected Response** (200 OK):
```json
{
  "message": "Tag added to photo",
  "tag": {
    "id": 1,
    "name": "sunset",
    "tag_type": "user",
    "category": null,
    "usage_count": 1
  }
}
```

---

### 12. List All Tags

**GET** `{{base_url}}/api/v1/tags`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response** (200 OK):
```json
{
  "tags": [
    {
      "id": 1,
      "name": "sunset",
      "tag_type": "user",
      "category": null,
      "usage_count": 1
    }
  ]
}
```

---

### 13. Delete Photo

**DELETE** `{{base_url}}/api/v1/photos/1`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response** (200 OK):
```json
{
  "message": "Photo deleted successfully"
}
```

---

## Common Error Responses

### 401 Unauthorized (No token or invalid token)
```json
{
  "error": "Invalid or expired token"
}
```

### 401 Unauthorized (No token provided)
```json
{
  "error": "No token provided"
}
```

### 404 Not Found
```json
{
  "error": "Photo not found"
}
```

### 422 Unprocessable Entity (Validation Error)
```json
{
  "errors": [
    "Email can't be blank",
    "Password is too short (minimum is 6 characters)"
  ]
}
```

---

## Tips for Testing

1. **Save Collection Variables**: Use the Post-Response Scripts above to automatically save the token after signup/login

2. **Test in Order**: Follow the sequence above - signup → login → upload photo → create album → add photo to album

3. **Use Environment**: Create a Postman Environment with `base_url` variable for easy switching between dev/prod

4. **Test with Real Images**: Use actual JPEG/PNG files from your computer to test photo uploads and EXIF extraction

5. **Check Logs**: View Docker logs to see if thumbnails are being generated:
   ```bash
   docker-compose logs -f sidekiq
   ```

6. **Test Pagination**: Try uploading multiple photos and test pagination with different `page` and `per_page` values

7. **Test Filters**: Test date-based filtering, tag-based search, etc. (when implemented)

## Troubleshooting

### "No token provided" error
- Make sure you've added the `Authorization: Bearer {{token}}` header
- Check that the token variable is set in your collection variables

### Photo upload fails
- Ensure you're using form-data (not JSON) for file uploads
- Select a real image file (JPEG, PNG)
- Check file size isn't too large

### Can't connect to localhost:3000
- Ensure Docker containers are running: `docker-compose ps`
- Check if port 3000 is available: `lsof -i :3000`
- Try restarting Docker: `docker-compose restart web`

---

## Next Steps

After testing the basic API:
1. Test album management thoroughly
2. Upload multiple photos
3. Test tag functionality
4. Check thumbnail generation in `/api/v1/photos/:id/thumbnail/:size`
5. Test error cases (invalid data, unauthorized access, etc.)
