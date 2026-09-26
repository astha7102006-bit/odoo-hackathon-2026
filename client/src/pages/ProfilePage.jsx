import React from 'react';
import { User, CheckCircle } from 'lucide-react';
import PageHeading from '../components/PageHeading';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="User Profile"
        description="Demo workspace information."
      />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm max-w-xl transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 ring-4 ring-teal-500/20">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">StockSense Team</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inventory demo workspace</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
              <CheckCircle className="h-3 w-3" />
              Demo Mode
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
          <div className="flex justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Project</span>
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">StockSense</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Assigned Warehouse</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">Main Warehouse (WH-MAIN)</span>
          </div>
          <div className="flex justify-between text-sm py-1.5">
            <span className="text-slate-500 dark:text-slate-400">Role</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">Operations Manager</span>
          </div>
        </div>

      </div>
    </div>
  );
}
