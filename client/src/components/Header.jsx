import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, ShieldCheck, Database, Sun, Moon } from 'lucide-react';
import VoiceGuide from './VoiceGuide';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function Header({ onOpenMobile, activeNav, onNavigate }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');
  const alertsRef = useRef(null);

  useEffect(() => {
    if (!alertsOpen) return;
    let active = true;
    setAlertsLoading(true);
    setAlertsError('');
    Promise.all([api.getProducts(), api.getStock(), api.getOperations()])
      .then(([products, stock, operations]) => {
        if (!active) return;
        const next = [];
        for (const product of products) {
          const total = stock
            .filter((item) => item.productId === product.id)
            .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
          if (total <= Number(product.reorderLevel ?? 0)) {
            next.push({
              id: `stock-${product.id}`,
              text: `${product.name}: ${total} ${product.uom || 'units'} left (reorder at ${product.reorderLevel ?? 0})`,
              nav: 'products',
            });
          }
        }
        for (const operation of operations.filter((item) => item.status === 'DRAFT')) {
          next.push({
            id: `draft-${operation.id}`,
            text: `${operation.type} draft awaiting validation`,
            nav: operation.type === 'RECEIPT' ? 'receipts' : 'operations',
          });
        }
        setAlerts(next);
      })
      .catch((error) => { if (active) setAlertsError(error.message || 'Unable to load alerts.'); })
      .finally(() => { if (active) setAlertsLoading(false); });

    const closeOnOutsideClick = (event) => {
      if (!alertsRef.current?.contains(event.target)) setAlertsOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setAlertsOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      active = false;
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [alertsOpen]);

  const titles = {
    dashboard: 'Dashboard',
    products: 'Products Catalog',
    operations: 'Operations',
    receipts: 'Receipts Operation',
    moves: 'Move History',
    settings: 'System Settings',
    profile: 'User Profile',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur sm:px-6 lg:px-8 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white lg:hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">StockSense</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              {titles[activeNav] || 'Operations'}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Compact Voice Guide for Navigation & Spoken Help */}
        <VoiceGuide activeNav={activeNav} onNavigate={onNavigate} />

        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* Backend Contract Badge */}
        <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 text-xs font-medium text-teal-800 dark:text-teal-300">
          <Database className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>API: /api/operations</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Demo Flow Ready</span>
        </div>

        <div className="relative" ref={alertsRef}>
          <button
            type="button"
            onClick={() => setAlertsOpen((open) => !open)}
            className="relative rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Notifications"
            aria-expanded={alertsOpen}
            aria-controls="stock-alerts-panel"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />}
          </button>
          {alertsOpen && (
            <div id="stock-alerts-panel" className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="region" aria-label="Stock alerts">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
              {alertsLoading ? <p className="text-sm text-slate-500">Loading alerts…</p>
                : alertsError ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{alertsError}</p>
                : alerts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No alerts right now.</p>
                : <div className="space-y-2">{alerts.map((alert) => (
                    <button key={alert.id} type="button" className="block w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-slate-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-slate-200" onClick={() => { onNavigate(alert.nav); setAlertsOpen(false); }}>
                      {alert.text}
                    </button>
                  ))}</div>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
