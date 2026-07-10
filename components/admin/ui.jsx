'use client';

// Petites briques d'interface partagées par tout le dashboard

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid animate-fadein place-items-center overflow-y-auto bg-brand-night/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} animate-modalin overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(24,14,8,0.45)] ring-1 ring-black/5`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Bandeau dégradé */}
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-brand to-brand-deep px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="hidden h-8 w-1 rounded-full bg-white/60 sm:block" />
            <h2 className="font-heading text-lg font-bold">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-xl text-white transition hover:rotate-90 hover:bg-white/30"
          >
            ×
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
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
