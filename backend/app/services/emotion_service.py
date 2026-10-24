import logging
import threading
import time
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from app.core.config import settings
from app.schemas.emotion import EmotionAnalysisResponse, EmotionScores, FacialArea

logger = logging.getLogger("detectaemociones.emotion_service")

# Mapa oficial de etiquetas de DeepFace a español
EMOTION_LABELS_ES: Dict[str, str] = {
    "happy": "Feliz",
    "sad": "Triste",
    "angry": "Enojado",
    "surprise": "Sorprendido",
    "fear": "Con miedo",
    "disgust": "Disgustado",
    "neutral": "Neutral",
}

EXPECTED_EMOTION_KEYS = ("happy", "sad", "angry", "surprise", "fear", "disgust", "neutral")


class InvalidImageError(ValueError):
    """Excepción lanzada cuando los bytes enviados no corresponden a una imagen válida."""


class EmotionModelError(RuntimeError):
    """Excepción lanzada cuando ocurre un fallo interno inesperado en el motor de inferencia."""


class EmotionService:
    """Servicio singleton para decodificación de imágenes y estimación de expresiones faciales."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._model_loaded = False

    @property
    def is_model_loaded(self) -> bool:
        return self._model_loaded

    def preload_model(self) -> bool:
        """
        Inicializa en memoria el modelo preentrenado de emociones de DeepFace
        para evitar latencia de construcción en la primera petición.
        """
        with self._lock:
            if self._model_loaded:
                return True
            try:
                from deepface import DeepFace

                logger.info("Cargando modelo preentrenado de expresiones faciales (Emotion)...")
                try:
                    DeepFace.build_model("Emotion", task="facial_attribute")
                except TypeError:
                    # Compatibilidad con versiones de DeepFace donde build_model recibe solo model_name
                    DeepFace.build_model("Emotion")

                self._model_loaded = True
                logger.info("Modelo de expresiones faciales cargado correctamente.")
                return True
            except Exception as exc:
                logger.warning("No se pudo precargar el modelo al inicio: %s", exc)
                return False

    @staticmethod
    def decode_image(image_bytes: bytes) -> np.ndarray:
        """
        Decodifica bytes de imagen en una matriz BGR de OpenCV.
        Lanza InvalidImageError si los bytes están vacíos o corruptos.
        """
        if not image_bytes:
            raise InvalidImageError("El archivo de imagen está vacío.")

        np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        if np_buffer.size == 0:
            raise InvalidImageError("No se pudieron leer bytes válidos del archivo enviado.")

        image_bgr = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if image_bgr is None or image_bgr.size == 0:
            raise InvalidImageError("El archivo proporcionado no es una imagen válida o está corrupto.")

        height, width = image_bgr.shape[:2]
        if height < 20 or width < 20:
            raise InvalidImageError("Las dimensiones de la imagen son demasiado pequeñas para analizar un rostro.")

        return image_bgr

    @staticmethod
    def _is_no_face_exception(exc: Exception) -> bool:
        """
        Determina si un ValueError lanzado por DeepFace corresponde específicamente
        a la ausencia de rostros detectados en el fotograma.
        """
        msg = str(exc).lower()
        no_face_markers = (
            "face could not be detected",
            "no face",
            "cannot be detected",
            "confirm that the picture is a face photo",
        )
        return any(marker in msg for marker in no_face_markers)

    @staticmethod
    def _select_primary_face(results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Si se detectan varios rostros, selecciona el rostro principal (el de mayor área w * h).
        """
        if len(results) == 1:
            return results[0]

        def get_area(item: Dict[str, Any]) -> int:
            region = item.get("region") or {}
            w = int(region.get("w", 0) or 0)
            h = int(region.get("h", 0) or 0)
            return w * h

        return max(results, key=get_area)

    def analyze_image_bytes(self, image_bytes: bytes) -> EmotionAnalysisResponse:
        """
        Decodifica los bytes de la imagen y ejecuta únicamente la estimación de expresiones
        faciales con DeepFace, devolviendo un esquema tipado y serializable a JSON.
        """
        start_time = time.perf_counter()

        # 1. Decodificar imagen con OpenCV (sin guardar en disco)
        image_bgr = self.decode_image(image_bytes)

        # 2. Ejecutar análisis de emociones con DeepFace
        try:
            from deepface import DeepFace

            with self._lock:
                raw_result = DeepFace.analyze(
                    img_path=image_bgr,
                    actions=["emotion"],
                    enforce_detection=True,
                    detector_backend=settings.DEEPFACE_DETECTOR_BACKEND,
                    silent=True,
                )
                self._model_loaded = True
        except ValueError as exc:
            if self._is_no_face_exception(exc):
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return EmotionAnalysisResponse(
                    success=True,
                    face_detected=False,
                    faces_count=0,
                    dominant_emotion=None,
                    dominant_emotion_label=None,
                    confidence=None,
                    emotions=None,
                    facial_area=None,
                    message="No se detectó ningún rostro. Colócate frente a la cámara con buena iluminación.",
                    processing_time_ms=elapsed_ms,
                )
            logger.error("Error de validación en DeepFace: %s", exc)
            raise EmotionModelError("Error al procesar la imagen con el detector facial.") from exc
        except Exception as exc:
            logger.error("Fallo inesperado durante el análisis de expresiones: %s", exc)
            raise EmotionModelError("Ocurrió un error interno al ejecutar el modelo de expresiones.") from exc

        # 3. Normalizar formato de salida (DeepFace devuelve lista de dicts o un dict)
        if isinstance(raw_result, dict):
            results_list: List[Dict[str, Any]] = [raw_result]
        elif isinstance(raw_result, list):
            results_list = [item for item in raw_result if isinstance(item, dict)]
        else:
            results_list = []

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        if not results_list:
            return EmotionAnalysisResponse(
                success=True,
                face_detected=False,
                faces_count=0,
                dominant_emotion=None,
                dominant_emotion_label=None,
                confidence=None,
                emotions=None,
                facial_area=None,
                message="No se detectó ningún rostro. Colócate frente a la cámara.",
                processing_time_ms=elapsed_ms,
            )

        # Filtrar falsos positivos donde el detector no encontró región válida si existiera alguno
        faces_count = len(results_list)
        primary_face = self._select_primary_face(results_list)

        raw_emotions: Dict[str, Any] = primary_face.get("emotion") or {}
        normalized_emotions: Dict[str, float] = {}
        for key in EXPECTED_EMOTION_KEYS:
            value = float(raw_emotions.get(key, 0.0))
            # Mantener en el rango [0.0, 100.0] con 2 decimales
            normalized_emotions[key] = round(max(0.0, min(100.0, value)), 2)

        dominant_emotion = str(primary_face.get("dominant_emotion") or "").lower().strip()
        if dominant_emotion not in normalized_emotions:
            dominant_emotion = max(normalized_emotions, key=normalized_emotions.get)  # type: ignore[arg-type]

        dominant_label = EMOTION_LABELS_ES.get(dominant_emotion, "Neutral")
        confidence = round(float(normalized_emotions.get(dominant_emotion, 0.0)), 2)

        region_data: Optional[Dict[str, Any]] = primary_face.get("region")
        facial_area: Optional[FacialArea] = None
        if isinstance(region_data, dict) and all(k in region_data for k in ("x", "y", "w", "h")):
            facial_area = FacialArea(
                x=int(region_data["x"]),
                y=int(region_data["y"]),
                w=int(region_data["w"]),
                h=int(region_data["h"]),
            )

        info_message = (
            f"Se detectaron {faces_count} rostros. Mostrando el análisis del rostro principal."
            if faces_count > 1
            else "Rostro detectado correctamente."
        )

        return EmotionAnalysisResponse(
            success=True,
            face_detected=True,
            faces_count=faces_count,
            dominant_emotion=dominant_emotion,
            dominant_emotion_label=dominant_label,
            confidence=confidence,
            emotions=EmotionScores(**normalized_emotions),
            facial_area=facial_area,
            message=info_message,
            processing_time_ms=elapsed_ms,
        )


emotion_service = EmotionService()
