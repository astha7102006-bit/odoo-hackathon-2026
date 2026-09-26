import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  History,
  Settings,
  User,
  X,
  Boxes,
  ArrowDownLeft,
} from 'lucide-react';

export default function Sidebar({
  activeNav,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      badge: null,
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: ArrowLeftRight,
      subItems: [
        { id: 'receipts', label: 'Receipts', icon: ArrowDownLeft },
        { id: 'operations', label: 'Transfer · Delivery · Adjust', icon: ArrowLeftRight },
      ],
    },
    {
      id: 'moves',
      label: 'Move History',
      icon: History,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">StockSense</span>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-teal-400">Inventory OS</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id || (item.subItems && item.subItems.some((s) => s.id === activeNav));

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (item.subItems) {
                      onNavigate('operations');
                    } else {
                      onNavigate(item.id);
                    }
                    onCloseMobile();
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-600/15 text-teal-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && !item.subItems && (
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  )}
                </button>

                {/* Sub-items (Operations -> Receipts) */}
                {item.subItems && (
                  <div className="ml-5 border-l border-slate-800 pl-3 space-y-1">
                    {item.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeNav === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            onNavigate(sub.id);
                            onCloseMobile();
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                            isSubActive
                              ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <SubIcon className="h-3.5 w-3.5" />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout Section */}
        <div className="border-t border-slate-800 p-3">
          <div className="rounded-lg bg-slate-800/60 p-3">
            <button
              onClick={() => {
                onNavigate('profile');
                onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-md text-left transition ${
                activeNav === 'profile' ? 'text-teal-400' : 'text-slate-200'
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600/20 text-teal-300 ring-2 ring-teal-500/30">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-xs font-semibold text-white">StockSense Team</div>
                <div className="truncate text-[11px] text-slate-400">Inventory Lead</div>
              </div>
            </button>

          </div>
        </div>
      </aside>
    </>
  );
}
