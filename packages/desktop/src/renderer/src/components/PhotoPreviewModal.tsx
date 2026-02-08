/**
 * PhotoPreviewModal - displays photo details with thumbnail
 */

import { useState, useEffect, useRef } from 'react';
import type { Photo } from '@placemark/core';
import { formatDateTime } from '../utils/formatLocale';

interface PhotoPreviewModalProps {
  photo: Photo;
  onClose: () => void;
}

export function PhotoPreviewModal({ photo, onClose }: PhotoPreviewModalProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Use ref to track URL for cleanup (prevents stale closure bug)
  const urlRef = useRef<string | null>(null);

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
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{filename}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.5rem',
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
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
            }}
          >
            <p style={{ color: '#666' }}>Loading thumbnail...</p>
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
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
            }}
          >
            <p style={{ color: '#666' }}>Thumbnail not available</p>
          </div>
        )}

        {/* Photo Details */}
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Path:</strong> {photo.path}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Location:</strong> {photo.latitude?.toFixed(6)}, {photo.longitude?.toFixed(6)}
          </p>
          {photo.timestamp && (
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Date:</strong> {formatDateTime(photo.timestamp)}
            </p>
          )}
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Size:</strong> {(photo.fileSize / 1024 / 1024).toFixed(2)} MB
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
            }}
          >
            Open in Viewer
          </button>
          <button
            onClick={() => window.api.photos.showInFolder(photo.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Show in Folder
          </button>
        </div>
      </div>
    </div>
  );
}
