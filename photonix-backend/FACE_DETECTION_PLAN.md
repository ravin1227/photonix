# Face Detection & People Grouping - Implementation Plan

## Overview
Implement face detection and automatic grouping similar to Google Photos.

## Do We Need LLM/AI?

**NO LLM needed!** This is a **Computer Vision** task, not a language task.

We need:
- ✅ Face Detection (find faces in images)
- ✅ Face Recognition/Encoding (convert faces to numeric vectors)
- ✅ Face Clustering (group similar faces together)
- ❌ NO ChatGPT/LLM required

---

## Architecture Options

### Option 1: Python Microservice ⭐ RECOMMENDED
**Pros:**
- Most mature ecosystem for face detection
- Use `face_recognition` library (easiest, most popular)
- Fast, accurate, free, open-source
- Full control over data (privacy)
- Can run locally or in Docker

**Cons:**
- Need to maintain another service
- Slightly more complex setup

**Technology Stack:**
- Python 3.9+
- face_recognition library (built on dlib)
- FastAPI or Flask for API
- OpenCV for image processing
- scikit-learn for clustering

### Option 2: Cloud Services (AWS Rekognition / Google Vision)
**Pros:**
- No infrastructure to manage
- Very accurate
- Scalable

**Cons:**
- 💰 Costs money ($1-5 per 1000 images)
- 🔒 Privacy concerns (send photos to cloud)
- Vendor lock-in

### Option 3: Ruby Gems
**Cons:**
- Very limited, not mature
- Not recommended for production

---

## Recommended Architecture: Python Microservice

```
┌─────────────────────────────────────────────────────────────┐
│                    Photo Upload Flow                        │
└─────────────────────────────────────────────────────────────┘

1. User uploads photo
   ↓
2. Rails API saves photo & metadata to DB
   ↓
3. Rails enqueues FaceDetectionJob (Sidekiq)
   ↓
4. FaceDetectionJob calls Python Face Service
   ↓
5. Python Service:
   - Detects faces in image
   - Generates face encodings (128-D vectors)
   - Crops face thumbnails
   - Returns face data (JSON)
   ↓
6. Rails receives face data:
   - Compare new face encodings with existing People
   - If similarity > 0.6: Link to existing Person
   - If similarity < 0.6: Create new Person
   - Save Face records to DB
   ↓
7. Update Person thumbnails
```

---

## How Face Grouping Works

### Step 1: Face Detection
Detect all faces in the uploaded image and get bounding boxes.

### Step 2: Face Encoding
Convert each detected face into a 128-dimensional vector (face embedding).
- Same person → Similar vectors
- Different people → Different vectors

### Step 3: Face Comparison
Compare new face encoding with all existing Person encodings using **cosine similarity**.

```
Similarity Score:
  > 0.6  → Same person (link to existing Person)
  < 0.6  → Different person (create new Person)
```

### Step 4: Person Grouping
- If person exists: Add face to that person
- If new person: Create new Person with this face

---

## Database Schema (Already Exists!)

```ruby
# Person Model
- id
- name (default: "Unknown Person #123")
- photo_count (counter cache)
- representative_face_id (best face thumbnail)
- created_at, updated_at

# Face Model
- id
- photo_id (which photo)
- person_id (which person)
- bounding_box (x, y, width, height - JSON)
- face_encoding (128-D vector - JSON array)
- confidence (0.0 - 1.0)
- thumbnail_path (cropped face image)
- created_at, updated_at
```

---

## Technology Stack Details

### Python Face Detection Service

**Libraries:**
```python
# Core face detection
face_recognition==1.3.0  # Built on dlib, very easy to use

# Image processing
opencv-python==4.8.0
Pillow==10.0.0

# API framework
fastapi==0.104.0
uvicorn==0.24.0

# Utilities
numpy==1.24.0
scikit-learn==1.3.0  # For clustering
```

