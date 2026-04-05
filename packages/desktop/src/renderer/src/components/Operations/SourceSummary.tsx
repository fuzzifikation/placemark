import { useMemo, useState } from 'react';
import type { Photo } from '@placemark/core';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/ui';

interface SourceSummaryProps {
  photos: Photo[];
}

interface FolderStats {
  path: string;
  count: number;
}

function getDirname(filePath: string): string {
  // Handle both Windows and Unix separators
  const unixPath = filePath.replace(/\\/g, '/');
  const lastSlashIndex = unixPath.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return ''; // Root or just filename
  }

  // Return original separators if possible?
  // Actually, let's just return the path up to the last separator from the original string
  // to preserve OS specific look
  const separatorChar = filePath.includes('\\') ? '\\' : '/';
  return filePath.substring(0, filePath.lastIndexOf(separatorChar));
}

export function SourceSummary({ photos }: SourceSummaryProps) {
  const { colors, theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const folders = new Map<string, number>();

    for (const photo of photos) {
      const dir = getDirname(photo.path);
      const count = folders.get(dir) || 0;
      folders.set(dir, count + 1);
    }

    const result: FolderStats[] = [];
    folders.forEach((count, path) => {
      result.push({ path, count });
    });

    // Sort by count (descending), then path (alphabetical)
    return result.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.path.localeCompare(b.path);
    });
  }, [photos]);

  const handleShowInFolder = async (folderPath: string) => {
    try {
      // Get all photos from this folder
      const folderPhotos = photos.filter((photo) => getDirname(photo.path) === folderPath);
      const filePaths = folderPhotos.map((photo) => photo.path);
      await window.api.photos.showMultipleInFolder(filePaths);
    } catch (error) {
      console.error('Failed to show files in folder:', error);
      // Could show a toast here, but for now just log
    }
  };

  const folderCount = stats.length;
  const isMultipleFolders = folderCount > 1;
  const COLLAPSE_LIMIT = 5;
  const showStats = expanded ? stats : stats.slice(0, COLLAPSE_LIMIT);
  const hasMore = stats.length > COLLAPSE_LIMIT;

  const styles = {
    container: {
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
      borderRadius: '6px',
      padding: SPACING.LG,
      border: `1px solid ${colors.border}`,
    },
    header: {
      fontWeight: FONT_WEIGHT.MEDIUM,
      marginBottom: SPACING.SM,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: FONT_SIZE.MD,
    },
    summaryText: {
      color: colors.textSecondary,
      marginBottom: SPACING.MD,
      fontSize: FONT_SIZE.SM,
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      fontSize: FONT_SIZE.SM,
      fontFamily: 'monospace',
    },
    listItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${SPACING.SM} 0`,
      borderBottom: `1px dashed ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    },
    path: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      flex: 1,
      marginRight: SPACING.LG,
    },
    count: {
      fontWeight: FONT_WEIGHT.MEDIUM,
      color: colors.primary,
      flexShrink: 0,
      marginRight: SPACING.MD,
    },
    showBtn: {
      padding: `0.2rem ${SPACING.SM}`,
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: BORDER_RADIUS.SM,
      cursor: 'pointer',
      fontSize: FONT_SIZE.XS,
      opacity: 0.8,
    },
    toggleBtn: {
      background: 'none',
      border: 'none',
      color: colors.primary,
      cursor: 'pointer',
      fontSize: FONT_SIZE.SM,
      marginTop: SPACING.SM,
      padding: 0,
      textDecoration: 'underline',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Selection Source</span>
        <span
          style={{
            fontSize: FONT_SIZE.XS,
            backgroundColor: isMultipleFolders ? '#f59e0b' : '#10b981',
            color: 'white',
            padding: `2px ${SPACING.SM}`,
            borderRadius: BORDER_RADIUS.XL,
          }}
        >
          {folderCount} folder{folderCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={styles.summaryText}>
        Selection contains <strong>{photos.length}</strong> photos from{' '}
        <strong>{folderCount}</strong> folder{folderCount !== 1 ? 's' : ''}.
      </div>

      <ul style={styles.list}>
        {showStats.map((stat) => (
          <li key={stat.path} style={styles.listItem}>
            <span style={styles.path} title={stat.path}>
              📂 {stat.path}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
              <span style={styles.count}>{stat.count}</span>
              <button
                onClick={() => handleShowInFolder(stat.path)}
                style={styles.showBtn}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                title={`Show selected photos in folder`}
              >
                📂 Show
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} style={styles.toggleBtn}>
          {expanded ? 'Show less' : `Show ${stats.length - COLLAPSE_LIMIT} more folders...`}
        </button>
      )}
    </div>
  );
}
