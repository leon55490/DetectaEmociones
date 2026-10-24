import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración global de la aplicación cargada desde variables de entorno o archivo .env."""

    APP_NAME: str = "DetectaEmociones API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Orígenes permitidos para CORS separados por coma
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Límite de tamaño de archivo (5 MB por defecto)
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024

    # Tipos MIME permitidos para análisis
    ALLOWED_CONTENT_TYPES: List[str] = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ]

    # Detector facial de DeepFace: opencv, ssd, mtcnn, retinaface, mediapipe, etc.
    DEEPFACE_DETECTOR_BACKEND: str = "opencv"

    # Si es True, construye el modelo de emociones al arrancar FastAPI
    PRELOAD_MODEL_ON_STARTUP: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
