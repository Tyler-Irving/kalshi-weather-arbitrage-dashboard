import { useEffect, ReactNode } from 'react';
import useNotificationStore, { Toast } from '../hooks/useNotification';
import useDashboardStore from '../stores/dashboardStore';

const TOAST_ICONS: Record<Toast['type'], string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
};

const TOAST_COLORS: Record<Toast['type'], { border: string; icon: string; bg: string }> = {
  success: { border: 'border-l-green-500', icon: 'text-green-400 bg-green-500/10', bg: 'bg-zinc-900' },
  warning: { border: 'border-l-amber-500', icon: 'text-amber-400 bg-amber-500/10', bg: 'bg-zinc-900' },
  error: { border: 'border-l-red-500', icon: 'text-red-400 bg-red-500/10', bg: 'bg-zinc-900' },
  info: { border: 'border-l-blue-500', icon: 'text-blue-400 bg-blue-500/10', bg: 'bg-zinc-900' },
};

const PROGRESS_COLORS: Record<Toast['type'], string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useNotificationStore();
  const colors = TOAST_COLORS[toast.type];
  const hasDuration = toast.duration && toast.duration > 0;

  return (
    <div
      className={`${toast.exiting ? 'toast-exit' : 'toast-enter'} w-80 ${colors.bg} border border-zinc-700/50 ${colors.border} border-l-4 rounded-lg shadow-2xl overflow-hidden`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colors.icon}`}>
          {TOAST_ICONS[toast.type]}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-zinc-400 mt-0.5">{toast.message}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => dismiss(toast.id)}
          className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {hasDuration && !toast.exiting && (
        <div className="h-0.5 w-full bg-zinc-800">
          <div
            className={`h-full ${PROGRESS_COLORS[toast.type]} toast-progress`}
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}

function ToastContainer() {
  const { toasts } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

// Bridge: watch dashboard alerts and fire toasts for new ones
function AlertToastBridge() {
  const alerts = useDashboardStore((s) => s.alerts);
  const { notify, markAlertToasted, hasAlertBeenToasted } = useNotificationStore();

  useEffect(() => {
    alerts.forEach((alert) => {
      if (hasAlertBeenToasted(alert.id)) return;

      markAlertToasted(alert.id);
      notify({
        type: alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info',
        title: alert.message,
        // Non-dismissible alerts (like daemon-down) should persist longer
        duration: alert.dismissible ? undefined : 10000,
      });
    });
  }, [alerts, notify, markAlertToasted, hasAlertBeenToasted]);

  return null;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AlertToastBridge />
      <ToastContainer />
    </>
  );
}
