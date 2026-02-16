import { create } from 'zustand';
import useSettingsStore from './useSettings';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  createdAt: number;
  exiting?: boolean;
}

interface NotificationStore {
  toasts: Toast[];
  toastedAlertIds: Set<string>;
  notify: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  markAlertToasted: (alertId: string) => void;
  hasAlertBeenToasted: (alertId: string) => boolean;
}

let counter = 0;

const useNotificationStore = create<NotificationStore>((set, get) => ({
  toasts: [],
  toastedAlertIds: new Set(),

  notify: (toast) => {
    const settings = useSettingsStore.getState().settings;
    if (!settings.notificationsEnabled) return;

    const id = `toast-${++counter}-${Date.now()}`;
    const duration = toast.duration !== undefined ? toast.duration : settings.toastDuration;
    const newToast: Toast = { ...toast, id, duration, createdAt: Date.now() };

    set((state) => {
      // Keep max 3 visible, remove oldest
      const toasts = [...state.toasts, newToast];
      if (toasts.length > 3) {
        return { toasts: toasts.slice(-3) };
      }
      return { toasts };
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        // Mark as exiting for animation
        set((state) => ({
          toasts: state.toasts.map((t) =>
            t.id === id ? { ...t, exiting: true } : t
          ),
        }));
        // Remove after animation
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 200);
      }, duration);
    }
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, exiting: true } : t
      ),
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 200);
  },

  dismissAll: () => set({ toasts: [] }),

  markAlertToasted: (alertId) => {
    set((state) => {
      const newSet = new Set(state.toastedAlertIds);
      newSet.add(alertId);
      return { toastedAlertIds: newSet };
    });
  },

  hasAlertBeenToasted: (alertId) => {
    return get().toastedAlertIds.has(alertId);
  },
}));

export default useNotificationStore;
