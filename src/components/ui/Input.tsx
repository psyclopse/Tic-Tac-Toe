import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
          error ? "border-rose-500/70" : "border-slate-700 hover:border-slate-600"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
