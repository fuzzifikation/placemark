import { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen for message from main process
    (window as any).api?.receive('main-process-message', (data: string) => {
      setMessage(data);
    });
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>Placemark</h1>
      <p>Privacy-first, local-first photo organizer</p>
      {message && <p style={{ color: '#666', fontSize: '0.875rem' }}>
        Main process says: {message}
      </p>}
      <p style={{ marginTop: '2rem', color: '#999', fontSize: '0.875rem' }}>
        Phase 0: Project Setup Complete ✓
      </p>
    </div>
  );
}

export default App;
