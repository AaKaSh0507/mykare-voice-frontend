import { useEffect, useState } from 'react';
import { checkHealth } from './api';

function App() {
  const [healthStatus, setHealthStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    const loadHealth = async () => {
      const health = await checkHealth();
      if (!isMounted) return;
      setHealthStatus(health.status === 'error' ? 'offline' : 'online');
    };

    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app">
      <h1>Mykare Voice AI</h1>
      <p>Healthcare Voice Agent</p>
      <span className={`status-badge status-badge--${healthStatus}`}>
        {healthStatus === 'checking' && 'Checking...'}
        {healthStatus === 'online' && 'Backend: Online ✅'}
        {healthStatus === 'offline' && 'Backend: Offline ❌'}
      </span>
    </div>
  );
}

export default App;
