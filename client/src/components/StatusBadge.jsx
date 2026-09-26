import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'DONE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
        DONE
      </span>
    );
  }

  if (normalized === 'DRAFT') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        DRAFT
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-400/20">
      <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
      {normalized || 'UNKNOWN'}
    </span>
  );
}
