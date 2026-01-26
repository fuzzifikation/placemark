/**
 * Settings component - configure app parameters
 */

import { useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export interface AppSettings {
  // Map Clustering
  clusterRadius: number; // 10-100 pixels
  clusterMaxZoom: number; // 10-20 zoom level

  // Map Display
  mapMaxZoom: number; // 10-20 - maximum zoom when auto-fitting
  mapPadding: number; // 20-100 pixels - padding around markers
  mapTransitionDuration: number; // 0-1000 milliseconds

  // Timeline
  timelineUpdateInterval: number; // 50-500 milliseconds - how often map updates during playback
  autoZoomDuringPlay: boolean; // whether map should auto-fit to photos during timeline playback
}

const DEFAULT_SETTINGS: AppSettings = {
  // Map Clustering
  clusterRadius: 30,
  clusterMaxZoom: 16,

  // Map Display
  mapMaxZoom: 15,
  mapPadding: 50,
  mapTransitionDuration: 200,

  // Timeline
  timelineUpdateInterval: 100,
  autoZoomDuringPlay: true,
};

export function Settings({ onClose, onSettingsChange }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('placemark-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [expandedSections, setExpandedSections] = useState<{
    clustering: boolean;
    display: boolean;
    timeline: boolean;
  }>({
    clustering: true,
    display: true,
    timeline: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // Save to localStorage whenever settings change
    localStorage.setItem('placemark-settings', JSON.stringify(settings));
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          minWidth: '400px',
          maxWidth: '90%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {/* Settings sections */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {/* Map Clustering */}
          <section style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
            <h3
              onClick={() => toggleSection('clustering')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{expandedSections.clustering ? '▼' : '▶'}</span>
              Map Clustering
            </h3>

            {expandedSections.clustering && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Cluster Radius */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: '#666' }}>Cluster Radius</label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {settings.clusterRadius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.clusterRadius}
                    onChange={(e) =>
                      setSettings({ ...settings, clusterRadius: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>More markers (10)</span>
                    <span>Fewer markers (100)</span>
                  </div>
                </div>

                {/* Cluster Max Zoom */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: '#666' }}>
                      Stop Clustering At Zoom
                    </label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {settings.clusterMaxZoom}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="1"
                    value={settings.clusterMaxZoom}
                    onChange={(e) =>
                      setSettings({ ...settings, clusterMaxZoom: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>Earlier (10)</span>
                    <span>Later (20)</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Map Display */}
          <section style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
            <h3
              onClick={() => toggleSection('display')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{expandedSections.display ? '▼' : '▶'}</span>
              Map Display
            </h3>

            {expandedSections.display && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Max Zoom */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: '#666' }}>
                      Maximum Zoom Level
                    </label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {settings.mapMaxZoom}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="1"
                    value={settings.mapMaxZoom}
                    onChange={(e) =>
                      setSettings({ ...settings, mapMaxZoom: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>Zoomed out (10)</span>
                    <span>Zoomed in (20)</span>
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: '#666' }}>Map Padding</label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {settings.mapPadding}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={settings.mapPadding}
                    onChange={(e) =>
                      setSettings({ ...settings, mapPadding: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>Tight (20)</span>
                    <span>Loose (100)</span>
                  </div>
                </div>

                {/* Transition Duration */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: '#666' }}>Transition Speed</label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {settings.mapTransitionDuration}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={settings.mapTransitionDuration}
                    onChange={(e) =>
                      setSettings({ ...settings, mapTransitionDuration: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>Instant (0)</span>
                    <span>Slow (1000)</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Timeline */}
          <section>
            <h3
              onClick={() => toggleSection('timeline')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{expandedSections.timeline ? '▼' : '▶'}</span>
              Timeline
            </h3>

            {expandedSections.timeline && (
              <div>
                {/* Update Interval */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: '#666' }}>Update Frequency</label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {settings.timelineUpdateInterval}ms (
                      {Math.round(1000 / settings.timelineUpdateInterval)}/sec)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="50"
                    value={settings.timelineUpdateInterval}
                    onChange={(e) =>
                      setSettings({ ...settings, timelineUpdateInterval: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>Frequent/High CPU (50)</span>
                    <span>Infrequent/Low CPU (500)</span>
                  </div>
                </div>

                {/* Auto Zoom During Play */}
                <div style={{ marginTop: '1rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#666',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings.autoZoomDuringPlay}
                      onChange={(e) =>
                        setSettings({ ...settings, autoZoomDuringPlay: e.target.checked })
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    Auto-fit map during playback
                  </label>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                      marginLeft: '1.5rem',
                    }}
                  >
                    Map will follow your journey as the timeline plays
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={handleReset}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
