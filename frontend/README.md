# Frontend: DetectaEmociones

Interfaz en **React + Vite + TypeScript + Tailwind CSS** (tema claro). Abre la cámara con `getUserMedia`, envía fotogramas al backend y muestra la expresión estimada.

## Qué hace

- Activa, detiene y reanuda la cámara, con mensajes claros si no hay permiso o no hay cámara.
- Captura un fotograma cada ~850 ms (configurable desde la interfaz), lo reduce a 480 px de ancho y lo envía como JPEG.
- Nunca envía una petición nueva mientras la anterior sigue en curso, cancela las pendientes al detener y descarta respuestas antiguas.
- Muestra la expresión predominante, las 7 puntuaciones (barras o gráfico), el recuadro sobre el rostro, la hora de actualización y el estado de la API.

## Estructura

```text
frontend/src/
├── components/   # Navbar, CameraPanel, ResultsPanel
├── hooks/        # useFaceAnalysis (cámara, muestreo y cancelación)
├── pages/        # HomePage
├── services/     # api.ts (cliente fetch hacia el backend)
├── types/        # Tipos alineados con la API y catálogo de emociones
├── App.tsx
└── main.tsx
```

## Ejecutar

```powershell
npm install
Copy-Item .env.example .env
npm run dev                    # http://localhost:5173
```

El backend debe estar corriendo. La URL se configura en `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Scripts

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm run preview` | Sirve la compilación de `dist/` |
| `npm run lint` | Ejecuta ESLint |
