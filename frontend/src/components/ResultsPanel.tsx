import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ScanFace,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  CameraStatus,
  EMOTION_CATALOG,
  EMOTION_ORDER,
  EmotionAnalysisResponse,
  EmotionKey,
} from '../types/emotion';

interface ResultsPanelProps {
  cameraStatus: CameraStatus;
  isAnalysisActive: boolean;
  isProcessingFrame: boolean;
  latestResult: EmotionAnalysisResponse | null;
  lastUpdatedAt: Date | null;
  analysisError: string | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  cameraStatus,
  isAnalysisActive,
  isProcessingFrame,
  latestResult,
  lastUpdatedAt,
  analysisError,
}) => {
  const formattedTime = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const dominantKey: EmotionKey | null =
    latestResult?.face_detected && latestResult.dominant_emotion
      ? latestResult.dominant_emotion
      : null;

  const dominantMeta = dominantKey ? EMOTION_CATALOG[dominantKey] : null;

  // Datos estructurados para las 7 categorías
  const emotionItems = React.useMemo(() => {
    const scores = latestResult?.emotions;
    return EMOTION_ORDER.map((key) => {
      const meta = EMOTION_CATALOG[key];
      const rawScore = scores ? Number(scores[key] ?? 0) : 0;
      return {
        ...meta,
        score: Math.max(0, Math.min(100, rawScore)),
      };
    });
  }, [latestResult]);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
      <div>
        {/* Cabecera del panel de resultados */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#4F46E5]" />
            <h2 className="text-base font-bold text-[#0F172A]">
              Detección y resultados
            </h2>
          </div>

          {/* Etiqueta de estado de detección de rostro */}
          <div className="flex items-center gap-2">
            {isProcessingFrame && (
              <span
                title="Procesando fotograma en el backend"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#4F46E5]"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="sr-only">Procesando</span>
              </span>
            )}

            {latestResult === null ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-[#64748B] border border-[#E2E8F0]">
                Sin resultados aún
              </span>
            ) : latestResult.face_detected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
                <UserCheck className="w-3.5 h-3.5" />
                Rostro detectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30">
                <UserX className="w-3.5 h-3.5" />
                Rostro no detectado
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo de resultados */}
        <div className="p-5 space-y-5">
          {/* Alerta de error de red o del backend */}
          {analysisError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">No hay resultados disponibles del servidor</p>
                <p>{analysisError}</p>
              </div>
            </div>
          )}

          {/* Caso 1: Todavía no existen resultados */}
          {latestResult === null && !analysisError && (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC]/60 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mx-auto">
                {cameraStatus === 'active' && isAnalysisActive ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <ScanFace className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  {cameraStatus === 'active' && isAnalysisActive
                    ? 'Analizando el primer fotograma...'
                    : 'Todavía no existen resultados'}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {cameraStatus === 'active' && isAnalysisActive
                    ? 'Esperando la respuesta del modelo DeepFace desde el servidor local.'
                    : 'Activa la cámara en el panel izquierdo para comenzar a estimar las expresiones faciales en tiempo real.'}
                </p>
              </div>
            </div>
          )}

          {/* Caso 2: El backend respondió que NO se detectó ningún rostro */}
          {latestResult !== null && !latestResult.face_detected && (
            <div className="p-5 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#D97706]/20 text-[#D97706] shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  No se detectó ningún rostro. Colócate frente a la cámara.
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Asegúrate de que tu rostro esté completamente dentro del encuadre, mirando hacia
                  la cámara y con iluminación frontal suficiente.
                </p>
              </div>
            </div>
          )}

          {/* Caso 3: Rostro detectado -> Tarjeta de expresión predominante */}
          {latestResult !== null && latestResult.face_detected && dominantMeta && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-white border border-[#E2E8F0] shadow-sm shrink-0"
                  aria-hidden="true"
                >
                  {dominantMeta.emoji}
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Expresión predominante
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-[#0F172A]">
                      {latestResult.dominant_emotion_label || dominantMeta.label}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${dominantMeta.badgeClass}`}
                    >
                      {(latestResult.confidence ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {dominantMeta.description}
                  </p>
                </div>
              </div>

              {/* Aviso cuando hay múltiples rostros */}
              {latestResult.faces_count > 1 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] text-xs font-medium border border-[#4F46E5]/20">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {latestResult.faces_count} rostros detectados (analizando rostro principal)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Desglose de las 7 categorías */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Puntuaciones del modelo (7 categorías)
              </span>

            </div>

            <div className="space-y-2.5">
                {emotionItems.map((item) => {
                  const isDominant = dominantKey === item.key && latestResult?.face_detected;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`inline-flex items-center gap-2 ${
                            isDominant
                              ? 'font-bold text-[#0F172A]'
                              : 'font-medium text-[#64748B]'
                          }`}
                        >
                          <span aria-hidden="true" className="text-sm">
                            {item.emoji}
                          </span>
                          <span>{item.label}</span>
                          {isDominant && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] inline" />
                          )}
                        </span>
                        <span
                          className={`tabular-nums ${
                            isDominant
                              ? 'font-bold text-[#4F46E5]'
                              : 'text-[#64748B]'
                          }`}
                        >
                          {latestResult?.face_detected ? `${item.score.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-[#E2E8F0]/60">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ease-out ${
                            isDominant ? 'bg-[#4F46E5]' : item.barClass
                          }`}
                          style={{
                            width: latestResult?.face_detected ? `${item.score}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Pie del panel de resultados con hora de actualización y latencia */}
      <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
        <div className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
          <span>
            Última actualización:{' '}
            <strong className="text-[#0F172A]">
              {formattedTime ?? 'Pendiente'}
            </strong>
          </span>
        </div>

        {latestResult && (
          <span className="tabular-nums">
            Tiempo de inferencia:{' '}
            <strong className="text-[#0F172A]">
              {latestResult.processing_time_ms} ms
            </strong>
          </span>
        )}
      </div>
    </div>
  );
};
