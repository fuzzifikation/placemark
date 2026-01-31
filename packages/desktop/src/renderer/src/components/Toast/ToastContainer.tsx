/**
 * ToastContainer - Manages and displays multiple toast notifications
 */

import { Toast } from './Toast';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
  duration?: number; // ms - defaults to 4000
}

export function ToastContainer({ toasts, removeToast, duration = 4000 }: ToastContainerProps) {
  return (
    <>
      {toasts.map((toast, index) => {
        return (
          <div
            key={toast.id}
            style={{
              position: 'fixed',
              top: `${20 + index * 80}px`,
              right: '20px',
              zIndex: 1000,
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
              duration={duration}
            />
          </div>
        );
      })}
    </>
  );
}
