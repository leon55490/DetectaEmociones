import React from 'react';
import { CameraPanel } from '../components/CameraPanel';
import { Navbar } from '../components/Navbar';
import { ResultsPanel } from '../components/ResultsPanel';
import { useFaceAnalysis } from '../hooks/useFaceAnalysis';

export const HomePage: React.FC = () => {
  const {
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
  } = useFaceAnalysis(850);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Navbar
        backendOnline={backendOnline}
        backendHealth={backendHealth}
        onRefreshHealth={() => void refreshBackendHealth()}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="pt-6" />

        {/* Panel principal en dos columnas en escritorio y apilado vertical en móvil */}
        <section
          id="panel-analisis"
          aria-label="Panel de cámara y resultados de expresión facial"
          className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          <div className="lg:col-span-7 flex flex-col">
            <CameraPanel
              videoRef={videoRef}
              cameraStatus={cameraStatus}
              cameraError={cameraError}
              isAnalysisActive={isAnalysisActive}
              isProcessingFrame={isProcessingFrame}
              isSlowProcessing={isSlowProcessing}
              intervalMs={intervalMs}
              onChangeIntervalMs={setIntervalMs}
              latestResult={latestResult}
              captureDimensions={captureDimensions}
              onStartCamera={() => void startCamera()}
              onStopCamera={stopCamera}
              onToggleAnalysis={toggleAnalysis}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <ResultsPanel
              cameraStatus={cameraStatus}
              isAnalysisActive={isAnalysisActive}
              isProcessingFrame={isProcessingFrame}
              latestResult={latestResult}
              lastUpdatedAt={lastUpdatedAt}
              analysisError={analysisError}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
          <p>
            <strong className="text-[#0F172A]">DetectaEmociones</strong> — Detección facial y estimación de
            expresiones emocionales en tiempo real.
          </p>
          <p>
            Procesamiento local con FastAPI, OpenCV y DeepFace. Ninguna imagen es almacenada.
          </p>
        </div>
      </footer>
    </div>
  );
};
