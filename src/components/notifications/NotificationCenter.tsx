/**
 * CivicGuard Notification Center & Toast Drawer (NotificationCenter.tsx)
 * Top-bar notification widget with pulsing unread count badge, interactive dropdown tray,
 * severity categorization, audio toggle, and floating dispatch toast.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Radio,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  Laptop,
  Car,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useNotifications } from '../../providers/NotificationProvider';
import { AppNotification, NotificationSeverity } from '../../types';

interface NotificationCenterProps {
  onOpenCaseDossier?: (incidentId: string) => void;
}

/**
 * Helper to calculate human-readable relative time string
 */
function getRelativeTimeString(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onOpenCaseDossier,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    activeToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
    audioEnabled,
    setAudioEnabled,
    hasDesktopPermission,
    requestDesktopPermission,
  } = useNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/80 bg-red-950/60 text-red-300';
      case 'high':
        return 'border-amber-500/80 bg-amber-950/60 text-amber-300';
      case 'info':
      default:
        return 'border-blue-500/80 bg-blue-950/60 text-blue-300';
    }
  };

  const getTypeIcon = (notif: AppNotification) => {
    if (notif.type === 'dispatch') {
      return <Radio className="w-4 h-4 text-red-400 shrink-0" />;
    }
    if (notif.type === 'alert') {
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Icon Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all focus:outline-none"
        title="Open Notification Dispatch Center"
      >
        <Bell className="w-4 h-4" />

        {/* Pulsing unread counter badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-mono font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Tray Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden font-sans text-xs">
          {/* Header */}
          <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 font-mono uppercase tracking-wider text-xs">
                Alert & Dispatch Log
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-red-950 border border-red-500/60 text-red-300 font-mono text-[10px] font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Audio Chime Toggle */}
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-1 rounded text-slate-400 hover:text-white transition-colors ${
                  audioEnabled ? 'text-emerald-400' : 'text-slate-500'
                }`}
                title={audioEnabled ? 'Audio Chime Active' : 'Audio Chime Muted'}
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Push Permissions Bar */}
          {!hasDesktopPermission && (
            <div className="px-3.5 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Enable background desktop alarms:</span>
              <button
                type="button"
                onClick={requestDesktopPermission}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold border border-slate-700"
              >
                Allow Push
              </button>
            </div>
          )}

          {/* Scrollable Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-1">
                <Bell className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                <div className="font-semibold text-slate-400 text-xs">No Recent Notifications</div>
                <p className="text-[11px] text-slate-500">
                  New priority dispatches and asset recovery milestones will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    if (notif.incident_id && onOpenCaseDossier) {
                      onOpenCaseDossier(notif.incident_id);
                      setIsOpen(false);
                    }
                  }}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 group ${
                    notif.read ? 'bg-slate-950/60 hover:bg-slate-900/40 opacity-80' : 'bg-slate-900/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="mt-0.5">{getTypeIcon(notif)}</div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`font-semibold text-xs leading-snug truncate ${
                          notif.read ? 'text-slate-300' : 'text-white'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {getRelativeTimeString(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                      <span className={`px-1.5 py-0.2 rounded border uppercase font-bold ${getSeverityBadge(notif.severity)}`}>
                        {notif.severity}
                      </span>

                      {notif.incident_id && (
                        <span className="text-emerald-400 group-hover:underline flex items-center gap-0.5">
                          View Case #{notif.incident_id.toUpperCase()} <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {!notif.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Toast Popup */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-60 max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-4 text-slate-100 flex items-start gap-3 animate-slide-in">
          <div className="p-2 rounded bg-slate-800 shrink-0 mt-0.5">
            {getTypeIcon(activeToast)}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono uppercase">
                {activeToast.severity === 'critical' ? 'CRITICAL DISPATCH' : 'SYSTEM ALERT'}
              </span>
              <button
                type="button"
                onClick={dismissToast}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h5 className="text-xs font-semibold text-slate-200">
              {activeToast.title}
            </h5>
            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
              {activeToast.message}
            </p>

            {activeToast.incident_id && onOpenCaseDossier && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCaseDossier(activeToast.incident_id!);
                    dismissToast();
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1 font-mono"
                >
                  <span>Open Case Dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
