import React from 'react';

export default function FormSelect({
  label,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  error,
  helperText,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full rounded-lg border bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-400 ${
          error
            ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-400'
            : 'border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-500/30'
        }`}
      >
        <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
      ) : null}
    </div>
  );
}
