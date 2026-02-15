/**
 * LibraryStatsPanel — slide-in panel showing aggregated photo library statistics.
 * Mirrors the Settings panel pattern (right-side overlay, themed, glassmorphic).
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatNumber, formatDateWithOptions } from '../utils/formatLocale';
import { FONT_FAMILY, Z_INDEX, BORDER_RADIUS, SPACING, FONT_SIZE } from '../constants/ui';
import type { LibraryStats, DatabaseStats, ThumbnailStats } from '../types/preload';

/** Human-readable label for a MIME type */
function formatMimeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/heic': 'HEIC',
    'image/heif': 'HEIF',
    'image/tiff': 'TIFF',
    'image/gif': 'GIF',
    'image/avif': 'AVIF',
    'image/x-canon-cr2': 'CR2 (Canon)',
    'image/x-canon-cr3': 'CR3 (Canon)',
    'image/x-nikon-nef': 'NEF (Nikon)',
    'image/x-nikon-nrw': 'NRW (Nikon)',
    'image/x-sony-arw': 'ARW (Sony)',
    'image/x-adobe-dng': 'DNG',
    'image/x-fuji-raf': 'RAF (Fujifilm)',
    'image/x-olympus-orf': 'ORF (Olympus)',
    'image/x-panasonic-rw2': 'RW2 (Panasonic)',
    'image/x-pentax-pef': 'PEF (Pentax)',
    'image/x-samsung-srw': 'SRW (Samsung)',
    'image/x-leica-rwl': 'RWL (Leica)',
  };
  return labels[mimeType] ?? mimeType;
}

/** Format bytes as KB / MB / GB */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Human-readable relative time ("2 hours ago", "3 days ago") */
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

/** Format a duration in ms as a human-readable span (e.g. "2.3 years", "4 months", "12 days") */
function formatSpan(ms: number): string {
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) return 'same day';
  if (days < 31) {
    const d = Math.round(days);
    return `${d} day${d !== 1 ? 's' : ''}`;
  }
  const months = days / 30.44; // average days per month
  if (months < 12) {
    const m = Math.round(months);
    return `${m} month${m !== 1 ? 's' : ''}`;
  }
  const years = days / 365.25;
  if (years < 10) {
    return `${Math.round(years * 10) / 10} years`;
  }
  return `${Math.round(years)} years`;
}

interface LibraryStatsPanelProps {
  onClose: () => void;
  theme: Theme;
}

export function LibraryStatsPanel({ onClose, theme }: LibraryStatsPanelProps) {
  const colors = useThemeColors(theme);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [thumbStats, setThumbStats] = useState<ThumbnailStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [lib, db, thumb] = await Promise.all([
          window.api.photos.getLibraryStats(),
          window.api.photos.getDatabaseStats(),
          window.api.thumbnails.getStats(),
        ]);
        setStats(lib);
        setDbStats(db);
        setThumbStats(thumb);
      } catch (err) {
        console.error('Failed to load library stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  // Build format bar max for proportional widths
  const maxFormatCount = stats?.formatBreakdown[0]?.count ?? 1;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '380px',
        backgroundColor: colors.modalBackground,
        borderLeft: `1px solid ${colors.border}`,
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
        zIndex: Z_INDEX.MODAL,
        display: 'flex',
        flexDirection: 'column',
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
          borderBottom: `1px solid ${colors.border}`,
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

            {/* File Formats */}
            <div style={cardStyle}>
              <div style={labelStyle}>File Formats</div>
              {stats.formatBreakdown.map((fmt) => (
                <div
                  key={fmt.mimeType}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.SM,
                    padding: `${SPACING.XS} 0`,
                  }}
                >
                  <span
                    style={{
                      fontSize: FONT_SIZE.SM,
                      color: colors.textSecondary,
                      width: '120px',
                      flexShrink: 0,
                    }}
                  >
                    {formatMimeLabel(fmt.mimeType)}
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
                        width: `${(fmt.count / maxFormatCount) * 100}%`,
                        height: '100%',
                        backgroundColor: colors.primary,
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
                      color: colors.textPrimary,
                      minWidth: '40px',
                      textAlign: 'right',
                    }}
                  >
                    {formatNumber(fmt.count)}
                  </span>
                </div>
              ))}
            </div>

            {/* Date Range */}
            {stats.minTimestamp && stats.maxTimestamp && (
              <div style={cardStyle}>
                <div style={labelStyle}>Date Range</div>
                {statRow(
                  'Oldest photo',
                  formatDateWithOptions(stats.minTimestamp, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                )}
                {statRow(
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
