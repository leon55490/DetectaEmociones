/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#101827',
          light: '#F8FAFC',
          primary: '#4F46E5',
          secondary: '#14B8A6',
          textDark: '#0F172A',
          textMuted: '#64748B',
          border: '#E2E8F0',
          error: '#DC2626',
          warning: '#D97706',
          success: '#16A34A',
        },
      },
    },
  },
  plugins: [],
};
