# DetectaEmociones: explicación completa del proyecto

Este documento explica cómo funciona DetectaEmociones de extremo a extremo:

- cómo se abre la cámara;
- cómo se capturan y envían los fotogramas;
- cómo el backend detecta los rostros;
- cómo DeepFace estima las expresiones faciales;
- cómo se selecciona el rostro principal;
- cómo se dibuja y estabiliza el recuadro;
- cómo se comunican frontend y backend;
- qué modelos y tecnologías intervienen;
- cuáles son las limitaciones reales del sistema.

El proyecto estima **expresiones faciales visibles**. No puede saber con certeza el estado emocional interno de una persona.

---

## 1. Vista general

DetectaEmociones es una aplicación web local dividida en dos procesos:

```text
┌─────────────────────┐        HTTP        ┌──────────────────────────┐
│ Frontend React      │ ─────────────────> │ Backend FastAPI          │
│ Cámara y resultados │  JPEG + multipart  │ OpenCV + DeepFace        │
└─────────────────────┘ <───────────────── └──────────────────────────┘
                                  JSON
```

### Frontend

El frontend:

1. solicita permiso para usar la cámara;
2. muestra el vídeo en el navegador;
3. captura periódicamente un fotograma;
4. lo convierte a JPEG;
5. lo envía al backend;
6. recibe las puntuaciones de las expresiones;
7. muestra barras, etiqueta dominante y recuadro facial.

### Backend

El backend:

1. recibe el JPEG mediante `multipart/form-data`;
2. valida el tipo y el tamaño del archivo;
3. decodifica la imagen con OpenCV;
4. mejora moderadamente la iluminación;
5. ejecuta `DeepFace.analyze`;
6. detecta uno o varios rostros;
7. analiza las siete expresiones faciales;
8. selecciona el rostro de mayor tamaño;
9. devuelve un JSON tipado.

---

## 2. Estructura del proyecto

```text
DetectaEmociones/
├── README.md                         # Introducción breve existente
├── README_COMPLETO.md                # Este documento
├── backend/
│   ├── app/
│   │   ├── main.py                   # Creación de FastAPI, CORS y ciclo de vida
│   │   ├── api/
│   │   │   └── routes.py             # Endpoints HTTP
│   │   ├── core/
│   │   │   └── config.py             # Configuración y variables de entorno
│   │   ├── schemas/
│   │   │   └── emotion.py            # Modelos Pydantic de entrada/salida
│   │   └── services/
│   │       └── emotion_service.py    # OpenCV + DeepFace
│   ├── tests/
│   │   ├── test_api_unit.py           # Pruebas unitarias con mocks
│   │   └── test_integration_model.py  # Pruebas con el modelo real
│   ├── requirements.txt
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── CameraPanel.tsx        # Cámara y controles
    │   │   ├── Navbar.tsx             # Estado del backend
    │   │   └── ResultsPanel.tsx        # Resultados y barras
    │   ├── hooks/
    │   │   └── useFaceAnalysis.ts     # Flujo de cámara y peticiones
    │   ├── pages/
    │   │   └── HomePage.tsx
    │   ├── services/
    │   │   └── api.ts                 # Cliente HTTP
    │   └── types/
    │       └── emotion.ts             # Tipos y catálogo de emociones
    ├── package.json
    └── vite.config.ts
```

---

## 3. Tecnologías y modelos utilizados

### Frontend

- **React 18:** componentes y estado de la interfaz.
- **TypeScript:** tipos estáticos para las respuestas y estados.
- **Vite:** servidor de desarrollo y compilación.
- **Tailwind CSS:** estilos.
- **`getUserMedia`:** API del navegador para acceder a la webcam.
- **Fetch:** comunicación HTTP con FastAPI.

### Backend

- **Python 3.10 o 3.11**
- **FastAPI:** servidor HTTP y documentación Swagger.
- **Pydantic:** validación y serialización de respuestas.
- **OpenCV:** decodificación, procesamiento de imágenes y detector configurado.
- **NumPy:** representación de imágenes como matrices.
- **DeepFace:** integración del detector facial y del modelo de expresiones.
- **TensorFlow / tf-keras:** motor utilizado por el modelo de DeepFace.

