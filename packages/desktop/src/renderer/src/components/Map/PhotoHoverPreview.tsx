/**
 * PhotoHoverPreview - Tooltip preview for photo hover on map
 */

import type { Photo } from '@placemark/core';
import type { Theme } from '../../theme';
import { formatDate } from '../../utils/formatLocale';

interface PhotoHoverPreviewProps {
  photo: Photo;
  position: { x: number; y: number };
  thumbnailUrl: string | null;
  loading: boolean;
  theme: Theme;
  glassBlur?: number;
  glassSurfaceOpacity?: number;
}

export function PhotoHoverPreview({
  photo,
  position,
  thumbnailUrl,
  loading,
  theme,
  glassBlur = 12,
  glassSurfaceOpacity = 70,
}: PhotoHoverPreviewProps) {
  const isDark = theme === 'dark';
  const backgroundColor = isDark
    ? `rgba(30, 41, 59, ${glassSurfaceOpacity / 100})`
    : `rgba(255, 255, 255, ${glassSurfaceOpacity / 100})`;
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)';
  const mutedColor = isDark ? '#aaa' : '#666';
  const placeholderBg = isDark ? '#222' : '#f0f0f0';
  const placeholderText = isDark ? '#888' : '#666';

  const filename = photo.path.split(/[\\/]/).pop();
  const formattedDate = photo.timestamp ? formatDate(photo.timestamp) : null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 15,
        top: position.y + 15,
        backgroundColor,
        backdropFilter: `blur(${glassBlur}px)`,
        WebkitBackdropFilter: `blur(${glassBlur}px)`,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '0.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        zIndex: 999,
        maxWidth: '180px',
      }}
    >
      {loading && (
        <div
          style={{
            width: '150px',
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: placeholderBg,
            borderRadius: '4px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: placeholderText }}>Loading...</span>
        </div>
      )}
      {!loading && thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt="Preview"
          style={{
            width: '150px',
            height: '150px',
            objectFit: 'cover',
            borderRadius: '4px',
            display: 'block',
          }}
        />
      )}
      {!loading && !thumbnailUrl && (
        <div
          style={{
            width: '150px',
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: placeholderBg,
            borderRadius: '4px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: placeholderText }}>No preview</span>
        </div>
      )}
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
        <div
          style={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filename}
        </div>
        {formattedDate && (
          <div style={{ color: mutedColor, marginTop: '0.25rem' }}>{formattedDate}</div>
        )}
      </div>
    </div>
  );
}
