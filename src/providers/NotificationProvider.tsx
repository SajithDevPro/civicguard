/**
 * CivicGuard Global Real-Time Notification Provider (NotificationProvider.tsx)
 * Manages WebSocket event streams on the notifications table, synthesizes Web Audio API
 * dispatch chimes, and orchestrates desktop push notifications and in-app toasts.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppNotification, CreateNotificationInput, UserProfile } from '../types';
import {
  createNotification,
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
} from '../services/notifications';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  activeToast: AppNotification | null;
  dismissToast: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (input: CreateNotificationInput) => Promise<AppNotification>;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  hasDesktopPermission: boolean;
  requestDesktopPermission: () => Promise<boolean>;
  playChime: (severity?: 'critical' | 'high' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

/**
 * Web Audio API synthesizer for dispatch alarms and notification pings
 */
function synthesizeDispatchChime(severity: 'critical' | 'high' | 'info' = 'high') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (severity === 'critical') {
      // High-urgency triple tone (Police dispatch alert: 880Hz -> 1174Hz -> 1760Hz)
      const freqs = [880, 1174, 1760];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.12, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.18);
      });
    } else {
      // Standard dual ping (659Hz -> 880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    }
  } catch (err) {
    console.debug('[AudioChime] Autoplay prevented before user interaction');
  }
}

export const NotificationProvider: React.FC<{
  currentUser: UserProfile;
  children: React.ReactNode;
}> = ({ currentUser, children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hasDesktopPermission, setHasDesktopPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch user notifications on mount or persona change
  const refreshNotifications = useCallback(async () => {
    try {
      const data = await fetchUserNotifications(currentUser.id);
      setNotifications(data);
    } catch (err) {
      console.error('[NotificationProvider] Failed to fetch:', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Request browser Notification API permissions
  const requestDesktopPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasDesktopPermission(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  const playChime = useCallback(
    (severity: 'critical' | 'high' | 'info' = 'high') => {
      if (audioEnabled) {
        synthesizeDispatchChime(severity);
      }
    },
    [audioEnabled]
  );

  // 2. Real-Time WebSocket Channel Listener
  useEffect(() => {
    const unsubscribe = subscribeToUserNotifications(currentUser.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);

      // Play audio chime
      playChime(newNotif.severity);

      // Display in-app floating toast
      setActiveToast(newNotif);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7000);

      // Trigger desktop browser push notification if tab is in background
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        try {
          new Notification(`CivicGuard: ${newNotif.title}`, {
            body: newNotif.message,
            icon: '/favicon.ico',
          });
        } catch (err) {
          console.debug('[DesktopNotification] Push skipped:', err);
        }
      }
    });

    return () => {
      unsubscribe();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [currentUser.id, playChime]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsAsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUser.id]);

  const sendNotification = useCallback(
    async (input: CreateNotificationInput) => {
      return await createNotification(input);
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        sendNotification,
        audioEnabled,
        setAudioEnabled,
        hasDesktopPermission,
        requestDesktopPermission,
        playChime,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
