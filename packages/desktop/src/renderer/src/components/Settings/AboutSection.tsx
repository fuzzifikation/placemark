/**
 * AboutSection - App info and legal links
 */

import { type Theme, getThemeColors } from '../../theme';
import { SettingsSection } from './SettingsSection';

// App version - should be synced with package.json
const APP_VERSION = '0.2.3';

interface AboutSectionProps {
  theme: Theme;
}

export function AboutSection({ theme }: AboutSectionProps) {
  const colors = getThemeColors(theme);

  // Note: openExternal is not in the preload API yet
  // For now, we'll just show the links as text
  const handleOpenLink = (url: string) => {
    // Open in default browser
    window.open(url, '_blank', 'noopener,noreferrer');
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
            Version {APP_VERSION}
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
            href="https://github.com/placemark/placemark"
            onClick={(e) => {
              e.preventDefault();
              handleOpenLink('https://github.com/placemark/placemark');
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
            href="https://github.com/placemark/placemark/blob/main/LICENSE"
            onClick={(e) => {
              e.preventDefault();
              handleOpenLink('https://github.com/placemark/placemark/blob/main/LICENSE');
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
