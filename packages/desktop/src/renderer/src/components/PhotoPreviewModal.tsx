/**
 * PhotoPreviewModal - displays photo details with thumbnail
 */

import { useState, useEffect, useRef } from 'react';
import type { Photo } from '@placemark/core';
import type { Theme } from '../theme';
import { formatDateTime } from '../utils/formatLocale';
import { useThemeColors } from '../hooks/useThemeColors';

interface PhotoPreviewModalProps {
  photo: Photo;
  onClose: () => void;
  reverseGeocodeEnabled: boolean;
  theme?: Theme;
}

const locationLabelCache = new Map<string, string>();

function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function PhotoPreviewModal({
  photo,
  onClose,
  reverseGeocodeEnabled,
  theme = 'light',
}: PhotoPreviewModalProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  // Use ref to track URL for cleanup (prevents stale closure bug)
  const urlRef = useRef<string | null>(null);

  const colors = useThemeColors(theme);

  useEffect(() => {
    setLoading(true);
    setThumbnailUrl(null);
    let isMounted = true;

    window.api.thumbnails
      .get(photo.id)
      .then((thumbnailBuffer) => {
        if (!isMounted) return;
        if (thumbnailBuffer) {
          const uint8Array = new Uint8Array(thumbnailBuffer as unknown as ArrayBuffer);
          const blob = new Blob([uint8Array], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setThumbnailUrl(url);
        }
      })
      .catch(() => {
        // Non-critical — no thumbnail displayed
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [photo]);

  useEffect(() => {
    const lat = photo.latitude;
    const lng = photo.longitude;

    if (lat == null || lng == null) {
      setLocationLabel('No GPS data');
      setLocationLoading(false);
      return;
    }

    const coordinates = formatCoordinates(lat, lng);

    if (!reverseGeocodeEnabled) {
      setLocationLabel(coordinates);
      setLocationLoading(false);
      return;
    }

    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = locationLabelCache.get(cacheKey);
    if (cached) {
      setLocationLabel(`${cached} (${coordinates})`);
      setLocationLoading(false);
      return;
    }

    let canceled = false;
    setLocationLoading(true);
    setLocationLabel(coordinates);

    window.api.system
      .reverseGeocode(lat, lng)
      .then((label) => {
        if (canceled) return;
        if (label && label.trim()) {
          locationLabelCache.set(cacheKey, label);
          setLocationLabel(`${label} (${coordinates})`);
          return;
        }
        setLocationLabel(coordinates);
      })
      .catch(() => {
        if (!canceled) setLocationLabel(coordinates);
      })
      .finally(() => {
        if (!canceled) setLocationLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [photo.id, photo.latitude, photo.longitude, reverseGeocodeEnabled]);

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
          backgroundColor: colors.modalBackground,
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: colors.shadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: colors.textPrimary }}>{filename}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.5rem',
              color: colors.textPrimary,
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
              backgroundColor: colors.surface,
              borderRadius: '4px',
            }}
          >
            <p style={{ color: colors.textMuted }}>Loading thumbnail...</p>
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
              backgroundColor: colors.surface,
              borderRadius: '4px',
            }}
          >
            <p style={{ color: colors.textMuted }}>Thumbnail not available</p>
          </div>
        )}

        {/* Photo Details */}
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: colors.textSecondary }}>
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: colors.textPrimary }}>Path:</strong> {photo.path}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: colors.textPrimary }}>Location:</strong>{' '}
            {locationLoading ? 'Resolving location...' : (locationLabel ?? 'No GPS data')}
          </p>
          {(photo.cameraMake || photo.cameraModel) && (
            <p style={{ margin: '0.25rem 0' }}>
              <strong style={{ color: colors.textPrimary }}>Camera:</strong>{' '}
              {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ')}
            </p>
          )}
          {photo.timestamp && (
            <p style={{ margin: '0.25rem 0' }}>
              <strong style={{ color: colors.textPrimary }}>Date:</strong>{' '}
              {formatDateTime(photo.timestamp)}
            </p>
          )}
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: colors.textPrimary }}>Size:</strong>{' '}
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
          {photo.source === 'onedrive' ? (
            <>
              <button
                onClick={() => window.api.photos.openInViewer(photo.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.primary,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                View in OneDrive ↗
              </button>
              <button
                onClick={() => window.api.photos.showInFolder(photo.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.secondary,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Open Folder in OneDrive ↗
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => window.api.photos.openInViewer(photo.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.primary,
                  color: colors.buttonText,
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
                  backgroundColor: colors.secondary,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Show in Folder
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
