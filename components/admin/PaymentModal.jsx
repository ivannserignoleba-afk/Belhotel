'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/supabase';
import {
  PAYMENT_METHODS,
  SPLIT_SHORTCUTS,
  cashToRegister,
  changeDue,
  completeSplit,
  formatFcfa,
  momoToRegister,
  paymentIssue,
  splitShortcut,
  toAmount,
} from '../../lib/paiement.mjs';
import { showError, toastSuccess } from '../../lib/alerts';
import { Modal } from './ui';

const ICONS = {
  cash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  mobile_money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="14" height="20" x="5" y="2" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  mixed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <path d="M3 12h18" />
    </svg>
  ),
};

// Champ de saisie d'un montant en FCFA : chiffres uniquement, gros caractères
function AmountInput({ label, value, onChange, tone = 'brand', disabled = false }) {
  const ring = tone === 'green' ? 'focus:border-green-600 focus:ring-green-500/30' : 'focus:border-brand focus:ring-brand/30';
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.72rem] font-bold uppercase tracking-wider text-brand-muted">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={value === '' ? '' : Number(value).toLocaleString('fr-FR')}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          className={`w-full rounded-xl border border-brand-line bg-white px-4 py-3 pr-16 text-right font-heading text-xl font-bold tabular-nums text-brand-ink outline-none focus:ring-2 disabled:bg-brand-soft disabled:opacity-60 ${ring}`}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-brand-muted">
          FCFA
        </span>
      </div>
    </label>
  );
}

export default function PaymentModal({ order, onClose, onPaid }) {
  const total = toAmount(order?.total);
  const [method, setMethod] = useState('cash');
  const [split, setSplit] = useState({ cash: 0, momo: 0 });
  const [cashGiven, setCashGiven] = useState('');
  const [busy, setBusy] = useState(false);

  // À chaque ouverture on repart d'un écran vierge, moitié-moitié pour le mixte
  useEffect(() => {
    if (!order) return;
    setMethod('cash');
    setSplit(splitShortcut(toAmount(order.total), 0.5));
    setCashGiven('');
    setBusy(false);
  }, [order]);

  const cashPart = useMemo(() => cashToRegister(total, method, split), [total, method, split]);
  const momoPart = useMemo(() => momoToRegister(total, method, split), [total, method, split]);
  const issue = paymentIssue(total, method, split, cashGiven);
  const rendu = changeDue(cashGiven === '' ? cashPart : cashGiven, cashPart);

  async function submit() {
    if (issue || busy) return;
    setBusy(true);
    const { error } = await db.rpc('process_order_payment', {
      p_order_id: order.id,
      p_method: method,
      p_cash: cashPart,
      p_momo: momoPart,
    });
    setBusy(false);

    if (error) {
      const message = error.message || '';
      if (message.includes('CAISSE_FERMEE')) {
        showError('La caisse de ce pôle est fermée. Ouvrez-la avant d’encaisser.');
      } else if (message.includes('DEJA_PAYEE')) {
        showError('Cette commande a déjà été encaissée.');
      } else if (message.includes('ACCES_REFUSE')) {
        showError('Cette commande relève d’un autre pôle.');
      } else if (message.includes('SPLIT_INVALIDE')) {
        showError('Les deux parts ne correspondent pas au total de la commande.');
      } else {
        showError(message);
      }
      return;
    }

    toastSuccess(`Encaissé : ${formatFcfa(total)}`);
    onPaid();
  }

  return (
    <Modal open={Boolean(order)} onClose={onClose} title="Encaisser la commande">
      {order ? (
        <div className="grid gap-5">
          {/* Total — bandeau sombre */}
          <div className="rounded-2xl bg-brand-night px-5 py-4 text-white">
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white/50">
              {(order.origin_type === 'room' ? 'Chambre ' : '') + (order.origin_label || '').trim()}
            </span>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-[0.82rem] text-white/70">Total à régler</span>
              <strong className="font-heading text-3xl tabular-nums">{formatFcfa(total)}</strong>
            </div>
          </div>

          {/* Moyen de paiement */}
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value);
                  setCashGiven('');
                  if (value === 'mixed') setSplit(splitShortcut(total, 0.5));
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3.5 text-[0.8rem] font-bold transition ${
                  method === value
                    ? 'border-brand-deep bg-brand-deep text-white shadow-md'
                    : 'border-brand-line bg-white text-brand-ink hover:border-brand-dark'
                }`}
              >
                {ICONS[value]}
                {label}
              </button>
            ))}
          </div>

          {/* Répartition du mixte */}
          {method === 'mixed' ? (
            <div className="grid gap-3 rounded-2xl border border-brand-line bg-brand-soft p-4">
              <div className="flex flex-wrap gap-2">
                {SPLIT_SHORTCUTS.map(([label, ratio]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSplit(splitShortcut(total, ratio))}
                    className="rounded-full border border-brand-line bg-white px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-ink transition hover:border-brand-dark hover:text-brand-deep"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <AmountInput
                  label="Part espèces"
                  value={split.cash}
                  onChange={(value) => setSplit(completeSplit(total, value, 'cash'))}
                />
                <AmountInput
                  label="Part mobile money"
                  value={split.momo}
                  onChange={(value) => setSplit(completeSplit(total, value, 'momo'))}
                />
              </div>
              <p className="text-[0.8rem] text-brand-muted">
                Saisissez une part, l’autre se complète automatiquement.
              </p>
            </div>
          ) : null}

          {/* Espèces reçues et monnaie */}
          {cashPart > 0 ? (
            <div className="grid gap-3">
              <AmountInput
                label={`Espèces reçues du client (part due : ${formatFcfa(cashPart)})`}
                value={cashGiven}
                onChange={setCashGiven}
                tone="green"
              />
              {rendu > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-200">
                  <span className="text-[0.85rem] font-bold uppercase tracking-wide text-green-800">
                    Monnaie à rendre
                  </span>
                  <strong className="font-heading text-2xl tabular-nums text-green-800">{formatFcfa(rendu)}</strong>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Récapitulatif de ce qui entre en caisse */}
          <div className="grid gap-1.5 rounded-xl border border-brand-line px-4 py-3 text-[0.9rem]">
            <div className="flex justify-between">
              <span className="text-brand-muted">Part Espèces</span>
              <strong className="tabular-nums">{formatFcfa(cashPart)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Part MoMo</span>
              <strong className="tabular-nums">{formatFcfa(momoPart)}</strong>
            </div>
          </div>

          {issue ? <p className="font-semibold text-red-700">{issue}</p> : null}

          <button
            type="button"
            disabled={Boolean(issue) || busy}
            onClick={submit}
            className="w-full rounded-xl bg-green-700 py-4 text-[0.85rem] font-bold uppercase tracking-wider text-white transition hover:bg-green-800 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? 'Encaissement...' : `Encaisser ${formatFcfa(total)}`}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
