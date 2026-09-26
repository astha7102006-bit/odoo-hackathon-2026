import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading inventory data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-9 w-9 animate-spin text-teal-600 mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
