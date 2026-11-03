/**
 * CivicGuard Real-Time Notification Service
 * Manages notification database schema operations, real-time subscriber channels,
 * status read mutations, and dispatch event creation.
 */
import { AppNotification, CreateNotificationInput, NotificationSeverity, NotificationType } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY_NOTIFICATIONS = 'civicguard_notifications_v1';

// Seed notifications for initial testing and demonstration
const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    user_id: 'usr-officer-4081', // Detective Marcus Walker
    title: 'High-Priority Dispatch: Stolen Specialized E-Bike',
    message: 'New grand theft reported near Union Square transit corridor. CCTV footage shows suspect fleeing westbound.',
    type: 'dispatch',
    severity: 'critical',
    read: false,
    incident_id: 'inc-9081',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 mins ago
  },
  {
    id: 'notif-002',
    user_id: 'usr-citizen-2048', // David Kim
    title: 'Asset Recovered: MacBook Pro 16" M3 Max',
    message: 'Patrol officers have successfully recovered your device at 16th St BART station. Hardware serial verified.',
    type: 'status_update',
    severity: 'info',
    read: false,
    incident_id: 'inc-9082',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-003',
    user_id: 'usr-officer-4081',
    title: 'Anti-Fencing Alert: Duplicate Serial Flag',
    message: 'Trimble GNSS serial TRIM-R12-88194 was searched by external Bay Area commercial vendor.',
    type: 'alert',
    severity: 'high',
    read: true,
    incident_id: 'inc-9085',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-004',
    user_id: 'usr-citizen-1024', // Sarah Chen
    title: 'Investigation Initiated on E-Bike Case',
    message: 'Detective Marcus Walker (Badge #CG-4081) has been assigned to your case dossier.',
    type: 'status_update',
    severity: 'info',
    read: true,
    incident_id: 'inc-9081',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
];

// In-Memory Real-Time Subscribers registry
type NotificationCallback = (notification: AppNotification) => void;
const subscribers = new Map<string, Set<NotificationCallback>>();

function notifySubscribers(userId: string, notification: AppNotification) {
  const userSubs = subscribers.get(userId);
  if (userSubs) {
    userSubs.forEach((cb) => {
      try {
        cb(notification);
      } catch (err) {
        console.error('[NotificationService] Callback error:', err);
      }
    });
  }
}

/**
 * Retrieve notifications from persistent localStorage cache
 */
function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
      return [...SEED_NOTIFICATIONS];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_NOTIFICATIONS];
  }
}

function saveLocalNotifications(notifications: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  } catch (err) {
    console.error('Failed to save notifications cache:', err);
  }
}

/**
 * Fetch all notifications for a specific user ID
 */
export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as AppNotification[];
      }
    } catch (err) {
      console.warn('[NotificationService] Remote fetch failed, using local store:', err);
    }
  }

  const all = getLocalNotifications();
  return all
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } catch (err) {
      console.warn('[NotificationService] Remote mark-read failed:', err);
    }
  }

  const all = getLocalNotifications();
  const index = all.findIndex((n) => n.id === id);
  if (index !== -1) {
    all[index].read = true;
    saveLocalNotifications(all);
  }
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    } catch (err) {
      console.warn('[NotificationService] Remote mark-all-read failed:', err);
    }
  }

  const all = getLocalNotifications();
  const updated = all.map((n) => (n.user_id === userId ? { ...n, read: true } : n));
  saveLocalNotifications(updated);
}

/**
 * Create a new notification trigger (e.g. on incident file, status change, or urgent dispatch)
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: input.user_id,
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type,
    severity: input.severity || 'info',
    read: false,
    incident_id: input.incident_id || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          id: newNotif.id,
          user_id: newNotif.user_id,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          severity: newNotif.severity,
          read: newNotif.read,
          incident_id: newNotif.incident_id,
        })
        .select()
        .single();

      if (!error && data) {
        newNotif.id = data.id;
      }
    } catch (err) {
      console.warn('[NotificationService] Remote insert failed, persisting locally:', err);
    }
  }

  const all = getLocalNotifications();
  all.unshift(newNotif);
  saveLocalNotifications(all);

  // Notify active real-time subscribers
  notifySubscribers(input.user_id, newNotif);

  return newNotif;
}

/**
 * Subscribe to real-time notification events for a specific user ID
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: NotificationCallback
): () => void {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId)!.add(callback);

  // Remote Supabase Realtime channel if available
  let channel: any = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel(`public:notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as AppNotification);
        }
      )
      .subscribe();
  }

  return () => {
    const userSubs = subscribers.get(userId);
    if (userSubs) {
      userSubs.delete(callback);
      if (userSubs.size === 0) {
        subscribers.delete(userId);
      }
    }
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
  };
}