### Modelo de emociones

La llamada actual es:

```python
DeepFace.analyze(
    img_path=enhanced_bgr,
    actions=["emotion"],
    enforce_detection=True,
    detector_backend=settings.DEEPFACE_DETECTOR_BACKEND,
    align=True,
    silent=True,
)
```

La acción `emotion` utiliza el modelo preentrenado de emociones de DeepFace. El resultado contiene siete categorías:

```text
happy     felicidad
sad       tristeza
angry     enojo
surprise  sorpresa
fear      miedo
disgust   disgusto
neutral   neutralidad
```

Este modelo se basa en el conjunto de datos FER-2013 y clasifica patrones visuales aprendidos de expresiones faciales. Sus porcentajes son puntuaciones del modelo, no probabilidades clínicas ni mediciones directas de emociones humanas.

### Modelo de detección facial

La configuración predeterminada es:

```env
DEEPFACE_DETECTOR_BACKEND=opencv
```

DeepFace utiliza ese backend para localizar las caras antes de ejecutar la clasificación de emociones. El detector responde con regiones rectangulares llamadas `region`:

```json
{
  "x": 142,
  "y": 68,
  "w": 184,
  "h": 184
}
```

La región significa:

- `x`: posición horizontal;
- `y`: posición vertical;
- `w`: ancho;
- `h`: alto.

El backend puede configurarse con otros detectores compatibles con DeepFace, pero no todos tienen el mismo consumo o velocidad. Cambiar el detector no cambia automáticamente el modelo de emociones.

---

## 4. Flujo completo de una imagen

### Paso 1: apertura de la cámara

El hook [`useFaceAnalysis.ts`](./frontend/src/hooks/useFaceAnalysis.ts) solicita la cámara con `navigator.mediaDevices.getUserMedia`.

El vídeo se muestra en un elemento HTML:

```html
<video autoplay muted playsinline></video>
```

El frontend no sube el vídeo completo ni mantiene una grabación. Solo toma imágenes individuales para analizarlas.

### Paso 2: captura del fotograma

El frontend dibuja el fotograma actual sobre un `canvas`:

```text
vídeo de la cámara → canvas → JPEG Blob
```

Para controlar el coste:

- el ancho máximo de captura es `640` píxeles;
- la calidad JPEG es `0.82`;
- se conserva la relación de aspecto;
- no se inicia otra petición mientras la anterior siga procesándose.

### Paso 3: frecuencia de análisis

La frecuencia no cambia los FPS del vídeo. Solo define cada cuánto se envía una imagen al backend.

Opciones actuales:

| Intervalo | Efecto |
|---:|---|
| 450 ms | Más actualizaciones, más consumo |
| 700 ms | Equilibrio recomendado |
| 850 ms | Menor carga |
| 1200 ms | Bajo consumo, respuesta más lenta |

Si una inferencia tarda más que el intervalo, el frontend no acumula peticiones: espera a que termine la anterior.

### Paso 4: petición HTTP

El cliente de [`api.ts`](./frontend/src/services/api.ts) crea un `FormData`:

```text
POST http://localhost:8000/api/emotion/analyze
Content-Type: multipart/form-data
Campo: file=frame.jpg
```

La URL base se puede cambiar con:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Paso 5: validación del backend

`routes.py` valida:

- que exista el campo `file`;
- que el nombre del archivo exista;
- que el MIME sea JPEG, PNG o WebP;
- que el archivo no esté vacío;
- que no supere `MAX_IMAGE_SIZE_BYTES`, cuyo valor predeterminado es 5 MB.

Después delega el trabajo pesado a un hilo con `asyncio.to_thread`, evitando bloquear el event loop de FastAPI.

### Paso 6: decodificación OpenCV

El servicio convierte los bytes recibidos en una matriz BGR de OpenCV:

