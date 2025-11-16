"""
Face Detection Service (Simple ARM/M1 Mac Compatible)
Uses InsightFace for both detection and recognition
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import cv2
import base64
from PIL import Image
import io
import logging
import insightface
from insightface.app import FaceAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Detection Service", version="1.0.0")

# Initialize InsightFace
face_app = None


def get_face_app():
    """Lazy load face analysis app"""
    global face_app
    if face_app is None:
        logger.info("Initializing InsightFace...")
        face_app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        logger.info("InsightFace initialized successfully")
    return face_app


# Request/Response Models
class DetectFacesRequest(BaseModel):
    image_path: str


class FaceData(BaseModel):
    encoding: List[float]  # Face encoding vector
    bounding_box: dict  # {top, right, bottom, left}
    confidence: float
    thumbnail_base64: Optional[str] = None


class DetectFacesResponse(BaseModel):
    success: bool
    faces: List[FaceData]
    message: str
    face_count: int


class CompareFacesRequest(BaseModel):
    face_encoding: List[float]
    known_encodings: List[List[float]]
    tolerance: float = 0.6


class FaceMatch(BaseModel):
    index: int
    distance: float
    is_match: bool


class CompareFacesResponse(BaseModel):
    matches: List[FaceMatch]
    best_match_index: Optional[int] = None
    best_match_distance: Optional[float] = None


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "service": "Face Detection Service (InsightFace)",
        "status": "running",
        "version": "1.0.0",
        "engine": "InsightFace (ARM Compatible)"
    }


@app.get("/health")
def health_check():
    """Health check for monitoring"""
    return {"status": "healthy"}


@app.post("/detect-faces", response_model=DetectFacesResponse)
async def detect_faces(request: DetectFacesRequest):
    """
    Detect faces in an image using InsightFace
    """
    try:
        logger.info(f"Processing image: {request.image_path}")

        # Read image
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=404, detail=f"Image file not found: {request.image_path}")

        # Get face analyzer
        app = get_face_app()

        # Detect faces
        faces = app.get(image)

        if not faces:
            logger.info("No faces detected")
            return DetectFacesResponse(
                success=True,
                faces=[],
                message="No faces detected",
                face_count=0
            )

        faces_data = []

        # Process each detected face
        for face in faces:
            # Get bounding box
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox

            # Create bounding box dict
            bbox_dict = {
                "top": int(y1),
                "right": int(x2),
                "bottom": int(y2),
                "left": int(x1),
                "width": int(x2 - x1),
                "height": int(y2 - y1)
            }

            # Get face encoding (512-D vector from InsightFace)
            encoding = face.embedding.tolist() if face.embedding is not None else [0.0] * 512

            # Extract face thumbnail
            face_image = image[y1:y2, x1:x2]
            thumbnail_base64 = None

            try:
                # Convert BGR to RGB
                face_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
                # Convert to PIL Image
                pil_image = Image.fromarray(face_rgb)
                # Resize to standard size
                pil_image = pil_image.resize((200, 200), Image.Resampling.LANCZOS)

                # Convert to base64
                buffer = io.BytesIO()
                pil_image.save(buffer, format="JPEG", quality=85)
                thumbnail_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            except Exception as e:
                logger.error(f"Error creating thumbnail: {e}")

            # Get confidence score
            confidence = float(face.det_score) if hasattr(face, 'det_score') else 0.9

            # Create face data
            face_data = FaceData(
                encoding=encoding,
                bounding_box=bbox_dict,
                confidence=confidence,
                thumbnail_base64=thumbnail_base64
            )

            faces_data.append(face_data)

        logger.info(f"Detected {len(faces_data)} face(s)")

        return DetectFacesResponse(
            success=True,
            faces=faces_data,
            message=f"Detected {len(faces_data)} face(s)",
            face_count=len(faces_data)
        )

    except FileNotFoundError:
        logger.error(f"Image file not found: {request.image_path}")
        raise HTTPException(status_code=404, detail=f"Image file not found: {request.image_path}")
    except Exception as e:
        logger.error(f"Error detecting faces: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error detecting faces: {str(e)}")


@app.post("/compare-faces", response_model=CompareFacesResponse)
async def compare_faces(request: CompareFacesRequest):
    """
    Compare a face encoding with a list of known encodings using cosine similarity
    """
    try:
        if not request.known_encodings:
            return CompareFacesResponse(
                matches=[],
                best_match_index=None,
                best_match_distance=None
            )

        # Convert to numpy arrays
        face_encoding_np = np.array(request.face_encoding)
        known_encodings_np = np.array(request.known_encodings)

        # Calculate cosine distances using InsightFace's method
        # InsightFace uses cosine similarity, we need distance (1 - similarity)
        from sklearn.metrics.pairwise import cosine_distances

        distances = cosine_distances([face_encoding_np], known_encodings_np)[0]

        # Create matches
        matches = []
        for idx, distance in enumerate(distances):
            matches.append(FaceMatch(
                index=idx,
                distance=float(distance),
                is_match=distance <= request.tolerance
            ))

        # Find best match
        best_match_index = int(np.argmin(distances))
        best_match_distance = float(distances[best_match_index])

        logger.info(f"Compared face with {len(known_encodings_np)} known faces. Best match: index={best_match_index}, distance={best_match_distance:.3f}")

        return CompareFacesResponse(
            matches=matches,
            best_match_index=best_match_index if best_match_distance <= request.tolerance else None,
            best_match_distance=best_match_distance
        )

    except Exception as e:
        logger.error(f"Error comparing faces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error comparing faces: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
