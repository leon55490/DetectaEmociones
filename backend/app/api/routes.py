import asyncio
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.emotion import EmotionAnalysisResponse, HealthResponse
from app.services.emotion_service import EmotionModelError, InvalidImageError, emotion_service

router = APIRouter(prefix="/api", tags=["DetectaEmociones"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Comprobar el estado del servicio",
    description="Verifica que el servidor FastAPI esté operativo e informa el detector configurado.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        detector_backend=settings.DEEPFACE_DETECTOR_BACKEND,
        model_loaded=emotion_service.is_model_loaded,
    )


@router.post(
    "/emotion/analyze",
    response_model=EmotionAnalysisResponse,
    summary="Analizar expresión facial en una imagen",
    description=(
        "Recibe un fotograma en formato JPEG, PNG o WebP mediante multipart/form-data (campo 'file'), "
        "detecta el rostro principal y devuelve las puntuaciones de las 7 expresiones faciales."
    ),
)
async def analyze_emotion(
    file: Optional[UploadFile] = File(default=None, description="Archivo de imagen (JPEG, PNG o WebP)"),
) -> EmotionAnalysisResponse:
    # 1. Validar que el archivo exista
    if file is None or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes proporcionar un archivo de imagen válido en el campo 'file'.",
        )

    # 2. Validar el tipo MIME del archivo
    content_type = (file.content_type or "").lower().strip()
    if content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Formato de archivo no soportado ('{content_type or 'desconocido'}'). "
                "Formatos permitidos: JPEG, PNG y WebP."
            ),
        )

    # 3. Leer contenido y validar tamaño máximo permitido
    image_bytes = await file.read()
    await file.close()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo enviado está vacío.",
        )

    if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
        max_mb = settings.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"La imagen supera el tamaño máximo permitido de {max_mb:.1f} MB.",
        )

    # 4. Ejecutar el procesamiento pesado en un hilo separado para no bloquear el event loop
    try:
        response = await asyncio.to_thread(emotion_service.analyze_image_bytes, image_bytes)
        return response
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except EmotionModelError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error inesperado al procesar la solicitud.",
        ) from exc
