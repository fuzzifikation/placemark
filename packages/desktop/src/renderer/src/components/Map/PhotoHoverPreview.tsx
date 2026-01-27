/**
 * PhotoHoverPreview - Tooltip preview for photo hover on map
 */

import type { Photo } from '@placemark/core';
import type { Theme } from '../../theme';

interface PhotoHoverPreviewProps {
  photo: Photo;
  position: { x: number; y: number };
  thumbnailUrl: string | null;
  loading: boolean;
  theme: Theme;
}

export function PhotoHoverPreview({
  photo,
  position,
  thumbnailUrl,
  loading,
  theme,
}: PhotoHoverPreviewProps) {
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#444' : '#ccc';
  const mutedColor = isDark ? '#aaa' : '#666';
  const placeholderBg = isDark ? '#222' : '#f0f0f0';
  const placeholderText = isDark ? '#888' : '#666';

  const filename = photo.path.split(/[\\/]/).pop();
  const formattedDate = photo.timestamp
    ? new Date(photo.timestamp).toLocaleDateString()
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 15,
        top: position.y + 15,
        backgroundColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        padding: '0.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
