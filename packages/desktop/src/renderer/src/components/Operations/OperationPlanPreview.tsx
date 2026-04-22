import { useMemo } from 'react';
import type { DryRunResult, FileOperation } from '@placemark/core';
import type { ThemeColors } from '../../theme';
import { formatBytes } from '../../utils/formatLocale';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../../constants/ui';

interface OperationPlanPreviewProps {
  result: DryRunResult;
  colors: ThemeColors;
}

function getParentDir(filePath: string): string {
  const separator = filePath.includes('\\') ? '\\' : '/';
  return filePath.substring(0, filePath.lastIndexOf(separator)) || filePath;
}

function normalizePath(p: string): string {
  return p.toLowerCase().replace(/\\/g, '/').replace(/\/$/, '');
}

export function OperationPlanPreview({ result, colors }: OperationPlanPreviewProps) {
  const { summary, operations } = result;

  const totalFormatted = formatBytes(summary.totalSize);

  // Tally operation statuses across the whole batch
  const pendingCount = operations.filter((op) => op.status === 'pending').length;
  const skippedCount = operations.filter((op) => op.status === 'skipped').length;
  const deleteSourceCount = operations.filter((op) => op.status === 'delete-source').length;
  const conflictCount = operations.filter((op) => op.status === 'conflict').length;

  // Derive destination folder from the first operation's destPath (not applicable for delete)
  const destFolder =
    operations.length > 0 && operations[0].destPath ? getParentDir(operations[0].destPath) : null;

  const folderGroups = useMemo(() => {
    const groups: { [folder: string]: FileOperation[] } = {};
    operations.forEach((op) => {
      const folder = getParentDir(op.sourcePath);
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(op);
    });
    return groups;
  }, [operations]);

  const handleShowInFolder = async (filePaths: string[]) => {
    try {
      await window.api.photos.showMultipleInFolder(filePaths);
    } catch {
      // Non-critical UI action — silently degrade
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.LG }}>
      {/* Status summary bar */}
      <div
        style={{
          padding: SPACING.LG,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: BORDER_RADIUS.MD,
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACING.MD,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.MD, alignItems: 'center' }}>
          {/* Pending */}
          <span style={{ color: colors.textPrimary }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{pendingCount}</span>{' '}
            <span style={{ color: colors.textSecondary }}>
              will{' '}
              {operations[0]?.type === 'delete'
                ? 'be deleted from folder(s) below'
                : operations[0]?.type === 'move'
                  ? 'move from folder(s) below'
                  : 'copy from folder(s) below'}
            </span>
          </span>

          {/* Skipped (copy) — only show when relevant */}
          {skippedCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                backgroundColor: `${colors.textMuted}20`,
                borderRadius: BORDER_RADIUS.SM,
                color: colors.textMuted,
                fontSize: FONT_SIZE.SM,
              }}
            >
              {skippedCount} already there — skip
            </span>
          )}

          {/* delete-source (move) — amber warning */}
          {deleteSourceCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                backgroundColor: `${colors.warning}18`,
                borderRadius: BORDER_RADIUS.SM,
                color: colors.warning,
                fontSize: FONT_SIZE.SM,
                fontWeight: 500,
              }}
            >
              🗑️ {deleteSourceCount} already at destination — source will be sent to Recycle Bin
            </span>
          )}

          {/* Conflicts — only show when relevant */}
          {conflictCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                backgroundColor: `${colors.error}18`,
                borderRadius: BORDER_RADIUS.SM,
                color: colors.error,
                fontSize: FONT_SIZE.SM,
                fontWeight: 500,
              }}
            >
              ⚠ {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} — blocks operation
            </span>
          )}
        </div>

        <span style={{ color: colors.textMuted, fontSize: FONT_SIZE.SM }}>{totalFormatted}</span>
      </div>

      {/* Per-source-folder breakdown */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
          maxHeight: '20rem',
          overflowY: 'auto',
        }}
      >
        {Object.entries(folderGroups).map(([folder, ops]) => {
          const folderPending = ops.filter((op) => op.status === 'pending').length;
          const folderSkipped = ops.filter((op) => op.status === 'skipped').length;
          const folderDeleteSource = ops.filter((op) => op.status === 'delete-source').length;
          const folderConflicts = ops.filter((op) => op.status === 'conflict').length;
          const isDestFolder =
            destFolder !== null && normalizePath(folder) === normalizePath(destFolder);

          return (
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
                    }}
                  >
                    📁 {folder.split(/[/\\]/).pop() || folder}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
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

              {/* Per-folder status line: counts first, path appended at end */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: SPACING.SM,
                  fontSize: FONT_SIZE.XS,
                  alignItems: 'center',
                }}
              >
                {isDestFolder && (
                  <span style={{ color: colors.warning, fontWeight: 500 }}>
                    ⚠ Source is destination folder
                  </span>
                )}
                {folderPending > 0 && (
                  <span style={{ color: colors.textSecondary }}>{folderPending} proceed</span>
                )}
                {folderSkipped > 0 && (
                  <span style={{ color: colors.textMuted }}>· {folderSkipped} already there</span>
                )}
                {folderDeleteSource > 0 && (
                  <span style={{ color: colors.warning, fontWeight: 500 }}>
                    · {folderDeleteSource} source{folderDeleteSource !== 1 ? 's' : ''} → Recycle Bin
                  </span>
                )}
                {folderConflicts > 0 && (
                  <span style={{ color: colors.error, fontWeight: 500 }}>
                    · {folderConflicts} conflict{folderConflicts !== 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ color: colors.textMuted, fontFamily: 'monospace' }} title={folder}>
                  from {folder.length > 60 ? '...' + folder.slice(-57) : folder}
                </span>
              </div>
            </div>
          );
        })}
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
