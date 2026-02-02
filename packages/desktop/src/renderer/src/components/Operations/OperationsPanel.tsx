import { useState } from 'react';
import type { Photo, DryRunResult, OperationType } from '@placemark/core';
import { DryRunPreview } from './DryRunPreview';
import { SourceSummary } from './SourceSummary';
import { useTheme } from '../../hooks/useTheme';

interface OperationsPanelProps {
  selectedPhotos: Photo[];
  onClose: () => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  // We can use the hook inside, no need to pass theme if we use useTheme
}

export function OperationsPanel({ selectedPhotos, onClose, toast }: OperationsPanelProps) {
  const { colors, theme } = useTheme();
  const [destPath, setDestPath] = useState<string | null>(null);
  const [opType, setOpType] = useState<OperationType>('copy');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectDest = async () => {
    try {
      const path = await window.api.ops.selectDestination();
      if (path) {
        setDestPath(path);
        setDryRunResult(null); // Reset preview when path changes
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to select destination');
    }
  };

  const handlePreview = async () => {
    if (!destPath || selectedPhotos.length === 0) return;

    setLoading(true);
    try {
      const result = await window.api.ops.generateDryRun(selectedPhotos, destPath, opType);
      setDryRunResult(result);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    toast.info('Execution coming in Phase 5!');
  };

  const totalSize = selectedPhotos.reduce((acc, p) => acc + p.fileSize, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  // Styles
  const styles = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
    },
    modal: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      borderRadius: '8px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '56rem', // 4xl
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    header: {
      padding: '1rem',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1.5rem',
    },
    button: {
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
    },
    actionBtn: {
      padding: '0.5rem 1.5rem',
      borderRadius: '4px',
      fontWeight: 500,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            File Operations ({selectedPhotos.length} items, {totalSizeMB} MB)
          </h2>
          <button
            onClick={onClose}
            style={{
              ...styles.button,
              background: 'none',
              color: colors.textSecondary,
              fontSize: '1.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Source Summary (New) */}
          {!dryRunResult && <SourceSummary photos={selectedPhotos} />}

          {/* Step 1: Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontWeight: 500 }}>Operation:</label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="opType"
                  checked={opType === 'copy'}
                  onChange={() => {
                    setOpType('copy');
                    setDryRunResult(null);
                  }}
                />
                <span>Copy</span>
              </label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="opType"
                  checked={opType === 'move'}
                  onChange={() => {
                    setOpType('move');
                    setDryRunResult(null);
                  }}
                />
                <span>Move</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={handleSelectDest}
                style={{
                  ...styles.button,
                  backgroundColor: colors.border,
                  color: colors.textPrimary,
                }}
              >
                Select Destination
              </button>
              <div
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {destPath || (
                  <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                    No folder selected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button: Preview */}
          {!dryRunResult && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handlePreview}
                disabled={!destPath || loading}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: !destPath || loading ? colors.textMuted : colors.primary,
                  cursor: !destPath || loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Analyzing...' : 'Preview Operation'}
              </button>
            </div>
          )}

          {/* Step 2: Preview Results */}
          {dryRunResult && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderTop: `1px solid ${colors.border}`,
                paddingTop: '1rem',
              }}
            >
              <DryRunPreview result={dryRunResult} colors={colors} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1rem',
                }}
              >
                <button
                  onClick={() => setDryRunResult(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Modify Settings
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={onClose}
                    style={{
                      ...styles.button,
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: '#6b7280', // Gray
                      cursor: 'not-allowed',
                      opacity: 0.7,
                    }}
                    disabled={true}
                    title="File operations are coming in v0.4.0"
                  >
                    Execute (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
