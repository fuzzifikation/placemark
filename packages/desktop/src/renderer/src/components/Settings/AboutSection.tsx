/**
 * AboutSection - App info and legal links
 */

import { useState, useEffect } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';

// Get app version from Electron (always reliable)
const getAppVersion = async (): Promise<string> => {
  return (await window.api?.system?.getAppVersion?.()) || 'unknown';
};

interface AboutSectionProps {
  theme: Theme;
}

export function AboutSection({ theme }: AboutSectionProps) {
  const colors = useThemeColors(theme);
  const [appVersion, setAppVersion] = useState<string>('unknown');

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  // Open links in system browser
  const handleOpenLink = async (url: string) => {
    try {
      await window.api?.system?.openExternal?.(url);
    } catch (error) {
      console.error('Failed to open external link:', error);
      // Fallback to window.open if IPC fails
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <SettingsSection title="About & Legal" expanded={true} onToggle={() => {}} theme={theme}>
      <div
        style={{
          backgroundColor: colors.surface,
          padding: '1.25rem',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* App Name and Version */}
        <div style={{ marginBottom: '1rem' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            Placemark
          </h3>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.8rem',
              color: colors.textMuted,
            }}
          >
            Version {appVersion}
          </p>
        </div>

        {/* Description */}
        <p
          style={{
            margin: '0 0 1rem 0',
            fontSize: '0.875rem',
            color: colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          Privacy-first, local-first photo organizer. Visualize your photos by where and when they
          were taken, without uploading to the cloud.
        </p>

        {/* Privacy Guarantees */}
        <div
          style={{
            backgroundColor: colors.backgroundAlt,
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.8rem',
              color: colors.textSecondary,
              lineHeight: 1.4,
            }}
          >
            🔒 <strong>No Server Backend:</strong> Placemark does not run a server and does not
            upload photos or metadata to Placemark-maintained infrastructure.
          </p>
          <p
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.8rem',
              color: colors.textSecondary,
              lineHeight: 1.4,
            }}
          >
            💾 <strong>Local-Only Storage:</strong> All indexing and thumbnails are stored locally
            on your device.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: colors.textSecondary,
              lineHeight: 1.4,
            }}
          >
            🗺️ <strong>Map Tiles Only:</strong> Map tiles are loaded from the internet
            (OpenStreetMap), but no photo data or location information is transmitted.
          </p>
        </div>

        {/* Links */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="https://github.com/fuzzifikation/placemark"
            onClick={(e) => {
              e.preventDefault();
              handleOpenLink('https://github.com/fuzzifikation/placemark');
            }}
            style={{
              color: colors.primary,
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>📦</span> GitHub
          </a>
          <a
            href="https://github.com/fuzzifikation/placemark/blob/main/LICENSE"
            onClick={(e) => {
              e.preventDefault();
              handleOpenLink('https://github.com/fuzzifikation/placemark/blob/main/LICENSE');
            }}
            style={{
              color: colors.primary,
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>📄</span> License (MIT)
          </a>
        </div>

        {/* Tech Stack */}
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: colors.textMuted,
            }}
          >
            Built with Electron, React, TypeScript, MapLibre GL, and SQLite
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
