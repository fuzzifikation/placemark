import type { DryRunResult, FileOperation } from '@placemark/core';
import type { ThemeColors } from '../../theme';
import { formatBytes } from '../../utils/formatLocale';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../../constants/ui';

interface DryRunPreviewProps {
  result: DryRunResult;
  colors: ThemeColors;
}

export function DryRunPreview({ result, colors }: DryRunPreviewProps) {
  const { summary, operations } = result;

  const totalFormatted = formatBytes(summary.totalSize);

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

  const handleShowInFolder = async (filePaths: string[]) => {
    try {
      await window.api.photos.showMultipleInFolder(filePaths);
    } catch {
      // Non-critical UI action — silently degrade
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.LG }}>
      <div
        style={{
          padding: SPACING.LG,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: BORDER_RADIUS.MD,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ color: colors.textPrimary }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{summary.totalFiles}</span>{' '}
          files
          <span style={{ margin: `0 ${SPACING.SM}`, color: colors.textMuted }}>|</span>
          <span style={{ fontWeight: 'bold' }}>{totalFormatted}</span>
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
              padding: SPACING.LG,
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: SPACING.SM,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    fontSize: FONT_SIZE.SM,
                    marginBottom: SPACING.XS,
                  }}
                >
                  📁 {folder.split(/[/\\]/).pop() || folder}
                </div>
                <div
                  style={{
                    fontSize: FONT_SIZE.XS,
                    fontFamily: 'monospace',
                  }}
                  title={folder}
                >
                  {folder.length > 50 ? '...' + folder.slice(-47) : folder}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
                <span
                  style={{
                    fontSize: FONT_SIZE.SM,
                  }}
                >
                  {ops.length} file{ops.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => handleShowInFolder(ops.map((op) => op.sourcePath))}
                  style={{
                    padding: `${SPACING.XS} ${SPACING.SM}`,
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: BORDER_RADIUS.SM,
                    cursor: 'pointer',
                    fontSize: FONT_SIZE.XS,
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.XS }}>
              {ops.slice(0, 5).map((op) => (
                <span
                  key={op.id}
                  style={{
                    fontSize: FONT_SIZE.XS,
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
                    fontSize: FONT_SIZE.XS,
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
            padding: SPACING.MD,
            backgroundColor: `${colors.warning}18`,
            color: colors.warning,
            borderRadius: BORDER_RADIUS.SM,
            fontSize: FONT_SIZE.SM,
            border: `1px solid ${colors.warning}40`,
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
