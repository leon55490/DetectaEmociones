import React from 'react';
import { RefreshCw, ScanFace, Server } from 'lucide-react';
import { HealthResponse } from '../types/emotion';

interface NavbarProps {
  backendOnline: boolean | null;
  backendHealth: HealthResponse | null;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendOnline,
  backendHealth,
  onRefreshHealth,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logotipo textual e icono */}
        <a
          href="#top"
          className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-sm">
            <ScanFace className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#0F172A] leading-none">
              Detecta<span className="text-[#4F46E5]">Emociones</span>
            </span>
            <span className="text-[11px] font-medium text-[#64748B]">
              Análisis facial en tiempo real
            </span>
          </div>
        </a>

        {/* Navegación y estado del backend */}
        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#64748B]">
            <a
              href="#panel-analisis"
              className="hover:text-[#4F46E5] transition-colors"
            >
              Panel en vivo
            </a>
          </nav>

          {/* Indicador de conexión con FastAPI */}
          <button
            type="button"
            onClick={onRefreshHealth}
            title={
              backendHealth
                ? `Detector activo: ${backendHealth.detector_backend} | Haz clic para comprobar conexión`
                : 'Comprobar conexión con el servidor FastAPI'
            }
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:border-[#4F46E5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          >
            <Server className="w-3.5 h-3.5 text-[#64748B]" />
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline === true
                  ? 'bg-[#16A34A]'
                  : backendOnline === false
                  ? 'bg-[#DC2626]'
                  : 'bg-[#D97706]'
              }`}
            />
            <span className="hidden sm:inline">
              {backendOnline === true
                ? 'API conectada'
                : backendOnline === false
                ? 'API sin conexión'
                : 'Verificando API...'}
            </span>
            <RefreshCw className="w-3 h-3 text-[#64748B]" />
          </button>
        </div>
      </div>
    </header>
  );
};
