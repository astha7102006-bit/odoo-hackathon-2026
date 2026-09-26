import React from 'react';
import { Menu, Bell, ShieldCheck, Database } from 'lucide-react';

export default function Header({ onOpenMobile, activeNav }) {
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

        <button
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
