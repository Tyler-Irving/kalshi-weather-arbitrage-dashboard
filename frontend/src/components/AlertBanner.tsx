import useDashboardStore from '../stores/dashboardStore';

export default function AlertBanner() {
  const { alerts, dismissAlert } = useDashboardStore();

  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-accent-red/20 border-accent-red text-red-200';
      case 'warning':
        return 'bg-accent-amber/20 border-accent-amber text-amber-200';
      case 'info':
        return 'bg-blue-500/20 border-blue-500 text-blue-200';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-200';
    }
  };

  return (
    <div className="border-b border-gray-700">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`px-6 py-3 border-l-4 flex items-center justify-between ${getAlertStyles(alert.type)}`}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold">
              {alert.type === 'error' && '⚠️'}
              {alert.type === 'warning' && '⚡'}
              {alert.type === 'info' && 'ℹ️'}
            </span>
            <span className="text-sm">{alert.message}</span>
          </div>
          {alert.dismissible && (
            <button
              onClick={() => dismissAlert(alert.id)}
              className="ml-4 px-2 py-1 rounded hover:bg-black/30 transition-colors text-xs"
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
