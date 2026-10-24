import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeFrame, ApiError, checkBackendHealth } from '../services/api';
import {
  CameraStatus,
  EmotionAnalysisResponse,
  HealthResponse,
} from '../types/emotion';

const MAX_CAPTURE_WIDTH = 480;
const JPEG_QUALITY = 0.78;
const REQUEST_TIMEOUT_MS = 18000;

export interface CaptureDimensions {
  width: number;
  height: number;
}

export interface UseFaceAnalysisReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  isAnalysisActive: boolean;
  isProcessingFrame: boolean;
  isSlowProcessing: boolean;
  intervalMs: number;
  setIntervalMs: (ms: number) => void;
  latestResult: EmotionAnalysisResponse | null;
  lastUpdatedAt: Date | null;
  analysisError: string | null;
  backendHealth: HealthResponse | null;
  backendOnline: boolean | null;
  captureDimensions: CaptureDimensions | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  toggleAnalysis: () => void;
  refreshBackendHealth: () => Promise<void>;
}

export function useFaceAnalysis(initialIntervalMs = 850): UseFaceAnalysisReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const requestSeqRef = useRef<number>(0);
  const latestAppliedSeqRef = useRef<number>(0);
  const timerIdRef = useRef<number | null>(null);
  const slowTimerIdRef = useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalysisActive, setIsAnalysisActive] = useState<boolean>(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [isSlowProcessing, setIsSlowProcessing] = useState<boolean>(false);
  const [intervalMs, setIntervalMs] = useState<number>(initialIntervalMs);
  const [latestResult, setLatestResult] = useState<EmotionAnalysisResponse | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [captureDimensions, setCaptureDimensions] = useState<CaptureDimensions | null>(null);

  const clearPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (slowTimerIdRef.current !== null) {
      window.clearTimeout(slowTimerIdRef.current);
      slowTimerIdRef.current = null;
    }
    inFlightRef.current = false;
    setIsProcessingFrame(false);
    setIsSlowProcessing(false);
  }, []);

  const clearIntervalLoop = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const releaseMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignorar errores al detener pista individual
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearIntervalLoop();
    clearPendingRequest();
    releaseMediaStream();
    setIsAnalysisActive(false);
    setCameraStatus('idle');
    setCameraError(null);
  }, [clearIntervalLoop, clearPendingRequest, releaseMediaStream]);

  const refreshBackendHealth = useCallback(async () => {
    try {
      const health = await checkBackendHealth();
      setBackendHealth(health);
      setBackendOnline(health.status === 'ok');
    } catch {
      setBackendHealth(null);
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    void refreshBackendHealth();
    const healthTimer = window.setInterval(() => {
      void refreshBackendHealth();
    }, 15000);
    return () => {
      window.clearInterval(healthTimer);
    };
  }, [refreshBackendHealth]);

  const startCamera = useCallback(async () => {
    // Limpiar cualquier sesión previa para evitar intervalos o streams duplicados
    clearIntervalLoop();
    clearPendingRequest();
    releaseMediaStream();
    setCameraError(null);
    setAnalysisError(null);

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraStatus('no_device');
      setCameraError(
        'Tu navegador no admite el acceso a dispositivos de video (navigator.mediaDevices.getUserMedia). Utiliza un navegador actualizado en localhost o HTTPS.',
      );
      return;
    }

    setCameraStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStatus('active');
      setIsAnalysisActive(true);
    } catch (err) {
      releaseMediaStream();

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraStatus('permission_denied');
          setCameraError(
            'El permiso de acceso a la cámara fue denegado. Haz clic en el icono de permisos en la barra de direcciones del navegador, permite el uso de la cámara y vuelve a intentarlo.',
          );
          return;
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraStatus('no_device');
          setCameraError(
            'No se encontró ninguna cámara conectada a este equipo. Conecta una cámara USB o verifica que tu cámara integrada esté habilitada en Windows.',
          );
          return;
        }
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraStatus('error');
          setCameraError(
            'La cámara está siendo utilizada por otra aplicación (como Zoom, Teams o la app Cámara de Windows). Cierra la otra aplicación e inténtalo de nuevo.',
          );
          return;
        }
      }

      setCameraStatus('error');
      setCameraError(
        'Ocurrió un error al intentar acceder a la cámara. Comprueba la conexión del dispositivo y los permisos del sistema.',
      );
    }
  }, [clearIntervalLoop, clearPendingRequest, releaseMediaStream]);

  const captureAndAnalyzeOnce = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    const videoEl = videoRef.current;
    if (
      !videoEl ||
      videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      videoEl.videoWidth === 0 ||
      videoEl.videoHeight === 0
    ) {
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;

    const sourceWidth = videoEl.videoWidth;
    const sourceHeight = videoEl.videoHeight;
    const scale = sourceWidth > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / sourceWidth : 1;
    const targetWidth = Math.max(64, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(64, Math.round(sourceHeight * scale));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);

    const frameBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY);
    });

    if (!frameBlob || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsProcessingFrame(true);

    const currentSeq = ++requestSeqRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Si tarda más de 2.5s (ej. primera carga del modelo), mostrar aviso informativo
    slowTimerIdRef.current = window.setTimeout(() => {
      if (inFlightRef.current) {
        setIsSlowProcessing(true);
      }
    }, 2500);

    // Timeout de seguridad para no dejar peticiones colgadas indefinidamente
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const result = await analyzeFrame(frameBlob, controller.signal);

      // Evitar que respuestas antiguas sobrescriban resultados más recientes
      if (currentSeq >= latestAppliedSeqRef.current) {
        latestAppliedSeqRef.current = currentSeq;
        setLatestResult(result);
        setCaptureDimensions({ width: targetWidth, height: targetHeight });
        setLastUpdatedAt(new Date());
        setAnalysisError(null);
        setBackendOnline(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (currentSeq >= latestAppliedSeqRef.current && controller.signal.aborted) {
          // Solo mostrar mensaje si fue por timeout mientras el análisis sigue activo
        }
      } else if (err instanceof ApiError) {
        if (currentSeq >= latestAppliedSeqRef.current) {
          setAnalysisError(err.message);
          if (!err.status) {
            setBackendOnline(false);
          }
        }
      } else {
        if (currentSeq >= latestAppliedSeqRef.current) {
          setAnalysisError('Error de comunicación con el servidor de análisis.');
        }
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (slowTimerIdRef.current !== null) {
        window.clearTimeout(slowTimerIdRef.current);
        slowTimerIdRef.current = null;
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      inFlightRef.current = false;
      setIsProcessingFrame(false);
      setIsSlowProcessing(false);
    }
  }, []);

  // Gestionar el bucle de captura controlada cuando la cámara y el análisis están activos
  useEffect(() => {
    clearIntervalLoop();

    if (cameraStatus !== 'active' || !isAnalysisActive) {
      clearPendingRequest();
      return;
    }

    // Ejecutar primera captura tras un breve margen para que el video estabilice su exposición
    const initialKickoff = window.setTimeout(() => {
      void captureAndAnalyzeOnce();
    }, 250);

    timerIdRef.current = window.setInterval(() => {
      void captureAndAnalyzeOnce();
    }, intervalMs);

    return () => {
      window.clearTimeout(initialKickoff);
      clearIntervalLoop();
    };
  }, [
    cameraStatus,
    isAnalysisActive,
    intervalMs,
    captureAndAnalyzeOnce,
    clearIntervalLoop,
    clearPendingRequest,
  ]);

  // Limpiar cámara y peticiones al desmontar o abandonar la página
  useEffect(() => {
    const handlePageUnload = () => {
      clearIntervalLoop();
      clearPendingRequest();
      releaseMediaStream();
    };

    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handlePageUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageUnload);
      window.removeEventListener('beforeunload', handlePageUnload);
      handlePageUnload();
    };
  }, [clearIntervalLoop, clearPendingRequest, releaseMediaStream]);

  const toggleAnalysis = useCallback(() => {
    if (cameraStatus !== 'active') {
      return;
    }
    setIsAnalysisActive((prev) => {
      const next = !prev;
      if (!next) {
        clearPendingRequest();
      }
      return next;
    });
  }, [cameraStatus, clearPendingRequest]);

  return {
    videoRef,
    cameraStatus,
    cameraError,
    isAnalysisActive,
    isProcessingFrame,
    isSlowProcessing,
    intervalMs,
    setIntervalMs,
    latestResult,
    lastUpdatedAt,
    analysisError,
    backendHealth,
    backendOnline,
    captureDimensions,
    startCamera,
    stopCamera,
    toggleAnalysis,
    refreshBackendHealth,
  };
}
