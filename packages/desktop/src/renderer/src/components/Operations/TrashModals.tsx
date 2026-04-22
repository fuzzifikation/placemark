import type { ThemeColors } from '../../theme';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, Z_INDEX } from '../../constants/ui';

// Shared overlay + card styles for both modals
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: Z_INDEX.MODAL + 1,
};

function cardStyle(colors: ThemeColors, maxWidth: string): React.CSSProperties {
  return {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.XL,
    maxWidth,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.LG,
  };
}

// ---------------------------------------------------------------------------
// TrashAcknowledgeModal — shown after execute when source files were trashed
// ---------------------------------------------------------------------------

interface TrashAcknowledgeModalProps {
  count: number;
  colors: ThemeColors;
  actionBtnStyle: React.CSSProperties;
  onClose: () => void;
}

export function TrashAcknowledgeModal({
  count,
  colors,
  actionBtnStyle,
  onClose,
}: TrashAcknowledgeModalProps) {
  return (
    <div style={overlayStyle}>
      <div style={cardStyle(colors, '420px')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.MD }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🗑️</span>
          <div>
            <div
              style={{
                fontWeight: FONT_WEIGHT.MEDIUM,
                fontSize: FONT_SIZE.MD,
                marginBottom: SPACING.SM,
              }}
            >
              Source files sent to Recycle Bin
            </div>
            <div style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary, lineHeight: 1.5 }}>
              <strong>{count}</strong> source file{count !== 1 ? 's were' : ' was'} sent to the{' '}
              <strong>OS Recycle Bin</strong> because {count !== 1 ? 'they were' : 'it was'} already
              present at the destination.
              <br />
              <br />
              You can reverse this by clicking <strong>Undo Batch</strong> — Placemark will guide
              you through restoring the files from the Recycle Bin.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...actionBtnStyle, backgroundColor: colors.primary }}>
            OK, I understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrashUndoModal — shown after undo when files need manual Recycle Bin restore
// ---------------------------------------------------------------------------

interface TrashUndoModalProps {
  count: number;
  isDeleteOp: boolean;
  colors: ThemeColors;
  buttonStyle: React.CSSProperties;
  actionBtnStyle: React.CSSProperties;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TrashUndoModal({
  count,
  isDeleteOp,
  colors,
  buttonStyle,
  actionBtnStyle,
  onCancel,
  onConfirm,
}: TrashUndoModalProps) {
  return (
    <div style={overlayStyle}>
      <div style={cardStyle(colors, '460px')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.MD }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>♻️</span>
          <div>
            <div
              style={{
                fontWeight: FONT_WEIGHT.MEDIUM,
                fontSize: FONT_SIZE.MD,
                marginBottom: SPACING.SM,
              }}
            >
              Manual step required
            </div>
            <div style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary, lineHeight: 1.6 }}>
              <strong>{count}</strong> file{count !== 1 ? 's were' : ' was'} sent to the{' '}
              <strong>OS Recycle Bin</strong> during this operation. Placemark cannot restore
              {count !== 1 ? ' them' : ' it'} automatically.
              <br />
              <br />
              {isDeleteOp ? (
                <>
                  Please open your <strong>OS Recycle Bin</strong>, restore{' '}
                  {count !== 1 ? `these ${count} files` : 'this file'} to their original location,
                  then click <strong>Done</strong>. After that, re-scan the original folder in
                  Placemark to see them again.
                </>
              ) : (
                <>
                  Please open your <strong>OS Recycle Bin</strong> and restore{' '}
                  {count !== 1 ? `these ${count} files` : 'this file'} to their original location,
                  then click <strong>Done</strong>.
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: SPACING.MD }}>
          <button
            onClick={onCancel}
            style={{
              ...buttonStyle,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ ...actionBtnStyle, backgroundColor: colors.primary }}
          >
            Done — files restored
          </button>
        </div>
      </div>
    </div>
  );
}
