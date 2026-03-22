/**
 * ScanOverlay - Full-screen blocking overlay for folder scanning.
 * Shown automatically when the library is empty, and on demand via the Scan button.
 * Blocks all other UI while a scan is in progress.
 */

import { Cloud, FolderOpen, StopCircle, X } from 'lucide-react';
import { useState } from 'react';
import type { OneDriveFolderItem, ScanProgress } from '../types/preload';
import type { ThemeColors } from '../theme';
import {
  BORDER_RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  Z_INDEX,
  getGlassStyle,
} from '../constants/ui';
import { OneDriveFolderBrowser } from './OneDriveFolderBrowser';

interface ScanOverlayProps {
  hasPhotos: boolean; // true if library already has photos (enables Cancel)
  scanning: boolean;
  scanProgress: ScanProgress | null;
  includeSubdirectories: boolean;
  onIncludeSubdirectoriesChange: (value: boolean) => void;
  onScan: () => void; // Triggers native folder dialog + scan
  onOneDriveSelect: (folder: OneDriveFolderItem) => void;
  onAbort: () => void; // Requests scan abort
  onClose: () => void; // Closes overlay (only available when hasPhotos && !scanning)
  colors: ThemeColors;
  glassBlur: number;
  glassSurfaceOpacity: number;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function ScanOverlay({
  hasPhotos,
  scanning,
  scanProgress,
  includeSubdirectories,
  onIncludeSubdirectoriesChange,
  onScan,
  onOneDriveSelect,
  onAbort,
  onClose,
  colors,
  glassBlur,
  glassSurfaceOpacity,
}: ScanOverlayProps) {
  const [sourceMode, setSourceMode] = useState<'local' | 'onedrive'>('local');
  const progressPercent = scanProgress
    ? Math.round(Math.min(100, (scanProgress.processed / Math.max(scanProgress.total, 1)) * 100))
    : 0;

  const currentFileName = scanProgress?.currentFile
    ? (scanProgress.currentFile.replace(/\\/g, '/').split('/').pop() ?? '')
    : '';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: Z_INDEX.SCAN_OVERLAY,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          ...getGlassStyle(colors, glassBlur + 8, glassSurfaceOpacity),
          backgroundColor: colors.surface,
          padding: SPACING.XXL,
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
        }}
      >
        {/* Close button — only shown when not scanning and library has photos */}
        {!scanning && hasPhotos && (
          <button
            onClick={onClose}
            title="Cancel"
            style={{
              position: 'absolute',
              top: SPACING.LG,
              right: SPACING.LG,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: colors.textMuted,
              border: 'none',
              borderRadius: BORDER_RADIUS.FULL,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Header: logo + title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.LG,
            marginBottom: SPACING.XL,
          }}
        >
          <img
            src="./icon.png"
            alt="Placemark"
            style={{ width: 48, height: 48, borderRadius: '8px', flexShrink: 0 }}
          />
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: FONT_SIZE.XL,
                fontWeight: FONT_WEIGHT.BOLD,
                color: colors.textPrimary,
                letterSpacing: '-0.025em',
              }}
            >
              Placemark
            </h2>
            <p style={{ margin: 0, fontSize: FONT_SIZE.SM, color: colors.textSecondary }}>
              Privacy-first, local-first photo organizer
            </p>
          </div>
        </div>

        {!scanning && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: SPACING.SM,
              marginBottom: SPACING.XL,
            }}
          >
            <button
              onClick={() => setSourceMode('local')}
              style={{
                padding: `${SPACING.SM} ${SPACING.MD}`,
                fontSize: FONT_SIZE.SM,
                fontWeight: FONT_WEIGHT.MEDIUM,
                backgroundColor: sourceMode === 'local' ? colors.primary : 'transparent',
                color: sourceMode === 'local' ? colors.buttonText : colors.textPrimary,
                border: sourceMode === 'local' ? 'none' : `1px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS.MD,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.SM,
              }}
            >
              <FolderOpen size={16} />
              Local Folder
            </button>
            <button
              onClick={() => setSourceMode('onedrive')}
              style={{
                padding: `${SPACING.SM} ${SPACING.MD}`,
                fontSize: FONT_SIZE.SM,
                fontWeight: FONT_WEIGHT.MEDIUM,
                backgroundColor: sourceMode === 'onedrive' ? colors.primary : 'transparent',
                color: sourceMode === 'onedrive' ? colors.buttonText : colors.textPrimary,
                border: sourceMode === 'onedrive' ? 'none' : `1px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS.MD,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.SM,
              }}
            >
              <Cloud size={16} />
              OneDrive
            </button>
          </div>
        )}

        {!scanning ? (
          /* ── Pre-scan state ─────────────────────── */
          sourceMode === 'local' ? (
            <>
              <p
                style={{
                  margin: `0 0 ${SPACING.XL}`,
                  fontSize: FONT_SIZE.SM,
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {hasPhotos
                  ? 'Select a folder to add more photos to your library.'
                  : 'Select a folder to scan for photos with GPS location data.'}
              </p>

              {/* Subfolder toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING.LG,
                  cursor: 'pointer',
                  marginBottom: SPACING.XL,
                  userSelect: 'none',
                }}
                onClick={() => onIncludeSubdirectoriesChange(!includeSubdirectories)}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    backgroundColor: includeSubdirectories ? colors.primary : colors.border,
                    borderRadius: '12px',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: includeSubdirectories ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
                <span style={{ fontSize: FONT_SIZE.SM, color: colors.textPrimary }}>
                  Include subdirectories
                </span>
              </label>

              {/* Scan button */}
              <button
                onClick={onScan}
                style={{
                  width: '100%',
                  padding: `${SPACING.MD} ${SPACING.LG}`,
                  fontSize: FONT_SIZE.SM,
                  fontWeight: FONT_WEIGHT.MEDIUM,
                  backgroundColor: colors.primary,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: BORDER_RADIUS.LG,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.SM,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                }}
              >
                <FolderOpen size={16} />
                Select Folder &amp; Scan
              </button>
            </>
          ) : (
            <OneDriveFolderBrowser colors={colors} onSelectFolder={onOneDriveSelect} />
          )
        ) : (
          /* ── Scanning in progress ───────────────── */
          <>
            {/* Progress bar */}
            <div style={{ marginBottom: SPACING.LG }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: SPACING.SM,
                }}
              >
                <span style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary }}>
                  Scanning…
                </span>
                <span
                  style={{
                    fontSize: FONT_SIZE.SM,
                    fontWeight: FONT_WEIGHT.MEDIUM,
                    color: colors.textPrimary,
                  }}
                >
                  {progressPercent}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: colors.border,
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: colors.primary,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Count + ETA */}
            <p
              style={{
                margin: `0 0 ${SPACING.SM}`,
                fontSize: FONT_SIZE.SM,
                color: colors.textSecondary,
              }}
            >
              {scanProgress?.processed ?? 0} of {scanProgress?.total ?? 0} files
              {scanProgress?.eta !== undefined && scanProgress.eta > 0 && (
                <span style={{ marginLeft: SPACING.LG, color: colors.textMuted }}>
                  ~{formatEta(scanProgress.eta)} remaining
                </span>
              )}
            </p>

            {/* Current filename (truncated) */}
            <p
              style={{
                margin: `0 0 ${SPACING.XL}`,
                fontSize: FONT_SIZE.XS,
                color: colors.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={scanProgress?.currentFile}
            >
              {currentFileName}
            </p>

            {/* Abort button */}
            <button
              onClick={onAbort}
              style={{
                width: '100%',
                padding: `${SPACING.MD} ${SPACING.LG}`,
                fontSize: FONT_SIZE.SM,
                fontWeight: FONT_WEIGHT.MEDIUM,
                backgroundColor: 'transparent',
                color: colors.error,
                border: `1px solid ${colors.error}`,
                borderRadius: BORDER_RADIUS.LG,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.SM,
              }}
            >
              <StopCircle size={16} />
              Abort Scan
            </button>
          </>
        )}
      </div>
    </div>
  );
}
