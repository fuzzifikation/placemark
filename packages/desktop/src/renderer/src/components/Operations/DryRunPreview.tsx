import type { DryRunResult, FileOperation } from '@placemark/core';
import type { ThemeColors } from '../../theme';

interface DryRunPreviewProps {
  result: DryRunResult;
  colors: ThemeColors;
}

export function DryRunPreview({ result, colors }: DryRunPreviewProps) {
  const { summary, operations } = result;

  const totalMB = (summary.totalSize / (1024 * 1024)).toFixed(1);

  // Group operations by source folder
  const groupByFolder = (ops: FileOperation[]) => {
    const groups: { [folder: string]: FileOperation[] } = {};
    ops.forEach((op) => {
      // Extract folder path (everything before the last separator)
      const separator = op.sourcePath.includes('\\') ? '\\' : '/';
      const folder =
        op.sourcePath.substring(0, op.sourcePath.lastIndexOf(separator)) || op.sourcePath;
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(op);
    });
    return groups;
  };

  const folderGroups = groupByFolder(operations);

  const handleShowInFolder = async (_folderPath: string, filePaths: string[]) => {
    try {
      await window.api.photos.showMultipleInFolder(filePaths);
    } catch (error) {
      console.error('Failed to show files in folder:', error);
      // Could show a toast here, but for now just log
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)', // Blue
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ color: colors.textPrimary }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{summary.totalFiles}</span>{' '}
          files
          <span style={{ margin: '0 0.5rem', color: colors.textMuted }}>|</span>
          <span style={{ fontWeight: 'bold' }}>{totalMB} MB</span>
        </div>
        {summary.warnings.length > 0 && (
          <div style={{ color: '#d97706', fontWeight: 500 }}>
            ⚠ {summary.warnings.length} issues found
          </div>
        )}
      </div>

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
          maxHeight: '20rem',
          overflowY: 'auto',
        }}
      >
        {Object.entries(folderGroups).map(([folder, ops]) => (
          <div
            key={folder}
            style={{
              padding: '1rem',
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    fontSize: '0.875rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  📁 {folder.split(/[/\\]/).pop() || folder}
                </div>
                <div
                  style={{
                    color: colors.textMuted,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                  title={folder}
                >
                  {folder.length > 50 ? '...' + folder.slice(-47) : folder}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    color: colors.textSecondary,
                    fontSize: '0.875rem',
                  }}
                >
                  {ops.length} file{ops.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() =>
                    handleShowInFolder(
                      folder,
                      ops.map((op) => op.sourcePath)
                    )
                  }
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    opacity: 0.8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                  title="Show selected files in folder"
                >
                  📂 Show
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {ops.slice(0, 5).map((op) => (
                <span
                  key={op.id}
                  style={{
                    fontSize: '0.75rem',
                    color: colors.textSecondary,
                    backgroundColor: colors.surfaceHover,
                    padding: '0.125rem 0.25rem',
                    borderRadius: '3px',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={op.sourcePath.split(/[/\\]/).pop()}
                >
                  {op.sourcePath.split(/[/\\]/).pop()}
                </span>
              ))}
              {ops.length > 5 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: colors.textMuted,
                    padding: '0.125rem 0.25rem',
                  }}
                >
                  +{ops.length - 5} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {summary.warnings.length > 0 && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fffbeb',
            color: '#92400e',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          <strong>Warnings:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
            {summary.warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {summary.warnings.length > 5 && <li>...and {summary.warnings.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
