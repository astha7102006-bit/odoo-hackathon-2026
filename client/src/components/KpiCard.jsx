import React from 'react';

export default function KpiCard({ title, value, icon: Icon, description, trend, variant = 'teal' }) {
  const iconBgClasses = {
    teal: 'bg-teal-50 text-teal-600 border border-teal-200',
    navy: 'bg-slate-100 text-slate-800 border border-slate-300',
    amber: 'bg-amber-50 text-amber-600 border border-amber-200',
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgClasses[variant] || iconBgClasses.teal}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-teal-600">
            {trend}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}
