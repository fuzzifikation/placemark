/**
 * LibraryStatsPanel — slide-in panel showing aggregated photo library statistics.
 * Mirrors the Settings panel pattern (right-side overlay, themed, glassmorphic).
 */

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { PhotoIssueEntry } from '../types/preload';
import { type Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  formatNumber,
  formatDateWithOptions,
  formatMimeLabel,
  formatBytes,
  timeAgo,
  formatSpan,
} from '../utils/formatLocale';
import { FONT_FAMILY, BORDER_RADIUS, SPACING, FONT_SIZE, getGlassStyle } from '../constants/ui';
import { useLibraryStats } from '../hooks/useLibraryStats';

const CAMERAS_INITIAL_VISIBLE = 5;

interface LibraryStatsPanelProps {
  onClose: () => void;
  theme: Theme;
  isScanning?: boolean;
  activeFilters?: { mimeTypes: Set<string>; cameras: Set<string> };
  onToggleMimeType?: (mimeType: string) => void;
  onToggleCamera?: (cameraKey: string) => void;
  glassBlur?: number;
  glassSurfaceOpacity?: number;
}

export function LibraryStatsPanel({
  onClose,
  theme,
  isScanning,
  activeFilters,
  onToggleMimeType,
  onToggleCamera,
  glassBlur = 12,
  glassSurfaceOpacity = 70,
}: LibraryStatsPanelProps) {
  const colors = useThemeColors(theme);
  const { stats, dbStats, thumbStats, loading } = useLibraryStats(isScanning);
  const [showAllCameras, setShowAllCameras] = useState(false);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [issuePhotos, setIssuePhotos] = useState<PhotoIssueEntry[] | null>(null);
  const [issuePhotosLoading, setIssuePhotosLoading] = useState(false);

  // Reset issue list when scan completes so it refetches on next expand
  useEffect(() => {
    if (!isScanning) setIssuePhotos(null);
  }, [isScanning]);

  // Load issue detail list when expanded
  useEffect(() => {
    if (!issuesExpanded || issuePhotos !== null) return;
    setIssuePhotosLoading(true);
    window.api.photos
      .getPhotosWithIssues()
      .then(setIssuePhotos)
      .finally(() => setIssuePhotosLoading(false));
  }, [issuesExpanded, issuePhotos]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    padding: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    border: `1px solid ${colors.border}`,
    marginBottom: SPACING.LG,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: FONT_SIZE.XS,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: SPACING.SM,
  };

  const statRow = (label: string, value: string, highlight?: boolean): React.ReactNode => (
    <div
      key={label}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${SPACING.XS} 0`,
      }}
    >
      <span style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary }}>{label}</span>
      <span
        style={{
          fontSize: FONT_SIZE.SM,
          fontWeight: 600,
          color: highlight ? colors.primary : colors.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  );

  const clickableStatRow = (label: string, value: string, photoId: number): React.ReactNode => (
    <div
      key={label}
      title="Click to open in system viewer"
      onClick={() => window.api.photos.openInViewer(photoId)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${SPACING.XS} 0`,
        cursor: 'pointer',
        borderRadius: BORDER_RADIUS.SM,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.surface;
        (e.currentTarget as HTMLDivElement).style.outline = `1px solid ${colors.border}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLDivElement).style.outline = 'none';
      }}
    >
      <span style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary }}>{label}</span>
      <span
        style={{
          fontSize: FONT_SIZE.SM,
          fontWeight: 600,
          color: colors.primary,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: '2px',
        }}
      >
        {value}
      </span>
    </div>
  );

  // Build max counts for proportional bar widths
  const maxFormatCount = stats?.formatBreakdown[0]?.count ?? 1;
  const maxCameraCount = stats?.cameraBreakdown[0]?.count ?? 1;

  // Shared row for format/camera breakdown bars
  const breakdownRow = (
    key: string,
    label: string,
    count: number,
    maxCount: number,
    isActive: boolean,
    onClick: (() => void) | undefined,
    labelWidth: string
  ) => (
    <div
      key={key}
      onClick={onClick}
      title={onClick ? (isActive ? 'Remove filter' : 'Filter') : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.SM,
        padding: `${SPACING.XS} ${SPACING.SM}`,
        borderRadius: BORDER_RADIUS.SM,
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: isActive ? `${colors.primary}22` : 'transparent',
        outline: isActive ? `1px solid ${colors.primary}66` : 'none',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.borderLight;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = isActive
          ? `${colors.primary}22`
          : 'transparent';
      }}
    >
      <span
        style={{
          fontSize: FONT_SIZE.SM,
          color: isActive ? colors.primary : colors.textSecondary,
          width: labelWidth,
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: isActive ? 600 : 400,
        }}
        title={label}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: '8px',
          backgroundColor: colors.borderLight,
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(count / maxCount) * 100}%`,
            height: '100%',
            backgroundColor: isActive ? colors.primary : colors.textMuted,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
            minWidth: '4px',
          }}
        />
      </div>
      <span
        style={{
          fontSize: FONT_SIZE.XS,
          fontWeight: 600,
          color: isActive ? colors.primary : colors.textPrimary,
          minWidth: '40px',
          textAlign: 'right',
        }}
      >
        {formatNumber(count)}
      </span>
    </div>
  );

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...getGlassStyle(colors, glassBlur, glassSurfaceOpacity),
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `${SPACING.LG} ${SPACING.XL}`,
          borderBottom: `1px solid ${colors.glassBorder}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
          <span style={{ fontSize: '1.25rem' }}>📊</span>
          <h2
            style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Library Statistics
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: SPACING.XS,
            borderRadius: BORDER_RADIUS.SM,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: SPACING.XL,
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: colors.textMuted,
              fontSize: FONT_SIZE.SM,
            }}
          >
            Loading statistics…
          </div>
        ) : !stats || stats.totalPhotos === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: colors.textMuted,
              fontSize: FONT_SIZE.SM,
              textAlign: 'center',
              gap: SPACING.SM,
            }}
          >
            <span style={{ fontSize: '2rem' }}>📷</span>
            No photos in library yet. Scan a folder to get started.
          </div>
        ) : (
          <>
            {/* Overview */}
            <div style={cardStyle}>
              <div style={labelStyle}>Overview</div>
              {statRow('Total photos', formatNumber(stats.totalPhotos))}
              {statRow(
                '📍 With GPS location',
                `${formatNumber(stats.photosWithLocation)} (${Math.round((stats.photosWithLocation / stats.totalPhotos) * 100)}%)`,
                true
              )}
              {statRow('Without GPS', formatNumber(stats.totalPhotos - stats.photosWithLocation))}
              {statRow(
                '📅 With date',
                `${formatNumber(stats.photosWithTimestamp)} (${Math.round((stats.photosWithTimestamp / stats.totalPhotos) * 100)}%)`
              )}
              {statRow('Without date', formatNumber(stats.totalPhotos - stats.photosWithTimestamp))}
            </div>
            {/* Library Health */}
            <div style={cardStyle}>
              <div style={labelStyle}>Library Health</div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `${SPACING.XS} 0`,
                  cursor: stats.photosWithIssues > 0 ? 'pointer' : 'default',
                }}
                onClick={() => stats.photosWithIssues > 0 && setIssuesExpanded((v) => !v)}
              >
                <span style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary }}>
                  Metadata issues
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.XS }}>
                  <span
                    style={{
                      fontSize: FONT_SIZE.SM,
                      fontWeight: 600,
                      color: stats.photosWithIssues > 0 ? '#f59e0b' : colors.textMuted,
                    }}
                  >
                    {stats.photosWithIssues > 0
                      ? `${formatNumber(stats.photosWithIssues)} photo${stats.photosWithIssues !== 1 ? 's' : ''}`
                      : 'None'}
                  </span>
                  {stats.photosWithIssues > 0 &&
                    (issuesExpanded ? (
                      <ChevronDown size={14} color={colors.textMuted} />
                    ) : (
                      <ChevronRight size={14} color={colors.textMuted} />
                    ))}
                </span>
              </div>

              {issuesExpanded && (
                <div style={{ marginTop: SPACING.SM }}>
                  {issuePhotosLoading && (
                    <p style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted, margin: 0 }}>
                      Loading…
                    </p>
                  )}
                  {!issuePhotosLoading &&
                    issuePhotos &&
                    issuePhotos.map((entry) => {
                      const filename =
                        entry.path.replace(/\\/g, '/').split('/').pop() ?? entry.path;
                      const issueLabels = entry.issueCodes.map((code) => {
                        if (code === 'gps_zero') return 'GPS (0,0)';
                        if (code === 'gps_nan') return 'GPS invalid';
                        if (code === 'future_timestamp') return 'Future date';
                        if (code === 'invalid_timestamp') return 'Invalid date';
                        return code;
                      });
                      return (
                        <div
                          key={entry.photoId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: `${SPACING.XS} 0`,
                            borderTop: `1px solid ${colors.borderLight}`,
                            gap: SPACING.SM,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: FONT_SIZE.SM,
                                color: colors.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={entry.path}
                            >
                              {filename}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                gap: SPACING.XS,
                                marginTop: '2px',
                                flexWrap: 'wrap',
                              }}
                            >
                              {issueLabels.map((label) => (
                                <span
                                  key={label}
                                  style={{
                                    fontSize: FONT_SIZE.XS,
                                    color: '#f59e0b',
                                    backgroundColor: '#f59e0b18',
                                    border: '1px solid #f59e0b40',
                                    borderRadius: BORDER_RADIUS.SM,
                                    padding: '1px 5px',
                                  }}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => window.api.photos.showInFolder(entry.photoId)}
                            title="Show in folder"
                            style={{
                              flexShrink: 0,
                              background: 'none',
                              border: `1px solid ${colors.border}`,
                              borderRadius: BORDER_RADIUS.SM,
                              cursor: 'pointer',
                              padding: '3px 6px',
                              color: colors.textSecondary,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <FolderOpen size={13} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            {/* File Formats */}
            <div style={cardStyle}>
              <div style={labelStyle}>File Formats</div>
              {stats.formatBreakdown.map((fmt) => {
                const isActive = activeFilters?.mimeTypes.has(fmt.mimeType) ?? false;
                return breakdownRow(
                  fmt.mimeType,
                  formatMimeLabel(fmt.mimeType),
                  fmt.count,
                  maxFormatCount,
                  isActive,
                  onToggleMimeType ? () => onToggleMimeType(fmt.mimeType) : undefined,
                  '120px'
                );
              })}
            </div>

            {/* Cameras */}
            {stats.cameraBreakdown.length > 0 && (
              <div style={cardStyle}>
                <div style={labelStyle}>Cameras</div>
                {(showAllCameras
                  ? stats.cameraBreakdown
                  : stats.cameraBreakdown.slice(0, CAMERAS_INITIAL_VISIBLE)
                ).map((cam) => {
                  const cameraKey = `${cam.make}|${cam.model}`;
                  const isActive = activeFilters?.cameras.has(cameraKey) ?? false;
                  const label =
                    cam.make === cam.model || cam.make === 'Unknown'
                      ? cam.model
                      : `${cam.make} ${cam.model}`;
                  return breakdownRow(
                    cameraKey,
                    label,
                    cam.count,
                    maxCameraCount,
                    isActive,
                    () => onToggleCamera?.(cameraKey),
                    '140px'
                  );
                })}
                {stats.cameraBreakdown.length > CAMERAS_INITIAL_VISIBLE && (
                  <button
                    onClick={() => setShowAllCameras((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.primary,
                      fontSize: FONT_SIZE.XS,
                      padding: `${SPACING.XS} 0`,
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {showAllCameras
                      ? 'Show fewer'
                      : `Show all ${stats.cameraBreakdown.length} cameras`}
                  </button>
                )}
              </div>
            )}

            {/* Date Range */}
            {stats.minTimestamp && stats.maxTimestamp && (
              <div style={cardStyle}>
                <div style={labelStyle}>Date Range</div>
                {stats.oldestPhotoId != null
                  ? clickableStatRow(
                      'Oldest photo',
                      formatDateWithOptions(stats.minTimestamp, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                      stats.oldestPhotoId
                    )
                  : statRow(
                      'Oldest photo',
                      formatDateWithOptions(stats.minTimestamp, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    )}
                {stats.newestPhotoId != null
                  ? clickableStatRow(
                      'Newest photo',
                      formatDateWithOptions(stats.maxTimestamp, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                      stats.newestPhotoId
                    )
                  : statRow(
                      'Newest photo',
                      formatDateWithOptions(stats.maxTimestamp, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    )}
                {statRow('Span', formatSpan(stats.maxTimestamp - stats.minTimestamp))}
              </div>
            )}

            {/* Storage */}
            <div style={cardStyle}>
              <div style={labelStyle}>Storage</div>
              {statRow('All photos size', formatBytes(stats.totalFileSizeBytes))}
              {statRow('Avg photo size', formatBytes(stats.avgFileSizeBytes))}
              {dbStats && statRow('Photos DB', `${dbStats.photosDbSizeMB.toFixed(1)} MB`)}
              {dbStats && statRow('Thumbnails DB', `${dbStats.thumbnailsDbSizeMB.toFixed(1)} MB`)}
              {thumbStats &&
                statRow(
                  'Cached thumbnails',
                  `${formatNumber(thumbStats.thumbnailCount)} (${thumbStats.totalSizeMB.toFixed(1)} MB)`
                )}
            </div>

            {/* Last Import */}
            {stats.lastImportSummary && (
              <div style={cardStyle}>
                <div style={labelStyle}>Last Import</div>
                {statRow(
                  'Source',
                  stats.lastImportSummary.source === 'onedrive' ? 'OneDrive' : 'Local folder'
                )}
                {statRow('Processed', formatNumber(stats.lastImportSummary.scanned))}
                {statRow('Imported', formatNumber(stats.lastImportSummary.imported))}
                {stats.lastImportSummary.source === 'onedrive' &&
                  statRow('Duplicates skipped', formatNumber(stats.lastImportSummary.duplicates))}
                {statRow('Completed', timeAgo(stats.lastImportSummary.completedAt))}
              </div>
            )}

            {/* Last Scan */}
            {stats.lastScannedAt && (
              <div
                style={{
                  fontSize: FONT_SIZE.XS,
                  color: colors.textMuted,
                  textAlign: 'center',
                  paddingTop: SPACING.SM,
                }}
              >
                Last scanned {timeAgo(stats.lastScannedAt)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
