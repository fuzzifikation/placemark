import { useState } from 'react';

declare global {
  interface Window {
    api: {
      photos: {
        scanFolder: () => Promise<any>;
        getWithLocation: () => Promise<any[]>;
        getCountWithLocation: () => Promise<number>;
      };
    };
  }
}

function App() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScanFolder = async () => {
    setScanning(true);
    setResult(null);

    try {
      const scanResult = await window.api.photos.scanFolder();
      setResult(scanResult);
    } catch (error) {
      console.error('Scan failed:', error);
      setResult({ error: String(error) });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
      }}
    >
      <h1>Placemark</h1>
      <p style={{ color: '#666' }}>Privacy-first, local-first photo organizer</p>

      <button
        onClick={handleScanFolder}
        disabled={scanning}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: scanning ? '#ccc' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: scanning ? 'not-allowed' : 'pointer',
        }}
      >
        {scanning ? 'Scanning...' : 'Scan Folder'}
      </button>

      {result && !result.canceled && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Scan Results</h3>
          {result.error ? (
            <p style={{ color: 'red' }}>{result.error}</p>
          ) : (
            <>
              <p>
                <strong>Folder:</strong> {result.folderPath}
              </p>
              <p>
                <strong>Total files scanned:</strong> {result.totalFiles}
              </p>
              <p>
                <strong>Photos processed:</strong> {result.processedFiles}
              </p>
              <p
                style={{
                  fontSize: '1.25rem',
                  color: '#0066cc',
                  fontWeight: 'bold',
                }}
              >
                Photos with location: {result.photosWithLocation}
              </p>
              {result.errors?.length > 0 && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer' }}>{result.errors.length} errors</summary>
                  <ul style={{ fontSize: '0.875rem', color: '#666' }}>
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
