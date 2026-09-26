import React from 'react';
import { Settings, Shield, Server, FileCode2 } from 'lucide-react';
import PageHeading from '../components/PageHeading';

export default function SettingsPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '(default: direct / proxy)';

  return (
    <div className="space-y-6">
      <PageHeading
        title="System Settings"
        description="Configuration and backend connectivity details for StockSense."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Server className="h-5 w-5 text-teal-600" />
            Backend Connection
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Environment variable configured via client/.env.example
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <span className="text-xs font-semibold uppercase text-slate-500">Configured Endpoint</span>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900">{apiBase}</div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <span className="text-xs font-semibold uppercase text-slate-500">Environment File</span>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900">client/.env.example</div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
            <FileCode2 className="h-4 w-4 text-teal-600" />
            Active API Contract Routes (README.md)
          </h4>
          <ul className="space-y-1.5 font-mono text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <li>GET /api/products</li>
            <li>GET /api/locations</li>
            <li>GET /api/stock</li>
            <li>POST /api/operations</li>
            <li>POST /api/operations/:id/validate</li>
            <li>GET /api/operations</li>
            <li>GET /api/moves</li>
            <li>GET /api/dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
