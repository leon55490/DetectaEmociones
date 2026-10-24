import { EmotionAnalysisResponse, HealthResponse } from '../types/emotion';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_BASE_URL = String(rawBaseUrl).replace(/\/+$/, '');

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Comprueba el estado de salud del backend FastAPI.
 */
export async function checkBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new ApiError(`El servidor respondió con estado ${response.status}`, response.status);
  }

  return (await response.json()) as HealthResponse;
}

/**
 * Envía un fotograma JPEG al endpoint POST /api/emotion/analyze mediante multipart/form-data.
 */
export async function analyzeFrame(
  frameBlob: Blob,
  signal?: AbortSignal,
): Promise<EmotionAnalysisResponse> {
  const formData = new FormData();
  formData.append('file', frameBlob, 'frame.jpg');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/emotion/analyze`, {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError(
      'No se pudo conectar con el servidor de análisis. Verifica que el backend esté en ejecución en ' +
        API_BASE_URL,
    );
  }

  if (!response.ok) {
    let detail = `Error del servidor (${response.status})`;
    try {
      const errorData = (await response.json()) as { detail?: string };
      if (errorData && typeof errorData.detail === 'string') {
        detail = errorData.detail;
      }
    } catch {
      // Conservar mensaje por defecto si la respuesta no es JSON
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as EmotionAnalysisResponse;
}
