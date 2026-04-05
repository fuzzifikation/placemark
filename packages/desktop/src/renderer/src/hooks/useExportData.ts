/**
 * useExportData — derives the photo IDs and scope label for the export sheet
 * based on the current selection or visible photos. Extracted from App.tsx.
 */

import { useState, useMemo } from 'react';
import type { Photo } from '@placemark/core';
import { filterPhotos } from '@placemark/core';

interface ExportDataDeps {
  photoData: {
    selection: Set<number>;
    mapPhotos: Photo[];
    mapBounds: { north: number; south: number; east: number; west: number } | null;
  };
}

export function useExportData(deps: ExportDataDeps) {
  const { photoData } = deps;
  const [showExport, setShowExport] = useState(false);

  const visiblePhotos = useMemo(() => {
    if (photoData.selection.size > 0) return null; // selection takes priority
    return photoData.mapBounds
      ? filterPhotos(photoData.mapPhotos, { bounds: photoData.mapBounds })
      : photoData.mapPhotos;
  }, [photoData.selection, photoData.mapPhotos, photoData.mapBounds]);

  const exportPhotoIds = useMemo(() => {
    if (photoData.selection.size > 0) {
      return [...photoData.selection];
    }
    return (visiblePhotos ?? []).map((p) => p.id);
  }, [photoData.selection, visiblePhotos]);

  const exportScopeLabel = useMemo(() => {
    if (photoData.selection.size > 0) {
      return `${photoData.selection.size} selected photo${photoData.selection.size !== 1 ? 's' : ''}`;
    }
    const count = (visiblePhotos ?? []).length;
    return `${count} photo${count !== 1 ? 's' : ''} in view`;
  }, [photoData.selection, visiblePhotos]);

  return { showExport, setShowExport, exportPhotoIds, exportScopeLabel };
}
