# Backend: DetectaEmociones API

API en **FastAPI** que recibe un fotograma, detecta el rostro principal con OpenCV y estima su expresión facial con el modelo preentrenado `Emotion` de **DeepFace**. Todo se procesa en memoria; no se guardan imágenes.

## Estructura

```text
backend/
├── app/
│   ├── main.py                  # App FastAPI, CORS y manejo de errores
│   ├── api/routes.py            # Endpoints
│   ├── core/config.py           # Configuración (.env)
│   ├── schemas/emotion.py       # Esquemas de respuesta (Pydantic)
│   └── services/emotion_service.py  # OpenCV + DeepFace
├── tests/                       # Pruebas con pytest
├── package.json                 # Scripts npm
├── requirements.txt             # Dependencias de Python
└── .env.example                 # Variables de entorno
```

## Ejecutar

Usa el Python instalado en el sistema (sin entorno virtual). Requiere Python 3.10 o 3.11.

```powershell
npm install                    # instala requirements.txt con pip
Copy-Item .env.example .env
npm run dev                    # http://localhost:8000
```

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Servidor con recarga automática |
| `npm start` | Servidor sin recarga |
| `npm test` | Todas las pruebas |
| `npm run test:unit` | Solo pruebas unitarias (rápidas) |
| `npm run test:integration` | Pruebas con el modelo real de DeepFace |

Documentación interactiva: <http://localhost:8000/docs>

## Endpoints

### `GET /api/health`

Devuelve el estado del servicio.

```json
{ "status": "ok", "service": "DetectaEmociones API", "version": "1.0.0", "detector_backend": "opencv", "model_loaded": true }
```

### `POST /api/emotion/analyze`

Recibe `multipart/form-data` con el campo `file` (JPEG, PNG o WebP, máx. 5 MB).

```json
{
  "success": true,
  "face_detected": true,
  "faces_count": 1,
  "dominant_emotion": "happy",
  "dominant_emotion_label": "Feliz",
  "confidence": 87.52,
  "emotions": { "happy": 87.52, "sad": 3.21, "angry": 1.4, "surprise": 2.6, "fear": 1.0, "disgust": 0.77, "neutral": 3.5 },
  "facial_area": { "x": 142, "y": 68, "w": 184, "h": 184 },
  "message": "Rostro detectado correctamente.",
  "processing_time_ms": 94
}
```

- Si no hay rostro, responde `200` con `face_detected: false` y el resto de campos en `null`.
- Si hay varios rostros, analiza solo el de mayor área y lo indica en `faces_count`.
- Las puntuaciones están en escala 0–100 y son valores del modelo, no probabilidades calibradas.
- El backend conserva las puntuaciones originales de DeepFace sin multiplicadores heurísticos; el frontend solo suaviza las predicciones entre fotogramas para reducir cambios bruscos.
- Errores: `400` (sin archivo, vacío o imagen inválida), `413` (demasiado grande), `415` (formato no permitido), `500` (fallo del modelo).

## Configuración (`.env`)

| Variable | Por defecto | Descripción |
| :--- | :--- | :--- |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Orígenes permitidos (separados por comas) |
| `MAX_IMAGE_SIZE_BYTES` | `5242880` | Tamaño máximo de imagen |
| `DEEPFACE_DETECTOR_BACKEND` | `opencv` | Detector facial (`opencv`, `ssd`, `mtcnn`, `retinaface`...) |
| `PRELOAD_MODEL_ON_STARTUP` | `true` | Carga el modelo al iniciar |

La primera vez, DeepFace descarga los pesos del modelo (unos pocos MB) en `~/.deepface/weights/`.
