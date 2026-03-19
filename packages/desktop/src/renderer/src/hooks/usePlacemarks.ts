/**
 * usePlacemarks - Manages saved placemark state (load, create, update, delete)
 */

import { useState, useEffect, useCallback } from 'react';
import type { CreatePlacemarkInput, UpdatePlacemarkInput } from '@placemark/core';
import type { PlacemarkWithCount, PlacemarkSmartCounts } from '../types/preload.d';

export interface PlacemarksState {
  placemarks: PlacemarkWithCount[];
  smartCounts: PlacemarkSmartCounts;
  activePlacemarkId: number | 'thisYear' | 'last3Months' | null;
  loading: boolean;
}

export interface UsePlacemarksResult extends PlacemarksState {
  setActivePlacemarkId: (id: number | 'thisYear' | 'last3Months' | null) => void;
  createPlacemark: (input: CreatePlacemarkInput) => Promise<PlacemarkWithCount>;
  updatePlacemark: (input: UpdatePlacemarkInput) => Promise<PlacemarkWithCount>;
  deletePlacemark: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_SMART_COUNTS: PlacemarkSmartCounts = { thisYear: 0, last3Months: 0 };

export function usePlacemarks(): UsePlacemarksResult {
  const [placemarks, setPlacemarks] = useState<PlacemarkWithCount[]>([]);
  const [smartCounts, setSmartCounts] = useState<PlacemarkSmartCounts>(DEFAULT_SMART_COUNTS);
  const [activePlacemarkId, setActivePlacemarkId] = useState<
    number | 'thisYear' | 'last3Months' | null
  >(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.placemarks.getAll();
      setPlacemarks(result.placemarks);
      setSmartCounts(result.smartCounts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPlacemark = useCallback(
    async (input: CreatePlacemarkInput): Promise<PlacemarkWithCount> => {
      const created = await window.api.placemarks.create(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const updatePlacemark = useCallback(
    async (input: UpdatePlacemarkInput): Promise<PlacemarkWithCount> => {
      const updated = await window.api.placemarks.update(input);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deletePlacemark = useCallback(
    async (id: number): Promise<void> => {
      await window.api.placemarks.delete(id);
      if (activePlacemarkId === id) setActivePlacemarkId(null);
      await refresh();
    },
    [refresh, activePlacemarkId]
  );

  return {
    placemarks,
    smartCounts,
    activePlacemarkId,
    loading,
    setActivePlacemarkId,
    createPlacemark,
    updatePlacemark,
    deletePlacemark,
    refresh,
  };
}
