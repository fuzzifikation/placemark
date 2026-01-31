/**
 * Toast - Non-intrusive notification component
 */

import { useEffect, useState } from 'react';
import { FONT_FAMILY } from '../../constants/ui';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setVisible(true), 10);

    // Auto close after 4 seconds
    const closeTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  const colors = {
    success: { bg: '#10b981', border: '#059669', text: '#ffffff' },
    error: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
    info: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  };

  return (
    <div
      style={{
        backgroundColor: colors[type].bg,
        border: `1px solid ${colors[type].border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: colors[type].text,
        maxWidth: '400px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ flex: 1 }}>{message}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: colors[type].text,
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            opacity: 0.7,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}