```text
bytes JPEG/PNG/WebP → NumPy uint8 → cv2.imdecode → imagen BGR
```

También rechaza imágenes corruptas o demasiado pequeñas para analizar un rostro.

### Paso 7: mejora de iluminación

Antes de llamar a DeepFace se aplica `_enhance_lighting`:

1. filtro bilateral suave para reducir ruido manteniendo bordes;
2. conversión BGR a LAB;
3. CLAHE sobre el canal de luminosidad;
4. conversión de vuelta a BGR.

Esto intenta compensar sombras y contraluz. No genera una emoción ni altera manualmente las puntuaciones.

### Paso 8: detección y alineación

DeepFace localiza los rostros con el backend configurado. Con `align=True`, intenta alinear el rostro usando sus referencias faciales para que ojos y cara queden en una posición más consistente antes de clasificar la expresión.

La alineación ayuda al modelo, pero no transforma una imagen mala en una imagen fiable. El rostro debe estar suficientemente visible y enfocado.

### Paso 9: inferencia emocional

DeepFace devuelve una estructura parecida a:

```json
{
  "emotion": {
    "happy": 87.52,
    "sad": 3.21,
    "angry": 1.40,
    "surprise": 2.60,
    "fear": 1.00,
    "disgust": 0.77,
    "neutral": 3.50
  },
  "dominant_emotion": "happy",
  "region": {
    "x": 142,
    "y": 68,
    "w": 184,
    "h": 184
  }
}
```

El servicio normaliza las siete claves, limita cada valor al rango `0–100` y redondea a dos decimales.

Importante: el backend actual **no aplica multiplicadores ni refuerzos heurísticos**. No aumenta artificialmente `sad`, `happy` ni ninguna otra categoría. La emoción dominante se obtiene con el máximo de las puntuaciones originales normalizadas.

### Paso 10: varios rostros

Si DeepFace devuelve varios rostros:

1. se filtran regiones demasiado pequeñas o con confianza facial baja;
2. se conserva la cantidad detectada;
3. se selecciona como rostro principal el de mayor área:

```text
área = w × h
```

Solo ese rostro se utiliza para mostrar la emoción principal y el recuadro. El sistema no combina las emociones de todas las personas.

### Paso 11: respuesta JSON

El backend responde con `EmotionAnalysisResponse`, validado por Pydantic:

```json
{
  "success": true,
  "face_detected": true,
  "faces_count": 1,
  "dominant_emotion": "happy",
  "dominant_emotion_label": "Feliz",
  "confidence": 87.52,
  "emotions": {
    "happy": 87.52,
    "sad": 3.21,
    "angry": 1.4,
    "surprise": 2.6,
    "fear": 1.0,
    "disgust": 0.77,
    "neutral": 3.5
  },
  "facial_area": {
    "x": 142,
    "y": 68,
    "w": 184,
    "h": 184
  },
  "message": "Rostro detectado correctamente.",
  "processing_time_ms": 94
}
```

Si no hay rostro, la petición no necesariamente es un error. Devuelve `200` con:

```json
{
  "success": true,
  "face_detected": false,
  "faces_count": 0,
  "dominant_emotion": null,
  "emotions": null
}
```

---

## 5. ¿Existe seguimiento del rostro?

No existe un tracker persistente como Deep SORT, ByteTrack, Kalman Filter o MediaPipe Face Mesh.

El funcionamiento real es:

```text
fotograma 1 → detectar rostro
fotograma 2 → detectar rostro de nuevo
fotograma 3 → detectar rostro de nuevo
```

Esto es una estrategia de **redetección por fotograma**, suficiente para una aplicación sencilla de webcam.

### Suavizado de la caja facial

El frontend aplica un promedio exponencial a la caja cuando existen dos resultados consecutivos:

```text
caja mostrada = 0.6 × caja nueva + 0.4 × caja anterior
```

Esto reduce el temblor visual del rectángulo. No cambia la detección del backend ni reubica la cara por suposiciones.

### Suavizado de las emociones

También se aplica una media exponencial a las puntuaciones:

