/**
 * PhotoPreviewModal - displays photo details with thumbnail
 */

import { useState, useEffect, useRef } from 'react';
import type { Photo } from '@placemark/core';
import type { Theme } from '../theme';
import { formatDateTime } from '../utils/formatLocale';

interface PhotoPreviewModalProps {
  photo: Photo;
  onClose: () => void;
  theme?: Theme;
}

export function PhotoPreviewModal({ photo, onClose, theme = 'light' }: PhotoPreviewModalProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Use ref to track URL for cleanup (prevents stale closure bug)
  const urlRef = useRef<string | null>(null);

  const isDark = theme === 'dark';
  const modalBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#000000';
  const secondaryText = isDark ? '#94a3b8' : '#666666';
  const placeholderBg = isDark ? '#0f172a' : '#f0f0f0';
  const placeholderText = isDark ? '#64748b' : '#666666';

  useEffect(() => {
    setLoading(true);
    setThumbnailUrl(null);

    window.api.thumbnails
      .get(photo.id, photo.path)
      .then((thumbnailBuffer) => {
        if (thumbnailBuffer) {
          const uint8Array = new Uint8Array(thumbnailBuffer as unknown as ArrayBuffer);
          const blob = new Blob([uint8Array], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setThumbnailUrl(url);
        }
      })
      .catch((error) => {
        console.error('Failed to load thumbnail:', error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [photo]);

  const filename = photo.path.split(/[\\/]/).pop();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: modalBg,
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: textColor }}>{filename}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.5rem',
              color: textColor,
            }}
          >
            ×
          </button>
        </div>

        {/* Thumbnail Display */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              backgroundColor: placeholderBg,
              borderRadius: '4px',
            }}
          >
            <p style={{ color: placeholderText }}>Loading thumbnail...</p>
          </div>
        )}

        {!loading && thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={filename}
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
        )}

        {!loading && !thumbnailUrl && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              backgroundColor: placeholderBg,
              borderRadius: '4px',
            }}
          >
            <p style={{ color: placeholderText }}>Thumbnail not available</p>
          </div>
        )}

        {/* Photo Details */}
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: secondaryText }}>
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: textColor }}>Path:</strong> {photo.path}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: textColor }}>Location:</strong> {photo.latitude?.toFixed(6)},{' '}
            {photo.longitude?.toFixed(6)}
          </p>
          {photo.timestamp && (
            <p style={{ margin: '0.25rem 0' }}>
              <strong style={{ color: textColor }}>Date:</strong> {formatDateTime(photo.timestamp)}
            </p>
          )}
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: textColor }}>Size:</strong>{' '}
            {(photo.fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={() => window.api.photos.openInViewer(photo.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              opacity: isDark ? 0.9 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = isDark ? '1' : '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = isDark ? '0.9' : '1')}
          >
            Open in Viewer
          </button>
          <button
            onClick={() => window.api.photos.showInFolder(photo.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isDark ? '#475569' : '#666666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              opacity: isDark ? 0.9 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = isDark ? '0.9' : '1')}
          >
            Show in Folder
          </button>
        </div>
      </div>
    </div>
  );
}