**API Endpoints:**
```
POST /detect-faces
  Input: { "image_path": "/path/to/photo.jpg" }
  Output: {
    "faces": [
      {
        "encoding": [0.123, -0.456, ...],  // 128-D vector
        "bounding_box": {"top": 10, "right": 200, "bottom": 250, "left": 50},
        "confidence": 0.95,
        "thumbnail_base64": "iVBORw0KG..."
      }
    ]
  }

POST /compare-faces
  Input: {
    "face_encoding": [...],
    "person_encodings": [...]
  }
  Output: {
    "matches": [
      {"person_id": 123, "similarity": 0.85}
    ]
  }
```

---

## Implementation Steps

### Phase 1: Setup Python Service
1. Create `face-detection-service/` directory
2. Setup FastAPI Python service
3. Install face_recognition library
4. Implement face detection endpoint
5. Test with sample images

### Phase 2: Rails Integration
1. Add Face model fields (face_encoding, bounding_box)
2. Create FaceDetectionJob (Sidekiq)
3. Add HTTP client to call Python service
4. Process face detection results
5. Link faces to photos

### Phase 3: Person Grouping
1. Implement face comparison logic
2. Create Person when new face detected
3. Link face to existing Person if match found
4. Generate person thumbnails

### Phase 4: People API
1. GET /api/v1/people (list all people)
2. GET /api/v1/people/:id (person details + photos)
3. PUT /api/v1/people/:id (rename person)
4. POST /api/v1/people/:id/merge (merge two people)
5. DELETE /api/v1/people/:id (remove person)

### Phase 5: UI Integration
1. People screen showing all detected people
2. Person detail screen with all photos
3. Face thumbnail display
4. Name editing

---

## Performance Considerations

### Processing Time:
- Face detection: ~0.5-2 seconds per photo
- Face encoding: ~0.1 seconds per face
- Face comparison: ~0.001 seconds per comparison

### Optimization:
- ✅ Run face detection in background (Sidekiq)
- ✅ Process faces asynchronously
- ✅ Cache person encodings in memory
- ✅ Batch process multiple photos

### Scalability:
- Start: Single Python service container
- Scale: Multiple Python workers
- Future: GPU acceleration for faster processing

---

## Privacy & Data

### Face Data Storage:
- ✅ Face encodings (128 numbers) stored in DB
- ✅ Original photos stay local
- ✅ No data sent to cloud
- ✅ All processing happens locally

### Security:
- Face encodings are one-way (can't reconstruct face from encoding)
- Encodings only useful for comparison
- No privacy concerns

---

## Estimated Implementation Time

- **Phase 1** (Python Service): 4-6 hours
- **Phase 2** (Rails Integration): 3-4 hours
- **Phase 3** (Person Grouping): 2-3 hours
- **Phase 4** (People API): 2-3 hours
- **Phase 5** (UI Integration): (Frontend work)

**Total Backend**: ~12-16 hours

---

## Alternative: Quick Start with AWS Rekognition

If you want to test quickly without Python service:

```ruby
# Using AWS Rekognition
require 'aws-sdk-rekognition'

rekognition = Aws::Rekognition::Client.new
response = rekognition.detect_faces({
  image: { bytes: File.read('photo.jpg') }
})

# Returns face bounding boxes and attributes
# Cost: ~$1 per 1000 images
```

---

## Recommendation

**Start with Python Microservice (Option 1)**

Why?
1. Free and open-source
2. Privacy-focused (all local)
3. Full control over accuracy
4. Industry-standard approach
5. Same tech Google Photos uses (similar libraries)

Next Steps:
1. ✅ Review this plan
2. ✅ Approve approach
3. → Start with Phase 1 (Python service setup)

---

## Questions to Answer

1. **Do you want to start implementation now?**
2. **Any preference on technology?** (Python microservice vs Cloud API)
3. **Should we create a separate repo for Python service or keep it in same project?**

Let me know and I'll start building! 🚀
