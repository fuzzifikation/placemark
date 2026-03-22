import { ONEDRIVE_CONFIG } from '../config/onedrive';
import { OneDriveAuthService } from './onedriveAuth';

export interface OneDriveFolderItem {
  id: string;
  name: string;
  childCount: number;
  path: string | null;
}

interface GraphFolderResponse {
  value?: GraphDriveItem[];
}

interface GraphDriveItem {
  id?: string;
  name?: string;
  folder?: {
    childCount?: number;
  };
  package?: {
    type?: string;
  };
  bundle?: {
    childCount?: number;
  };
  parentReference?: {
    path?: string;
  };
}

export class OneDriveGraphService {
  constructor(private readonly authService: OneDriveAuthService) {}

  async listRootFolders(): Promise<OneDriveFolderItem[]> {
    return this.listFoldersByPath('/me/drive/root/children');
  }

  async getCameraRollFolder(): Promise<OneDriveFolderItem> {
    return this.getFolderByPath('/me/drive/special/cameraroll');
  }

  async listChildFolders(itemId: string): Promise<OneDriveFolderItem[]> {
    const normalizedItemId = itemId.trim();
    if (!normalizedItemId) {
      throw new Error('Cannot list OneDrive folders: missing folder ID');
    }

    return this.listFoldersByPath(
      `/me/drive/items/${encodeURIComponent(normalizedItemId)}/children`
    );
  }

  private async listFoldersByPath(pathname: string): Promise<OneDriveFolderItem[]> {
    const payload = await this.fetchGraphPayload<GraphFolderResponse>(pathname, {
      $select: 'id,name,folder,parentReference',
      $top: '200',
    });

    const items = Array.isArray(payload.value) ? payload.value : [];

    return items
      .filter((item) => this.isContainer(item) && item.id && item.name)
      .map((item) => this.toFolderItem(item))
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      );
  }

  private async getFolderByPath(pathname: string): Promise<OneDriveFolderItem> {
    const payload = await this.fetchGraphPayload<GraphDriveItem>(pathname, {
      $select: 'id,name,folder,parentReference',
    });

    if (!this.isContainer(payload) || !payload.id || !payload.name) {
      throw new Error('OneDrive special folder lookup returned an invalid folder payload');
    }

    return this.toFolderItem(payload);
  }

  private async fetchGraphPayload<T>(
    pathname: string,
    params?: Record<string, string>
  ): Promise<T> {
    const accessToken = await this.authService.getValidAccessToken();
    if (!accessToken) {
      throw new Error('Cannot access OneDrive: not connected');
    }

    const url = new URL(`${ONEDRIVE_CONFIG.graphBaseUrl}${pathname}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OneDrive folder listing failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }

  private toFolderItem(item: GraphDriveItem): OneDriveFolderItem {
    return {
      id: item.id as string,
      name: item.name as string,
      childCount: item.folder?.childCount ?? item.bundle?.childCount ?? 0,
      path: item.parentReference?.path ?? null,
    };
  }

  private isContainer(item: GraphDriveItem): boolean {
    return Boolean(item.folder || item.package || item.bundle);
  }
}
