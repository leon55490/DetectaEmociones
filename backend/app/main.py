import asyncio
from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import settings
from app.services.emotion_service import emotion_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("detectaemociones.main")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Ciclo de vida de la aplicación FastAPI: precarga opcional del modelo al iniciar."""
    if settings.PRELOAD_MODEL_ON_STARTUP:
        asyncio.create_task(asyncio.to_thread(emotion_service.preload_model))
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "API local de visión artificial para detección facial y estimación de expresiones "
            "emocionales en tiempo real mediante OpenCV y DeepFace."
        ),
        lifespan=lifespan,
    )

    # Configurar CORS mediante variables de entorno
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # Manejo controlado de errores de validación (ej. petición sin campo 'file')
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": "Solicitud no válida. Asegúrate de enviar una imagen en el campo 'file' mediante multipart/form-data.",
                "errors": [
                    {"loc": [str(item) for item in err.get("loc", [])], "msg": err.get("msg", "")}
                    for err in exc.errors()
                ],
            },
        )

    app.include_router(api_router)
    return app


app = create_app()
