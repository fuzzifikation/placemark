/**
 * useMapHover - Manages hover preview state and thumbnail loading for map markers
 *
 * This hook provides:
 * - Hover state management (which photo, position, thumbnail)
 * - In-memory thumbnail cache with LRU eviction
 * - Debounced thumbnail loading (200ms delay)
 * - Race condition prevention
 *
 * The returned refs (hoverHandlersRef) can be called from map event listeners
 * that are set up once during initialization.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Photo, PhotoSource } from '@placemark/core';
import { ThumbnailCache } from '../../utils/ThumbnailCache';

/** Photo data extracted from map feature properties */
function extractPhotoFromProperties(props: Record<string, unknown>): Photo {
  return {
    id: props.id as number,
    path: props.path as string,
    latitude: props.latitude as number,
    longitude: props.longitude as number,
    timestamp: (props.timestamp as number) || null,
    source: props.source as PhotoSource,
    fileSize: props.fileSize as number,
    mimeType: props.mimeType as string,
    scannedAt: props.scannedAt as number,
    fileHash: (props.fileHash as string) || null,
  };
}

interface HoverState {
  photo: Photo | null;
  position: { x: number; y: number } | null;
  thumbnailUrl: string | null;
  loading: boolean;
}

interface HoverHandlers {
  onMouseMove: (props: Record<string, unknown>, clientX: number, clientY: number) => void;
  onMouseLeave: () => void;
}

interface UseMapHoverReturn {
  hoverState: HoverState;
  /** Ref containing handlers - use in map event listeners */
  hoverHandlersRef: React.MutableRefObject<HoverHandlers>;
  /** Call on cleanup to clear thumbnail cache and pending timeouts */
  cleanup: () => void;
}

const THUMBNAIL_DEBOUNCE_MS = 200;
const THUMBNAIL_CACHE_SIZE = 50;

export function useMapHover(): UseMapHoverReturn {
  const [hoverState, setHoverState] = useState<HoverState>({
    photo: null,
    position: null,
    thumbnailUrl: null,
    loading: false,
  });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeHoverIdRef = useRef<number | null>(null);
  const thumbnailCacheRef = useRef<ThumbnailCache>(new ThumbnailCache(THUMBNAIL_CACHE_SIZE));

  // Store handlers in a ref so map event listeners (set up once) can access latest logic
  const hoverHandlersRef = useRef<HoverHandlers>({
    onMouseMove: () => {},
    onMouseLeave: () => {},
  });

  // Update handlers when state changes
  useEffect(() => {
    hoverHandlersRef.current.onMouseMove = (
      props: Record<string, unknown>,
      clientX: number,
      clientY: number
    ) => {
      const photo = extractPhotoFromProperties(props);
      const newPosition = { x: clientX, y: clientY };

      // Always update position for smooth tracking
      setHoverState((prev) => ({ ...prev, position: newPosition }));

      // Only load thumbnail if photo changed
      if (activeHoverIdRef.current === photo.id) return;

      activeHoverIdRef.current = photo.id;

      // Clear existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Check in-memory cache first
      const cachedUrl = thumbnailCacheRef.current.get(photo.id);
      if (cachedUrl) {
        setHoverState({
          photo,
          position: newPosition,
          thumbnailUrl: cachedUrl,
          loading: false,
        });
        return;
      }

      // Show photo info immediately with loading state
      setHoverState({
        photo,
        position: newPosition,
        thumbnailUrl: null,
        loading: true,
      });

      // Load thumbnail after debounce delay
      hoverTimeoutRef.current = setTimeout(() => {
        window.api.thumbnails
          .get(photo.id, photo.path)
          .then((thumbnailBuffer: Buffer | null) => {
            // Race condition check
            if (activeHoverIdRef.current !== photo.id) return;

            if (thumbnailBuffer) {
              const uint8Array = new Uint8Array(thumbnailBuffer as unknown as ArrayBuffer);
              const blob = new Blob([uint8Array], { type: 'image/jpeg' });
              const url = URL.createObjectURL(blob);

              thumbnailCacheRef.current.set(photo.id, url);
              setHoverState((prev) => ({ ...prev, thumbnailUrl: url, loading: false }));
            } else {
              setHoverState((prev) => ({ ...prev, loading: false }));
            }
          })
          .catch((error: Error) => {
            if (activeHoverIdRef.current === photo.id) {
              console.error('Failed to load hover thumbnail:', error);
              setHoverState((prev) => ({ ...prev, loading: false }));
            }
          });
      }, THUMBNAIL_DEBOUNCE_MS);
    };

    hoverHandlersRef.current.onMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      activeHoverIdRef.current = null;
      setHoverState({
        photo: null,
        position: null,
        thumbnailUrl: null,
        loading: false,
      });
    };
  }, []);

  const cleanup = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    thumbnailCacheRef.current.clear();
  }, []);

  return {
    hoverState,
    hoverHandlersRef,
    cleanup,
  };
}
