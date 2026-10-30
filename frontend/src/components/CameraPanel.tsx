import React from 'react';
import {
  AlertCircle,
  Camera,
  CameraOff,
  Clock,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  VideoOff,
} from 'lucide-react';
import { CaptureDimensions } from '../hooks/useFaceAnalysis';
import { CameraStatus, EmotionAnalysisResponse } from '../types/emotion';

interface CameraPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  isAnalysisActive: boolean;
  isProcessingFrame: boolean;
  isSlowProcessing: boolean;
  intervalMs: number;
  onChangeIntervalMs: (ms: number) => void;
  latestResult: EmotionAnalysisResponse | null;
  captureDimensions: CaptureDimensions | null;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onToggleAnalysis: () => void;
}

const INTERVAL_OPTIONS = [
  { value: 450, label: '450 ms (Muy fluido)' },
  { value: 700, label: '700 ms (Recomendado)' },
  { value: 850, label: '850 ms (Estándar)' },
  { value: 1200, label: '1200 ms (Bajo consumo)' },
];

export const CameraPanel: React.FC<CameraPanelProps> = ({
  videoRef,
  cameraStatus,
  cameraError,
  isAnalysisActive,
  isProcessingFrame,
  isSlowProcessing,
  intervalMs,
  onChangeIntervalMs,
  latestResult,
  captureDimensions,
  onStartCamera,
  onStopCamera,
  onToggleAnalysis,
}) => {
  const isActive = cameraStatus === 'active';
  const isRequesting = cameraStatus === 'requesting';

  // Calcular posición porcentual del recuadro facial si se detectó un rostro
  const faceBoxStyle = React.useMemo(() => {
    if (
      !isActive ||
      !latestResult?.face_detected ||
      !latestResult.facial_area ||
      !captureDimensions ||
      captureDimensions.width <= 0 ||
      captureDimensions.height <= 0
    ) {
      return null;
    }

    const { x, y, w, h } = latestResult.facial_area;
    const widthPct = Math.min(100, Math.max(0, (w / captureDimensions.width) * 100));
    const heightPct = Math.min(100, Math.max(0, (h / captureDimensions.height) * 100));
    const rawLeftPct = (x / captureDimensions.width) * 100;
    const leftPct = Math.max(0, rawLeftPct);
    const topPct = Math.min(100, Math.max(0, (y / captureDimensions.height) * 100));

    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
    };
  }, [isActive, latestResult, captureDimensions]);

  // Ajustar relación de aspecto al stream real de la cámara para alinear el recuadro sin recortes
  const containerAspectRatio =
    isActive && captureDimensions && captureDimensions.width > 0 && captureDimensions.height > 0
      ? `${captureDimensions.width} / ${captureDimensions.height}`
      : '4 / 3';

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Cabecera de la tarjeta */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Camera className="w-5 h-5 text-[#4F46E5]" />
          <h2 className="text-base font-bold text-[#0F172A]">
            Cámara en directo
          </h2>
        </div>

        {/* Estado visual de la cámara */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              Cámara activa
            </span>
          ) : isRequesting ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              Iniciando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-[#64748B] border border-[#E2E8F0]">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Cámara apagada
            </span>
          )}
        </div>
      </div>

      {/* Contenedor del reproductor de video */}
      <div
        style={{ aspectRatio: containerAspectRatio }}
        className="relative bg-[#0F172A] w-full overflow-hidden flex items-center justify-center"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${
            isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Recuadro delimitador del rostro principal */}
        {faceBoxStyle && (
          <div
            style={faceBoxStyle}
            className="pointer-events-none absolute border-2 border-[#14B8A6] rounded-xl shadow-[0_0_0_2px_rgba(20,184,166,0.25)] transition-all duration-300 ease-out"
          >
            {latestResult?.dominant_emotion_label && (
              <span className="absolute -top-6 left-0 px-2 py-0.5 rounded-md bg-[#14B8A6] text-slate-950 font-semibold text-[11px] shadow-sm whitespace-nowrap">
                {latestResult.dominant_emotion_label}{' '}
                {latestResult.confidence !== null ? `(${latestResult.confidence.toFixed(1)}%)` : ''}
              </span>
            )}
          </div>
        )}

        {/* Indicador superior de procesamiento en curso */}
        {isActive && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/75 backdrop-blur-md text-white text-xs border border-white/10">
              {isAnalysisActive ? (
                <>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isProcessingFrame ? 'bg-[#14B8A6] animate-ping' : 'bg-[#14B8A6]'
                    }`}
                  />
                  <span>
                    {isProcessingFrame ? 'Analizando fotograma...' : 'Análisis automático activo'}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                  <span>Análisis en pausa</span>
                </>
              )}
            </div>

          </div>
        )}

        {/* Aviso si el procesamiento inicial tarda más de lo normal */}
        {isActive && isSlowProcessing && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-[#14B8A6]/40 text-slate-100 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#14B8A6] animate-spin shrink-0" />
              <span>
                Procesando imagen en el servidor (la primera ejecución puede tardar unos segundos
                mientras se inicializa el modelo)...
              </span>
            </div>
          </div>
        )}

        {/* Estado inicial cuando la cámara está apagada */}
        {cameraStatus === 'idle' && (
          <div className="p-6 text-center max-w-md space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700 text-[#14B8A6] flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">Cámara desactivada</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Haz clic en <strong>Activar cámara</strong> para iniciar la transmisión en vivo y
                comenzar la detección facial en tiempo real.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartCamera}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4F46E5] hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
            >
              <Camera className="w-4 h-4" />
              <span>Activar cámara</span>
            </button>
          </div>
        )}

        {/* Estado de solicitud de permisos */}
        {cameraStatus === 'requesting' && (
          <div className="p-6 text-center max-w-md space-y-3">
            <Loader2 className="w-10 h-10 text-[#14B8A6] animate-spin mx-auto" />
            <h3 className="text-base font-semibold text-white">
              Esperando permiso del navegador...
            </h3>
            <p className="text-xs text-slate-300">
              Acepta la solicitud emergente de tu navegador para permitir el acceso a la cámara.
            </p>
          </div>
        )}

        {/* Estado de permiso denegado */}
        {cameraStatus === 'permission_denied' && (
          <div className="p-6 text-center max-w-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/20 border border-[#DC2626]/40 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">
                Permiso de cámara bloqueado
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              <div className="text-left text-[11px] text-slate-300 bg-slate-800/90 border border-slate-700 rounded-xl p-3 space-y-1">
                <p className="font-semibold text-white">Cómo habilitar el permiso:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Haz clic en el icono de controles o candado junto a la URL.</li>
                  <li>Cambia el permiso de &ldquo;Cámara&rdquo; a &ldquo;Permitir&rdquo;.</li>
                  <li>Pulsa el botón &ldquo;Reintentar acceso&rdquo; aquí debajo.</li>
                </ol>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartCamera}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4F46E5] hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar acceso</span>
            </button>
          </div>
        )}

        {/* Estado sin cámara disponible o error general */}
        {(cameraStatus === 'no_device' || cameraStatus === 'error') && (
          <div className="p-6 text-center max-w-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D97706]/20 border border-[#D97706]/40 text-amber-400 flex items-center justify-center mx-auto">
              {cameraStatus === 'no_device' ? (
                <VideoOff className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">
                {cameraStatus === 'no_device'
                  ? 'No se detectó ninguna cámara disponible'
                  : 'No se pudo iniciar la cámara'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            </div>
            <button
              type="button"
              onClick={onStartCamera}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4F46E5] hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Volver a intentar</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de controles inferiores */}
      <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {!isActive ? (
            <button
              type="button"
              onClick={onStartCamera}
              disabled={isRequesting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            >
              <Camera className="w-4 h-4" />
              <span>{isRequesting ? 'Activando...' : 'Activar cámara'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onStopCamera}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
              >
                <CameraOff className="w-4 h-4" />
                <span>Detener cámara</span>
              </button>

              <button
                type="button"
                onClick={onToggleAnalysis}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                  isAnalysisActive
                    ? 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#4F46E5]'
                    : 'border-transparent bg-[#14B8A6] text-slate-950 hover:bg-teal-400'
                }`}
              >
                {isAnalysisActive ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pausar análisis</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Reanudar análisis</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Selector de intervalo de captura */}
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Clock className="w-4 h-4 text-[#4F46E5] shrink-0" />
          <label htmlFor="interval-select" className="font-medium whitespace-nowrap">
            Frecuencia:
          </label>
          <select
            id="interval-select"
            value={intervalMs}
            onChange={(e) => onChangeIntervalMs(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
