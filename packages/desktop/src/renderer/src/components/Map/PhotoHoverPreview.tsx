/**
 * PhotoHoverPreview - Tooltip preview for photo hover on map
 */

import type { Photo } from '@placemark/core';
import type { Theme } from '../../theme';
import { formatDate } from '../../utils/formatLocale';
import { useThemeColors } from '../../hooks/useThemeColors';
import { getGlassStyle, BORDER_RADIUS, FONT_SIZE, SPACING } from '../../constants/ui';

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
  const colors = useThemeColors(theme);
  const filename = photo.path.split(/[\\/]/).pop();
  const formattedDate = photo.timestamp ? formatDate(photo.timestamp) : null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 15,
        top: position.y + 15,
        ...getGlassStyle(colors, glassBlur, glassSurfaceOpacity, BORDER_RADIUS.MD),
        color: colors.textPrimary,
        padding: SPACING.SM,
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
            backgroundColor: colors.surface,
            borderRadius: BORDER_RADIUS.SM,
          }}
        >
          <span style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted }}>Loading...</span>
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
            borderRadius: BORDER_RADIUS.SM,
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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.XS,
            backgroundColor: colors.surface,
            borderRadius: BORDER_RADIUS.SM,
          }}
        >
          {photo.mimeType.startsWith('image/x-') ||
          photo.mimeType === 'image/heic' ||
          photo.mimeType === 'image/heif' ? (
            <>
              <span style={{ fontSize: FONT_SIZE.SM, fontWeight: 600, color: colors.textPrimary }}>
                {photo.mimeType.startsWith('image/x-') ? 'RAW File' : 'HEIC File'}
              </span>
              <span
                style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted, textAlign: 'center' }}
              >
                No embedded preview found
              </span>
            </>
          ) : (
            <span style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted }}>No preview</span>
          )}
        </div>
      )}
      <div style={{ marginTop: SPACING.SM, fontSize: FONT_SIZE.XS }}>
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
          <div style={{ color: colors.textMuted, marginTop: SPACING.XS }}>{formattedDate}</div>
        )}
      </div>
    </div>
  );
}
