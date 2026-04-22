/**
 * Storage barrel — re-exports from domain-specific query modules.
 * All consumers can continue importing from './storage' unchanged.
 */

export { getDb, closeStorage } from './storageConnection';

export {
  createPhoto,
  isDuplicateOneDrivePhoto,
  recordPhotoIssues,
  getPhotosWithIssues,
  getPhotoById,
  getPhotosByIds,
  getPhotosWithLocation,
  updatePhotoPath,
  deletePhotosByIds,
  clearAllPhotos,
  getPhotoDateRange,
  getPhotoHistogram,
  getPhotoCountWithLocation,
} from './photoQueries';
export type { PhotoIssueEntry } from './photoQueries';

export {
  logOperationBatch,
  updateBatchStatus,
  getLastCompletedBatch,
  archiveCompletedBatches,
} from './batchQueries';
export type { BatchFile, FileOp, OperationBatch, BatchInput } from './batchQueries';

export { setLastImportSummary, getLastImportSummary, getLibraryStats } from './libraryStats';
export type { LastImportSummary, LibraryStats } from './libraryStats';
