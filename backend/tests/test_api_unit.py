import io
from unittest.mock import patch

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

# Desactivar precarga pesada durante pruebas unitarias rápidas
settings.PRELOAD_MODEL_ON_STARTUP = False

client = TestClient(app)


def _create_blank_jpeg_bytes(width: int = 240, height: int = 240) -> bytes:
    """Genera en memoria una imagen JPEG uniforme sin rostros."""
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:] = (40, 50, 60)
    success, encoded = cv2.imencode(".jpg", img)
    assert success
    return encoded.tobytes()


def test_health_endpoint_returns_ok() -> None:
    """Verifica que GET /api/health responde con código 200 y la estructura esperada."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "DetectaEmociones API"
    assert "detector_backend" in data
    assert "model_loaded" in data


def test_analyze_rejects_request_without_file() -> None:
    """Verifica que una petición sin archivo es rechazada con código 400."""
    response = client.post("/api/emotion/analyze")
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data


def test_analyze_rejects_non_image_content_type() -> None:
    """Verifica que un archivo que no es imagen (ej. text/plain) es rechazado con 415."""
    fake_text = io.BytesIO(b"Este archivo es texto plano, no una imagen.")
    response = client.post(
        "/api/emotion/analyze",
        files={"file": ("documento.txt", fake_text, "text/plain")},
    )
    assert response.status_code == 415
    assert "Formato de archivo no soportado" in response.json()["detail"]


def test_analyze_rejects_corrupted_image_bytes() -> None:
    """Verifica que bytes corruptos con MIME image/jpeg devuelven 400 sin provocar caída del servidor."""
    corrupted = io.BytesIO(b"\xff\xd8\xff\xe0datos_corruptos_no_decodificables")
    response = client.post(
        "/api/emotion/analyze",
        files={"file": ("corrupta.jpg", corrupted, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "imagen válida" in response.json()["detail"].lower()


def test_analyze_rejects_empty_file() -> None:
    """Verifica que un archivo vacío (0 bytes) es rechazado con 400."""
    empty = io.BytesIO(b"")
    response = client.post(
        "/api/emotion/analyze",
        files={"file": ("vacia.jpg", empty, "image/jpeg")},
    )
    assert response.status_code == 400


def test_analyze_handles_no_face_detected_gracefully() -> None:
    """Verifica que cuando DeepFace lanza ValueError por ausencia de rostro se devuelve face_detected=False."""
    jpeg_bytes = _create_blank_jpeg_bytes()

    with patch(
        "deepface.DeepFace.analyze",
        side_effect=ValueError("Face could not be detected in numpy array."),
    ):
        response = client.post(
            "/api/emotion/analyze",
            files={"file": ("sin_rostro.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["face_detected"] is False
    assert data["faces_count"] == 0
    assert data["dominant_emotion"] is None
    assert data["dominant_emotion_label"] is None
    assert data["confidence"] is None
    assert data["emotions"] is None
    assert isinstance(data["processing_time_ms"], int)


def test_analyze_returns_consistent_json_when_face_is_detected() -> None:
    """Verifica el contrato JSON completo cuando el modelo detecta un rostro y devuelve las 7 emociones."""
    jpeg_bytes = _create_blank_jpeg_bytes()
    mocked_deepface_output = [
        {
            "emotion": {
                "happy": np.float32(87.521),
                "sad": np.float32(3.21),
                "angry": np.float32(1.40),
                "surprise": np.float32(2.60),
                "fear": np.float32(1.00),
                "disgust": np.float32(0.77),
                "neutral": np.float32(3.50),
            },
            "dominant_emotion": "happy",
            "region": {"x": 42, "y": 38, "w": 120, "h": 120},
            "face_confidence": 0.99,
        }
    ]

    with patch("deepface.DeepFace.analyze", return_value=mocked_deepface_output):
        response = client.post(
            "/api/emotion/analyze",
            files={"file": ("rostro.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["face_detected"] is True
    assert data["faces_count"] == 1
    assert data["dominant_emotion"] == "happy"
    assert data["dominant_emotion_label"] == "Feliz"
    assert data["confidence"] == 87.52
    assert set(data["emotions"].keys()) == {
        "happy",
        "sad",
        "angry",
        "surprise",
        "fear",
        "disgust",
        "neutral",
    }
    assert data["facial_area"] == {"x": 42, "y": 38, "w": 120, "h": 120}
    assert isinstance(data["processing_time_ms"], int)


def test_analyze_selects_primary_face_when_multiple_faces_detected() -> None:
    """Verifica que ante múltiples rostros se selecciona el rostro de mayor área (w * h)."""
    jpeg_bytes = _create_blank_jpeg_bytes()
    mocked_deepface_output = [
        {
            "emotion": {
                "happy": 5.0,
                "sad": 80.0,
                "angry": 2.0,
                "surprise": 1.0,
                "fear": 2.0,
                "disgust": 0.0,
                "neutral": 10.0,
            },
            "dominant_emotion": "sad",
            "region": {"x": 10, "y": 10, "w": 50, "h": 50},  # Área = 2500
        },
        {
            "emotion": {
                "happy": 2.0,
                "sad": 1.0,
                "angry": 1.0,
                "surprise": 90.0,
                "fear": 2.0,
                "disgust": 0.0,
                "neutral": 4.0,
            },
            "dominant_emotion": "surprise",
            "region": {"x": 60, "y": 40, "w": 140, "h": 140},  # Área = 19600 (principal)
        },
    ]

    with patch("deepface.DeepFace.analyze", return_value=mocked_deepface_output):
        response = client.post(
            "/api/emotion/analyze",
            files={"file": ("grupo.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["face_detected"] is True
    assert data["faces_count"] == 2
    assert data["dominant_emotion"] == "surprise"
    assert data["dominant_emotion_label"] == "Sorprendido"
    assert data["facial_area"] == {"x": 60, "y": 40, "w": 140, "h": 140}
    assert "2 rostros" in data["message"]
