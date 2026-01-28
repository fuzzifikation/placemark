import type { DryRunResult, FileOperation } from '@placemark/core';
import type { ThemeColors } from '../../theme';

interface DryRunPreviewProps {
  result: DryRunResult;
  colors: ThemeColors;
}

export function DryRunPreview({ result, colors }: DryRunPreviewProps) {
  const { summary, operations } = result;
  
  const totalMB = (summary.totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ 
        padding: '1rem', 
        backgroundColor: 'rgba(59, 130, 246, 0.1)', // Blue 
        borderRadius: '8px',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <div style={{ color: colors.textPrimary }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{summary.totalFiles}</span> files 
          <span style={{ margin: '0 0.5rem', color: colors.textMuted }}>|</span>
          <span style={{ fontWeight: 'bold' }}>{totalMB} MB</span>
        </div>
        {summary.warnings.length > 0 && (
          <div style={{ color: '#d97706', fontWeight: 500 }}>
            ⚠ {summary.warnings.length} issues found
          </div>
        )}
      </div>

      <div style={{ 
        border: `1px solid ${colors.border}`, 
        borderRadius: '6px', 
        maxHeight: '20rem', 
        overflowY: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: colors.surfaceHover }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem', color: colors.textSecondary }}>Source</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', color: colors.textSecondary }}>Destination</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', color: colors.textSecondary }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ padding: '0.75rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.textPrimary }} title={op.sourcePath}>
                   {/* .../filename.ext */}
                  {op.sourcePath.length > 30 ? '...' + op.sourcePath.slice(-30) : op.sourcePath}
                </td>
                <td style={{ padding: '0.75rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.textPrimary }} title={op.destPath}>
                  {op.destPath.length > 30 ? '...' + op.destPath.slice(-30) : op.destPath}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <StatusBadge op={op} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary.warnings.length > 0 && (
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#fffbeb', 
          color: '#92400e', 
          borderRadius: '4px', 
          fontSize: '0.875rem' 
        }}>
          <strong>Warnings:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
            {summary.warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {summary.warnings.length > 5 && (
              <li>...and {summary.warnings.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ op }: { op: FileOperation }) {
  if (op.error) {
    return (
      <span style={{ 
        padding: '0.125rem 0.5rem', 
        borderRadius: '9999px', 
        fontSize: '0.75rem', 
        fontWeight: 500, 
        backgroundColor: '#fee2e2', 
        color: '#991b1b' 
      }}>
        {op.error}
      </span>
    );
  }
  return (
    <span style={{ 
      padding: '0.125rem 0.5rem', 
      borderRadius: '9999px', 
      fontSize: '0.75rem', 
      fontWeight: 500, 
      backgroundColor: '#d1fae5', 
      color: '#065f46' 
    }}>
      Ready
    </span>
  );
}
