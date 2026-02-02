/**
 * AboutSection - App info and legal links
 */

import { useState, useEffect } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';

// Get app version from package.json
const getAppVersion = async (): Promise<string> => {
  try {
    // In production, this will be available via Electron
    return (await window.api?.system?.getAppVersion?.()) || '0.3.2';
  } catch {
    // Fallback for development
    return '0.4.0';
  }
};

interface AboutSectionProps {
  theme: Theme;
}

export function AboutSection({ theme }: AboutSectionProps) {
  const colors = useThemeColors(theme);
  const [appVersion, setAppVersion] = useState<string>('0.3.2');

  useEffect(() => {
    getAppVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion('0.3.2'));
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