```text
puntuación mostrada =
  0.72 × puntuación nueva +
  0.28 × puntuación anterior
```

Además, existe una pequeña histéresis para evitar que la etiqueta cambie continuamente cuando dos emociones tienen puntuaciones muy parecidas.

Este suavizado:

- no crea una emoción que no aparezca en el modelo;
- no mejora la capacidad fundamental del modelo;
- solo reduce parpadeos entre capturas.

Si se pierde un rostro durante un solo fotograma, el frontend puede mantener brevemente el último resultado para evitar un parpadeo visual. Si se pierde durante más tiempo, se limpia el resultado.

---

## 6. Comunicación entre frontend y backend

### Comprobación de salud

El frontend consulta:

```http
GET /api/health
```

Respuesta:

```json
{
  "status": "ok",
  "service": "DetectaEmociones API",
  "version": "1.0.0",
  "detector_backend": "opencv",
  "model_loaded": true
}
```

### Análisis de emoción

El frontend envía:

```http
POST /api/emotion/analyze
```

con un archivo de imagen en el campo `file`.

### CORS

FastAPI permite los orígenes definidos en `CORS_ORIGINS`:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Esto permite que el frontend de Vite, que normalmente usa el puerto `5173`, llame al backend en el puerto `8000`.

### Cancelación y orden de respuestas

El frontend:

- usa `AbortController` para cancelar peticiones;
- aplica un timeout de seguridad de 18 segundos;
- no inicia peticiones concurrentes;
- usa un contador de secuencia para no aplicar respuestas antiguas.

Esto evita que una respuesta lenta sobrescriba el resultado más reciente.

---

## 7. Endpoints

### `GET /api/health`

Comprueba que el servicio está operativo y expone el detector configurado.

### `POST /api/emotion/analyze`

Analiza una imagen.

Tipos MIME permitidos:

- `image/jpeg`;
- `image/jpg`;
- `image/png`;
- `image/webp`.

Errores habituales:

| Código | Causa |
|---:|---|
| 400 | Falta el archivo, está vacío o la imagen es inválida |
| 413 | La imagen supera el tamaño máximo |
| 415 | Tipo MIME no permitido |
| 500 | Error interno del modelo o del procesamiento |

La documentación interactiva está disponible en:

```text
http://localhost:8000/docs
```

---

## 8. Configuración

La configuración está en [`backend/app/core/config.py`](./backend/app/core/config.py) y puede sobrescribirse con `.env`.

| Variable | Predeterminado | Función |
|---|---|---|
| `APP_NAME` | `DetectaEmociones API` | Nombre de la API |
| `APP_VERSION` | `1.0.0` | Versión mostrada |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Orígenes permitidos |
| `MAX_IMAGE_SIZE_BYTES` | `5242880` | Tamaño máximo, 5 MB |
| `DEEPFACE_DETECTOR_BACKEND` | `opencv` | Detector facial |
| `PRELOAD_MODEL_ON_STARTUP` | `true` | Precarga del modelo al iniciar |

La precarga evita que la primera solicitud tenga que construir el modelo. La primera ejecución también puede descargar pesos en la carpeta de DeepFace del usuario.

---

## 9. Instalación y ejecución

### Requisitos

- Windows, Linux o macOS;
- Python 3.10 o 3.11;
- Node.js 18 o superior;
- cámara web;
- conexión a internet la primera vez para instalar dependencias y descargar pesos.

### Backend

```powershell
cd DetectaEmociones\backend
npm install
Copy-Item .env.example .env
npm run dev
```

El backend queda en:

```text
http://localhost:8000
```

### Frontend

En otra terminal:

