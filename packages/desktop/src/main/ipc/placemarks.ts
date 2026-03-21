/**
 * Placemarks IPC handlers
 */

import { ipcMain } from 'electron';
import { CreatePlacemarkInput, UpdatePlacemarkInput } from '@placemark/core';
import {
  getAllPlacemarks,
  createPlacemark,
  updatePlacemark,
  deletePlacemark,
  setPlacemarkGeoLabel,
  getPlacemarkPhotoCount,
  getThisYearPhotoCount,
  getLast3MonthsPhotoCount,
} from '../services/placemarks';

export function registerPlacemarksHandlers(): void {
  ipcMain.handle('placemarks:getAll', () => {
    const placemarks = getAllPlacemarks();
    const smartCounts = {
      thisYear: getThisYearPhotoCount(),
      last3Months: getLast3MonthsPhotoCount(),
    };
    const placemarksWithCounts = placemarks.map((p) => ({
      ...p,
      photoCount: getPlacemarkPhotoCount(p),
    }));
    return { placemarks: placemarksWithCounts, smartCounts };
  });

  ipcMain.handle('placemarks:create', (_event, input: CreatePlacemarkInput) => {
    const placemark = createPlacemark(input);
    return { ...placemark, photoCount: getPlacemarkPhotoCount(placemark) };
  });

  ipcMain.handle('placemarks:update', (_event, input: UpdatePlacemarkInput) => {
    const placemark = updatePlacemark(input);
    return { ...placemark, photoCount: getPlacemarkPhotoCount(placemark) };
  });

  ipcMain.handle('placemarks:delete', (_event, id: number) => {
    deletePlacemark(id);
  });

  ipcMain.handle('placemarks:setGeoLabel', (_event, id: number, label: string) => {
    if (typeof label !== 'string' || label.trim().length === 0) return;
    setPlacemarkGeoLabel(id, label.trim());
  });
}
