import React from 'react';
import { User, Shield, LogOut, CheckCircle } from 'lucide-react';
import PageHeading from '../components/PageHeading';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="User Profile"
        description="Session account details and permissions."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm max-w-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600/10 text-teal-600 ring-4 ring-teal-500/20">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Anjali Yadav</h3>
            <p className="text-xs text-slate-500">Inventory Lead / Operator</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
              <CheckCircle className="h-3 w-3" />
              Full Operations Access
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 space-y-3">
          <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Branch</span>
            <span className="font-mono text-xs font-semibold text-slate-800">feature/anjali-stocksense-frontend</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
            <span className="text-slate-500">Assigned Warehouse</span>
            <span className="font-medium text-slate-800">Main Warehouse (WH-MAIN)</span>
          </div>
          <div className="flex justify-between text-sm py-1.5">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-800">Operations Manager</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => alert('Logged out successfully.')}
            className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
          >
            <LogOut className="h-4 w-4" />
            End Session / Log out
          </button>
        </div>
      </div>
    </div>
  );
}
