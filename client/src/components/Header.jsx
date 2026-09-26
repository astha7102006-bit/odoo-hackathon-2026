import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  ShieldCheck,
  Database,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  CheckCheck,
  X,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';

const READ_ALERTS_KEY = 'stocksense_read_alert_ids';

function getStoredReadIds() {
  try {
    const item = localStorage.getItem(READ_ALERTS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (_) {
    return [];
  }
}

function storeReadIds(ids) {
  try {
    localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(ids));
  } catch (_) {
    // Ignore storage quota errors
  }
}

function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_) {
    return '';
  }
}

export default function Header({ onOpenMobile, activeNav, onNavigate }) {
  const titles = {
    dashboard: 'Dashboard',
    products: 'Products Catalog',
    operations: 'Operations',
    receipts: 'Receipts Operation',
    moves: 'Move History',
    settings: 'System Settings',
    profile: 'User Profile',
  };

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState(getStoredReadIds);
  const dropdownRef = useRef(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAlerts();
      const list = Array.isArray(data) ? data : data.alerts || [];
      setAlerts(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Handle click outside & escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      storeReadIds(next);
    }
  };

  const markAllAsRead = () => {
    const allIds = alerts.map((a) => a.id);
    const unique = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(unique);
    storeReadIds(unique);
  };

  const handleAlertClick = (alert) => {
    markAsRead(alert.id);
    if (onNavigate) {
      if (alert.type === 'PENDING_OPERATION') {
        onNavigate('operations');
      } else if (alert.type === 'OUT_OF_STOCK' || alert.type === 'LOW_STOCK') {
        onNavigate('products');
      } else if (alert.type === 'DISCREPANCY') {
        onNavigate('moves');
      }
      setIsOpen(false);
    }
  };

  const unreadCount = alerts.filter((a) => !readIds.includes(a.id)).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">StockSense</span>
            <span className="text-slate-300">/</span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              {titles[activeNav] || 'Operations'}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Contract Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
          <Database className="h-3.5 w-3.5 text-teal-600" />
          <span>API: /api/operations</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="hidden md:inline">Demo Flow Ready</span>
        </div>

        {/* Real Inventory Alerts Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className={`relative rounded-lg p-2 transition ${
              isOpen
                ? 'bg-slate-100 text-teal-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            aria-label="Notifications"
            aria-expanded={isOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : alerts.length > 0 ? (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
            ) : null}
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Inventory Alerts</h3>
                  {unreadCount > 0 ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {alerts.length} total
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      title="Mark all as read"
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition"
                    >
                      <CheckCheck className="h-3.5 w-3.5 text-teal-600" />
                      <span className="hidden sm:inline">Mark read</span>
                    </button>
                  )}
                  <button
                    onClick={fetchAlerts}
                    title="Refresh alerts"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 sm:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Dropdown Content */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {loading && alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Checking live inventory alerts...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center">
                    <AlertCircle className="mx-auto h-6 w-6 text-rose-500 mb-1.5" />
                    <p className="text-xs font-medium text-rose-700">{error}</p>
                    <button
                      onClick={fetchAlerts}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Retry
                    </button>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2.5">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">You're all caught up!</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                      All stock levels are above reorder thresholds and no draft operations need attention.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const isUnread = !readIds.includes(alert.id);
                    const isError = alert.severity === 'error';
                    const isWarning = alert.severity === 'warning';

                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        className={`group flex items-start gap-3 p-3.5 transition cursor-pointer ${
                          isUnread ? 'bg-slate-50/80 hover:bg-slate-100/90' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isError
                              ? 'bg-rose-100 text-rose-600'
                              : isWarning
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-sky-100 text-sky-600'
                          }`}
                        >
                          {isError ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : isWarning ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs truncate ${
                                isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                              }`}
                            >
                              {alert.title}
                            </h4>
                            {isUnread && (
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" title="Unread alert" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                            {alert.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${
                                isError
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                  : isWarning
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                              }`}
                            >
                              {isError ? 'Critical' : isWarning ? 'Warning' : 'Notice'}
                            </span>
                            <span>{formatTime(alert.createdAt)}</span>
                          </div>
                        </div>

                        {onNavigate && (
                          <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-slate-500 transition self-center shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Database className="h-3 w-3 text-teal-600" />
                  <span>Live inventory contract</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">/api/alerts</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