```powershell
cd DetectaEmociones\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

El frontend queda en:

```text
http://localhost:5173
```

### Scripts principales

Backend:

```powershell
npm run dev
npm start
npm test
npm run test:unit
npm run test:integration
```

Frontend:

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

---

## 10. Pruebas

### Pruebas unitarias

`test_api_unit.py` utiliza mocks para no depender de una inferencia real en cada caso. Comprueba:

- estado de salud;
- archivos ausentes;
- MIME inválido;
- imagen corrupta;
- archivo vacío;
- ausencia de rostros;
- estructura de una respuesta con rostro;
- selección del rostro más grande;
- conservación de las puntuaciones originales del modelo.

### Pruebas de integración

`test_integration_model.py` utiliza DeepFace real y comprueba:

- respuesta controlada ante una imagen sin rostro;
- carga del modelo `Emotion`;
- existencia de las siete categorías;
- puntuaciones dentro de un total aproximado de 100.

Las pruebas de integración pueden ser más lentas porque cargan TensorFlow y los pesos del modelo.

---

## 11. Limitaciones importantes

### Expresión facial no es emoción real

El sistema observa rasgos visibles como:

- apertura de la boca;
- posición de cejas;
- tensión facial;
- forma de ojos y labios;
- patrones aprendidos en imágenes etiquetadas.

No puede conocer por sí solo si alguien realmente está triste, feliz o enojado. Una persona puede sonreír estando triste o tener un rostro neutral estando preocupada.

### La tristeza puede ser difícil

La tristeza suele tener señales más sutiles que una sonrisa amplia o una sorpresa exagerada. Puede confundirse con neutralidad por:

- poca intensidad de la expresión;
- iluminación;
- baja resolución;
- rostro pequeño;
- ángulo de la cabeza;
- oclusiones;
- diferencias entre personas;
- limitaciones y sesgos de FER-2013.

Por eso el código actual no fuerza la etiqueta `sad`: conserva las puntuaciones originales de DeepFace.

### Otros límites

- analiza principalmente el rostro de mayor área;
- no identifica personas;
- no almacena imágenes;
- no interpreta voz, texto ni contexto;
- no debe utilizarse para decisiones médicas, legales, laborales o de seguridad;
- las puntuaciones no están calibradas como probabilidades clínicas.

---

## 12. Cómo obtener resultados más consistentes

Para evaluar el sistema de forma justa:

1. coloca el rostro de frente;
2. ocupa una parte razonable del encuadre;
3. usa luz frontal y uniforme;
4. evita una ventana muy brillante detrás;
5. mantén la expresión durante varios fotogramas;
6. evita cubrir ojos, cejas o boca;
7. prueba cada expresión con varias personas;
8. registra las puntuaciones originales antes de cambiar el modelo;
9. compara precisión, latencia y consumo antes de cambiar el detector.

El detector `opencv` es una opción ligera y apropiada para la primera versión. Cambiarlo por RetinaFace o MTCNN puede aumentar la detección en casos difíciles, pero también aumenta el tiempo y el consumo. MediaPipe o YuNet serían alternativas razonables si las pruebas demuestran que OpenCV pierde muchos rostros.

---

## 13. Privacidad y seguridad

- Las imágenes se procesan en memoria.
- El backend no guarda los fotogramas en disco.
- El frontend no graba un vídeo.
- La cámara requiere permiso explícito del navegador.
- El backend está pensado para ejecutarse localmente.
- Si se publica en internet, deben añadirse autenticación, HTTPS, límites de tasa y controles de privacidad.

---

## 14. Resumen técnico

```text
Webcam
  ↓
getUserMedia()
  ↓
video HTML
  ↓
canvas.toBlob(JPEG)
  ↓
POST /api/emotion/analyze
  ↓
FastAPI valida multipart
  ↓
OpenCV decodifica y mejora iluminación
  ↓
DeepFace + detector OpenCV localiza rostros
  ↓
DeepFace Emotion estima 7 expresiones
  ↓
Se filtran regiones inválidas
  ↓
Se selecciona el rostro de mayor área
  ↓
Pydantic serializa la respuesta JSON
  ↓
React aplica suavizado temporal
  ↓
Interfaz muestra emoción, barras y recuadro
```

La arquitectura busca un equilibrio entre simplicidad, coste y claridad: el backend realiza la visión artificial y el frontend controla la cámara, la experiencia visual y la estabilidad temporal del resultado.
