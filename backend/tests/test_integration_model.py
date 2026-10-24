import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.integration
def test_real_deepface_pipeline_with_blank_image() -> None:
    """
    Prueba de integración real con OpenCV + DeepFace:
    Envía un lienzo sintético sin rostro y comprueba que el pipeline real
    responde de forma controlada con face_detected=False.
    """
    canvas = np.full((320, 320, 3), 120, dtype=np.uint8)
    ok, encoded = cv2.imencode(".jpg", canvas)
    assert ok

    response = client.post(
        "/api/emotion/analyze",
        files={"file": ("lienzo.jpg", io.BytesIO(encoded.tobytes()), "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["face_detected"] is False
    assert data["dominant_emotion"] is None


@pytest.mark.integration
def test_real_deepface_emotion_model_with_sample_face() -> None:
    """
    Prueba de integración real extremo a extremo utilizando la imagen de ejemplo
    incluida en el paquete opencv-python / datos sintéticos si está disponible,
    o verificando directamente la inferencia real del modelo Emotion de DeepFace.
    """
    from deepface import DeepFace

    # Construir el modelo real de emociones y verificar que predice las 7 clases
    emotion_model = DeepFace.build_model("Emotion", task="facial_attribute")
    assert emotion_model is not None

    # Ejecutar DeepFace.analyze real con enforce_detection=False sobre un tensor sintético
    # para verificar que el modelo preentrenado de emociones devuelve puntuaciones reales en [0, 100]
    synthetic_face = np.zeros((224, 224, 3), dtype=np.uint8)
    cv2.circle(synthetic_face, (112, 112), 80, (200, 200, 200), -1)
    cv2.circle(synthetic_face, (85, 90), 10, (30, 30, 30), -1)
    cv2.circle(synthetic_face, (139, 90), 10, (30, 30, 30), -1)
    cv2.ellipse(synthetic_face, (112, 135), (35, 18), 0, 0, 180, (30, 30, 30), 4)

    result = DeepFace.analyze(
        img_path=synthetic_face,
        actions=["emotion"],
        enforce_detection=False,
        detector_backend="skip",
        silent=True,
    )
    first = result[0] if isinstance(result, list) else result
    assert "emotion" in first
    assert "dominant_emotion" in first
    assert set(first["emotion"].keys()) == {
        "happy",
        "sad",
        "angry",
        "surprise",
        "fear",
        "disgust",
        "neutral",
    }
    total_score = sum(float(v) for v in first["emotion"].values())
    assert 99.0 <= total_score <= 101.0
