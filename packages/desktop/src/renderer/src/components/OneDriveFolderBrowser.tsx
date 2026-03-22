import { useEffect, useState } from 'react';
import { ChevronLeft, Cloud, FolderOpen, RefreshCw } from 'lucide-react';
import type { ThemeColors } from '../theme';
import type { OneDriveConnectionStatus, OneDriveFolderItem } from '../types/preload';
import { BORDER_RADIUS, FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING } from '../constants/ui';

interface OneDriveFolderBrowserProps {
  colors: ThemeColors;
  onSelectFolder: (folder: OneDriveFolderItem) => void;
}

export function OneDriveFolderBrowser({ colors, onSelectFolder }: OneDriveFolderBrowserProps) {
  const [connection, setConnection] = useState<OneDriveConnectionStatus | null>(null);
  const [currentFolder, setCurrentFolder] = useState<OneDriveFolderItem | null>(null);
  const [history, setHistory] = useState<OneDriveFolderItem[]>([]);
  const [folders, setFolders] = useState<OneDriveFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadConnectionStatus();
  }, []);

  async function loadConnectionStatus(): Promise<void> {
    setError(null);
    const status = await window.api.onedrive.getConnectionStatus();
    setConnection(status);
    if (status.connected) {
      await openRoot();
    }
  }

  async function connect(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const status = await window.api.onedrive.login();
      setConnection(status);
      await openRoot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to OneDrive');
    } finally {
      setLoading(false);
    }
  }

  async function openRoot(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const nextFolders = await window.api.onedrive.listRootFolders();
      setCurrentFolder(null);
      setHistory([]);
      setFolders(nextFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OneDrive folders');
    } finally {
      setLoading(false);
    }
  }

  async function openCameraRoll(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const folder = await window.api.onedrive.getCameraRollFolder();
      const nextFolders = await window.api.onedrive.listChildFolders(folder.id);
      setCurrentFolder(folder);
      setHistory([]);
      setFolders(nextFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Camera Roll');
    } finally {
      setLoading(false);
    }
  }

  async function openChildFolder(folder: OneDriveFolderItem): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const nextFolders = await window.api.onedrive.listChildFolders(folder.id);
      setHistory((prev) => (currentFolder ? [...prev, currentFolder] : prev));
      setCurrentFolder(folder);
      setFolders(nextFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subfolders');
    } finally {
      setLoading(false);
    }
  }

  async function goBack(): Promise<void> {
    if (!currentFolder) return;
    if (history.length === 0) {
      await openRoot();
      return;
    }

    const parentFolder = history[history.length - 1];
    try {
      setLoading(true);
      setError(null);
      const nextFolders = await window.api.onedrive.listChildFolders(parentFolder.id);
      setHistory((prev) => prev.slice(0, -1));
      setCurrentFolder(parentFolder);
      setFolders(nextFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go back');
    } finally {
      setLoading(false);
    }
  }

  const actionButton: React.CSSProperties = {
    padding: `${SPACING.SM} ${SPACING.MD}`,
    fontSize: FONT_SIZE.SM,
    fontWeight: FONT_WEIGHT.MEDIUM,
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.MD,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.SM,
    fontFamily: FONT_FAMILY,
  };

  if (!connection?.connected) {
    return (
      <div style={{ display: 'grid', gap: SPACING.LG }}>
        <p
          style={{
            margin: 0,
            fontSize: FONT_SIZE.SM,
            color: colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          Connect OneDrive to browse folders. No files are imported at this step.
        </p>
        {error && (
          <div style={{ color: colors.error, fontSize: FONT_SIZE.SM, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        <button
          onClick={() => void connect()}
          disabled={loading}
          style={{
            ...actionButton,
            justifyContent: 'center',
            backgroundColor: colors.primary,
            border: 'none',
            color: colors.buttonText,
            width: '100%',
          }}
        >
          <Cloud size={16} />
          {loading ? 'Connecting…' : 'Connect OneDrive'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: SPACING.LG }}>
      <div style={{ display: 'grid', gap: SPACING.XS }}>
        <div
          style={{
            fontSize: FONT_SIZE.SM,
            color: colors.textPrimary,
            fontWeight: FONT_WEIGHT.MEDIUM,
          }}
        >
          Connected as {connection.accountEmail ?? 'OneDrive account'}
        </div>
        <div style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted }}>
          Browse folders only. Import is not wired yet.
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SM }}>
        <button onClick={() => void openRoot()} disabled={loading} style={actionButton}>
          <RefreshCw size={14} />
          Root
        </button>
        <button onClick={() => void openCameraRoll()} disabled={loading} style={actionButton}>
          <Cloud size={14} />
          Camera Roll
        </button>
        {currentFolder && (
          <button onClick={() => void goBack()} disabled={loading} style={actionButton}>
            <ChevronLeft size={14} />
            Back
          </button>
        )}
      </div>

      <div style={{ fontSize: FONT_SIZE.SM, color: colors.textSecondary }}>
        {currentFolder ? `Current folder: ${currentFolder.name}` : 'Current folder: OneDrive root'}
      </div>

      {currentFolder && (
        <button
          onClick={() => onSelectFolder(currentFolder)}
          style={{
            ...actionButton,
            justifyContent: 'center',
            backgroundColor: colors.primary,
            border: 'none',
            color: colors.buttonText,
          }}
        >
          Select This Folder
        </button>
      )}

      {error && (
        <div style={{ color: colors.error, fontSize: FONT_SIZE.SM, lineHeight: 1.5 }}>{error}</div>
      )}

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: BORDER_RADIUS.LG,
          backgroundColor: colors.surfaceHover,
          maxHeight: '260px',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div style={{ padding: SPACING.LG, fontSize: FONT_SIZE.SM, color: colors.textMuted }}>
            Loading folders…
          </div>
        ) : folders.length === 0 ? (
          <div style={{ padding: SPACING.LG, fontSize: FONT_SIZE.SM, color: colors.textMuted }}>
            No subfolders found.
          </div>
        ) : (
          folders.map((folder, index) => (
            <button
              key={folder.id}
              onClick={() => void openChildFolder(folder)}
              style={{
                width: '100%',
                padding: `${SPACING.MD} ${SPACING.LG}`,
                backgroundColor: 'transparent',
                border: 'none',
                borderTop: index === 0 ? 'none' : `1px solid ${colors.border}`,
                color: colors.textPrimary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                fontFamily: FONT_FAMILY,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.SM }}>
                <FolderOpen size={15} />
                {folder.name}
              </span>
              <span style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted }}>
                {folder.childCount} subfolders
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
