import React from 'react';
import { Server, FileCode2 } from 'lucide-react';
import PageHeading from '../components/PageHeading';

export default function SettingsPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '(default: direct / proxy)';

  return (
    <div className="space-y-6">
      <PageHeading
        title="System Settings"
        description="Configuration and backend connectivity details for StockSense."
      />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Backend Connection
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Environment variable configured via client/.env.example
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Configured Endpoint</span>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">{apiBase}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Environment File</span>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">client/.env.example</div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <FileCode2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Active API Contract Routes (README.md)
          </h4>
          <ul className="space-y-1.5 font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <li>GET /api/products</li>
            <li>POST /api/products</li>
            <li>PATCH /api/products/:id</li>
            <li>GET /api/locations</li>
            <li>GET /api/stock</li>
            <li>POST /api/operations</li>
            <li>POST /api/operations/:id/validate</li>
            <li>GET /api/operations</li>
            <li>GET /api/moves</li>
            <li>GET /api/dashboard</li>
            <li>GET /api/alerts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
