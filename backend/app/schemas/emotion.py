from typing import Dict, Optional
from pydantic import BaseModel, Field


class EmotionScores(BaseModel):
    """Puntuaciones porcentuales (0-100) devueltas por el modelo para las 7 expresiones."""

    happy: float = Field(..., ge=0.0, le=100.0, description="Felicidad")
    sad: float = Field(..., ge=0.0, le=100.0, description="Tristeza")
    angry: float = Field(..., ge=0.0, le=100.0, description="Enojo")
    surprise: float = Field(..., ge=0.0, le=100.0, description="Sorpresa")
    fear: float = Field(..., ge=0.0, le=100.0, description="Miedo")
    disgust: float = Field(..., ge=0.0, le=100.0, description="Disgusto")
    neutral: float = Field(..., ge=0.0, le=100.0, description="Neutralidad")


class FacialArea(BaseModel):
    """Coordenadas del cuadro delimitador del rostro principal analizado."""

    x: int
    y: int
    w: int
    h: int


class EmotionAnalysisResponse(BaseModel):
    """Contrato de respuesta del endpoint POST /api/emotion/analyze."""

    success: bool = Field(default=True, description="Indica si la petición se procesó correctamente")
    face_detected: bool = Field(..., description="Indica si se detectó al menos un rostro en la imagen")
    faces_count: int = Field(default=0, description="Cantidad total de rostros detectados en el fotograma")
    dominant_emotion: Optional[str] = Field(
        default=None,
        description="Etiqueta técnica en inglés de la expresión predominante (ej. 'happy')",
    )
    dominant_emotion_label: Optional[str] = Field(
        default=None,
        description="Nombre en español de la expresión predominante (ej. 'Feliz')",
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Puntuación porcentual (0-100) asociada a la expresión predominante",
    )
    emotions: Optional[EmotionScores] = Field(
        default=None,
        description="Desglose de puntuaciones para las 7 categorías de expresión facial",
    )
    facial_area: Optional[FacialArea] = Field(
        default=None,
        description="Región del rostro principal analizado dentro de la imagen enviada",
    )
    message: Optional[str] = Field(
        default=None,
        description="Mensaje informativo adicional sobre la detección",
    )
    processing_time_ms: int = Field(..., ge=0, description="Tiempo de procesamiento en milisegundos")


class HealthResponse(BaseModel):
    """Contrato de respuesta del endpoint GET /api/health."""

    status: str = Field(default="ok")
    service: str = Field(default="DetectaEmociones API")
    version: str = Field(default="1.0.0")
    detector_backend: str = Field(default="opencv")
    model_loaded: bool = Field(default=False)
