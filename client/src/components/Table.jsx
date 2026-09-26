import React from 'react';
import EmptyState from './EmptyState';

export default function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records available',
  emptyDescription = 'Start by adding a new record to populate this table.',
  onRowClick,
}) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  scope="col"
                  className={`px-5 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {data.map((item, rowIndex) => (
              <tr
                key={item[keyField] || rowIndex}
                onClick={() => onRowClick && onRowClick(item)}
                className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/60 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key || colIndex}
                    className={`whitespace-nowrap px-5 py-4 text-slate-700 dark:text-slate-200 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(item, rowIndex) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
