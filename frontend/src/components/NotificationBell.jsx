import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../api/axios';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewFilter, setViewFilter] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteScope, setDeleteScope] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [viewFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = { limit: 50 };
      if (viewFilter === 'unread') params.read = false;
      const res = await axios.get('/api/notifications/mine', { params });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // Silently fail — notifications are non-critical
    }
  }, [viewFilter]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  const deleteByFilter = async () => {
    const hasSelection = selectedIds.length > 0;
    if (isDeleting) return;
    if (deleteScope === 'all' && !notifications.length) return;
    if (deleteScope === 'selected' && !hasSelection) return;

    try {
      setIsDeleting(true);
      let res;
      if (deleteScope === 'selected') {
        res = await axios.delete('/api/notifications/bulk-delete', { data: { ids: selectedIds } });
        const selectedSet = new Set(selectedIds);
        setNotifications((prev) => prev.filter((n) => !selectedSet.has(n._id)));
      } else {
        const params = {};
        if (viewFilter === 'unread') params.read = false;
        res = await axios.delete('/api/notifications/clear', { params });
        setNotifications([]);
      }

      setUnreadCount(res.data?.unreadCount ?? 0);
      setSelectedIds([]);
      setConfirmDelete(false);
    } catch (err) {
      console.error('Failed to clear notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const TYPE_ICONS = {
    application: '📋',
    job: '💼',
    document: '📄',
    log: '📝',
    announcement: '📢',
    system: '⚙️',
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const roleLabel = (role) => {
    if (!role) return 'System';
    return String(role)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

  const senderLabel = (n) => {
    if (n?.senderId?.name) return `${n.senderId.name} (${roleLabel(n.senderId.role)})`;
    if (n?.senderName) return `${n.senderName}${n.senderRole ? ` (${roleLabel(n.senderRole)})` : ''}`;
    return 'System';
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(notifications.map((n) => n._id));
  };

  useEffect(() => {
    setSelectedIds([]);
    setConfirmDelete(false);
  }, [viewFilter, deleteScope, selectionMode]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => notifications.some((n) => n._id === id)));
  }, [notifications]);

  const visibleCount = notifications.length;
  const targetCount = deleteScope === 'selected' ? selectedIds.length : visibleCount;
  const deleteLabel = deleteScope === 'selected' ? 'Delete Selected' : viewFilter === 'unread' ? 'Delete Unread' : 'Delete All';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors duration-200"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[34rem] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[38rem] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectionMode((prev) => !prev);
                  setDeleteScope('selected');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                {selectionMode ? 'Cancel' : 'Select'}
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <CheckCheck size={12} /> Read all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="px-5 py-3 border-b bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-xl border border-slate-200 p-1 bg-slate-50">
                <button
                  onClick={() => setViewFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${viewFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setViewFilter('unread')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${viewFilter === 'unread' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Unread
                </button>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">{visibleCount} visible</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              {selectionMode ? (
                <>
                  <div className="inline-flex items-center rounded-xl border border-slate-200 p-1 bg-slate-50">
                    <button
                      onClick={() => setDeleteScope('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${deleteScope === 'all' ? 'bg-white text-rose-700 shadow-sm border border-rose-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDeleteScope('selected')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${deleteScope === 'selected' ? 'bg-white text-rose-700 shadow-sm border border-rose-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Selected
                    </button>
                  </div>

                  <button
                    onClick={() => setConfirmDelete((prev) => !prev)}
                    disabled={targetCount === 0 || isDeleting}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Trash2 size={12} /> {deleteLabel} ({targetCount})
                  </button>
                </>
              ) : (
                <div className="text-[11px] font-semibold text-slate-500">Click Select to manage delete actions</div>
              )}
            </div>
          </div>

          {selectionMode && deleteScope === 'selected' && notifications.length > 0 && (
            <div className="px-5 py-2.5 border-b bg-slate-50 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-600">
                Select notifications to delete.
              </p>
              <button
                onClick={toggleSelectAll}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
              >
                {selectedIds.length === notifications.length ? 'Unselect All' : 'Select All'}
              </button>
            </div>
          )}

          {selectionMode && confirmDelete && targetCount > 0 && (
            <div className="px-5 py-3 border-b bg-rose-50/70 flex items-center justify-between gap-3">
              <p className="text-xs text-rose-700 font-semibold">
                {`This will permanently remove ${targetCount} ${deleteScope === 'selected' ? 'selected ' : viewFilter === 'unread' ? 'unread ' : ''}notification${targetCount > 1 ? 's' : ''}.`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-md bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteByFilter}
                  disabled={isDeleting}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 bg-slate-50/50 p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200 m-2">
                <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n._id}
                  className={`mx-2 mb-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${!n.read ? 'bg-indigo-50/70 border-indigo-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  onClick={() => {
                    if (selectionMode && deleteScope === 'selected') return;
                    if (!n.read) markAsRead(n._id);
                  }}>
                  <div className="flex items-start gap-3">
                    {selectionMode && deleteScope === 'selected' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(n._id)}
                        onChange={() => toggleSelect(n._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                        aria-label="Select notification"
                      />
                    )}
                    <span className="text-lg mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm leading-tight ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                        <p className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</p>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-normal break-words">{n.message}</p>
                      <p className="text-[11px] text-slate-500 mt-2 font-medium">Sent by: {senderLabel(n)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
