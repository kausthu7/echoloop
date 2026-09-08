import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  Clock, 
  Sparkles, 
  Coffee, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectTask,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'UNREAD' 
    ? notifications.filter((n) => !n.read) 
    : notifications;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'KICKOFF':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'FOLLOWUP':
        return (
          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'TREAT':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4" />
          </div>
        );
      case 'SLIPPED':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatNotificationTime = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="notifications-modal-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[85vh] transition-all transform animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Live accountability loop & check-in activity
              </p>
            </div>
          </div>

          <button
            id="close-notifications-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="px-5 py-2.5 border-b border-zinc-100 flex items-center justify-between bg-white text-xs">
          <div className="flex items-center gap-1">
            <button
              id="notif-filter-all-btn"
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-semibold transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-indigo-100 text-indigo-950 font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              id="notif-filter-unread-btn"
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 rounded-xl font-semibold transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-indigo-100 text-indigo-950 font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                id="notif-mark-all-read-btn"
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                id="notif-clear-all-btn"
                type="button"
                onClick={onClearAll}
                className="text-[11px] font-medium text-zinc-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* List of Notifications */}
        <div className="overflow-y-auto divide-y divide-zinc-100 flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 text-center px-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-2">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-bold text-zinc-800">No notifications</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {filter === 'UNREAD' 
                  ? 'All caught up! You have read all notifications.'
                  : 'Accountability kickoffs, verification pings, and treats will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) onMarkAsRead(n.id);
                  if (n.taskId && onSelectTask) {
                    onSelectTask(n.taskId);
                    onClose();
                  }
                }}
                className={`p-4 flex items-start gap-3 transition-colors cursor-pointer group ${
                  n.read ? 'bg-white hover:bg-zinc-50/80' : 'bg-indigo-50/50 hover:bg-indigo-50/80'
                }`}
              >
                {getNotificationIcon(n.type)}

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs font-bold truncate ${n.read ? 'text-zinc-800' : 'text-zinc-950'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      {formatNotificationTime(n.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 leading-snug">
                    {n.message}
                  </p>

                  {n.taskId && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 mt-1">
                      <span>View Task in Queue</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-400">
          <span>Real-time autonomous tracker</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-800 hover:text-zinc-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
