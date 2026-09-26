import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ activeNav, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header
          activeNav={activeNav}
          onOpenMobile={() => setMobileOpen(true)}
          onNavigate={onNavigate}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
          StockSense &copy; 2026 &bull; Professional Inventory Management &bull; Built for Odoo Hackathon
        </footer>
      </div>
    </div>
  );
}
