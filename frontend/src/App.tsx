import { useEffect } from 'react';
import { HomePage } from './pages/HomePage';

export function App() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.removeItem('detectaemociones_theme');
  }, []);

  return <HomePage />;
}

export default App;
