/**
 * SettingsSection - Collapsible section container for Settings
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SettingsSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  theme: Theme;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  expanded,
  onToggle,
  theme,
  children,
}: SettingsSectionProps) {
  const colors = useThemeColors(theme);

  return (
    <section
      style={{
        marginBottom: '1.5rem',
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          backgroundColor: colors.surface,
          border: 'none',
          borderBottom: expanded ? `1px solid ${colors.border}` : 'none',
          fontSize: '1rem',
          fontWeight: 600,
          color: colors.textPrimary,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
      >
        <span>{title}</span>
        <span
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: colors.textSecondary,
          }}
        >
          ▶
        </span>
      </button>

      {expanded && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: colors.background,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
