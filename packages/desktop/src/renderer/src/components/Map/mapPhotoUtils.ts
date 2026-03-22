import type { Photo } from '@placemark/core';

/** Build a Photo object from MapLibre feature properties. */
export function photoFromProps(props: Record<string, unknown>): Photo {
  return {
    id: props.id as number,
    path: props.path as string,
    latitude: props.latitude as number,
    longitude: props.longitude as number,
    timestamp: (props.timestamp as number) ?? null,
    source: (props.source as 'local' | 'onedrive' | 'network') ?? 'local',
    fileSize: props.fileSize as number,
    mimeType: props.mimeType as string,
    scannedAt: props.scannedAt as number,
    fileHash: (props.fileHash as string) ?? null,
    cameraMake: (props.cameraMake as string) ?? null,
    cameraModel: (props.cameraModel as string) ?? null,
    cloudItemId: (props.cloudItemId as string) ?? null,
    cloudFolderPath: (props.cloudFolderPath as string) ?? null,
    cloudSha256: (props.cloudSha256 as string) ?? null,
  };
}
