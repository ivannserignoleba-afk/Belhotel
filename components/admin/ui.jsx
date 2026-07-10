'use client';

// Petites briques d'interface partagées par tout le dashboard

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-brand-night/55 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-lg text-brand-ink hover:bg-brand-pale"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.74rem] font-bold uppercase tracking-wider text-brand-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-brand-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/40';

export const submitCls =
  'w-full cursor-pointer rounded-lg bg-brand-dark px-4 py-3.5 text-[0.82rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep disabled:cursor-wait disabled:opacity-60';

export function PrimaryBtn({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-lg bg-brand-dark px-5 py-2.5 text-[0.78rem] font-bold uppercase tracking-wider text-white shadow-md shadow-brand-dark/25 transition hover:bg-brand-deep active:scale-95 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, danger = false, green = false, ...props }) {
  const tone = danger
    ? 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
    : green
      ? 'border-transparent bg-green-700 text-white hover:bg-green-800'
      : 'border-brand-line text-brand-ink hover:border-brand-dark hover:text-brand-deep';
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border px-3.5 py-2 text-[0.74rem] font-bold uppercase tracking-wide transition active:scale-95 ${tone} disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

export function Badge({ tone = 'bg-brand-pale text-brand-deep', children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold uppercase tracking-wide ${tone}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-brand-line bg-white p-5 shadow-[0_10px_30px_rgba(194,65,12,0.06)] transition hover:shadow-[0_14px_38px_rgba(194,65,12,0.1)] ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="py-8 text-center text-brand-muted">{children}</p>;
}

export function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`shrink-0 rounded-full border px-4 py-2 text-[0.82rem] font-semibold transition ${
        active
          ? 'border-brand-deep bg-brand-deep text-white'
          : 'border-brand-line bg-white text-brand-ink hover:border-brand-dark'
      }`}
    >
      {children}
    </button>
  );
}
