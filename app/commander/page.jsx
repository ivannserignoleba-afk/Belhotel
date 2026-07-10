'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, formatPrice } from '../../lib/supabase';

const TABS = {
  room: [
    { key: 'resto', label: 'Restaurant' },
    { key: 'bar', label: 'Bar' },
    { key: 'service', label: 'Demandes' },
  ],
  table: [{ key: 'resto', label: 'Restaurant' }],
  salon: [{ key: 'bar', label: 'Bar' }],
};

const CATEGORY_TITLES = {
  resto: { standard: 'Menu Standard', vip: 'Menu VIP', vvip: 'Menu VVIP' },
  bar: { standard: 'Bar Standard', vip: 'Salon VIP', vvip: 'Expérience VVIP' },
};

const SUCCESS_MESSAGES = {
  room: 'La réception a bien reçu votre commande et s’en occupe immédiatement.',
  table: 'La cuisine a bien reçu votre commande. Elle vous sera servie à votre table.',
  salon: 'Le bar a bien reçu votre commande. Elle vous sera servie dans votre salon.',
};

const SERVICE_CATEGORIES = ['Serviettes', 'Climatisation', 'Ménage', 'Autre'];

function Stepper({ qty, onChange }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-brand-dark text-white">
      <button type="button" aria-label="Retirer" onClick={() => onChange(qty - 1)} className="h-9 w-9 text-lg font-bold">
        −
      </button>
      <span className="min-w-[22px] text-center text-[0.95rem] font-extrabold">{qty}</span>
      <button type="button" aria-label="Ajouter" onClick={() => onChange(qty + 1)} className="h-9 w-9 text-lg font-bold">
        +
      </button>
    </span>
  );
}

function CommanderInner() {
  const code = (useSearchParams().get('c') || '').trim();

  const [state, setState] = useState('loading'); // loading | error | ready
  const [point, setPoint] = useState(null);
  const [tab, setTab] = useState(null);
  const [menus, setMenus] = useState({ resto: null, bar: null });
  const [cart, setCart] = useState({}); // clé target:id → { id, target, name, price, qty }
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [cartError, setCartError] = useState('');
  const [success, setSuccess] = useState(false);
  const [serviceCat, setServiceCat] = useState(null);
  const [serviceMsg, setServiceMsg] = useState('');
  const [serviceFeedback, setServiceFeedback] = useState(null); // {ok, text}

  useEffect(() => {
    if (!code) {
      setState('error');
      return;
    }
    db.from('qr_points')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          setState('error');
          return;
        }
        setPoint(data);
        setTab(TABS[data.type][0].key);
        const targets = TABS[data.type].filter((item) => item.key !== 'service').map((item) => item.key);
        const loaded = {};
        for (const target of targets) {
          const table = target === 'resto' ? 'restaurant_menu' : 'bar_menu';
          const { data: items } = await db
            .from(table)
            .select('*')
            .or('stock_qty.is.null,stock_qty.gt.0')
            .order('price', { ascending: true });
          loaded[target] = items || [];
        }
        setMenus((current) => ({ ...current, ...loaded }));
        setState('ready');
      });
  }, [code]);

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartCount = cartLines.reduce((total, line) => total + line.qty, 0);
  const cartTotal = cartLines.reduce((total, line) => total + line.qty * line.price, 0);

  function setQty(target, item, qty) {
    const key = `${target}:${item.id}`;
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[key];
      else next[key] = { id: item.id, target, name: item.name, price: item.price, qty };
      return next;
    });
  }

  async function submitOrder() {
    if (!cartCount || sending) return;
    setSending(true);
    setCartError('');

    const groups = {};
    cartLines.forEach((line) => {
      (groups[line.target] = groups[line.target] || []).push({ id: line.id, qty: line.qty });
    });

    for (const target of Object.keys(groups)) {
      const { error } = await db.rpc('place_order', {
        p_code: code,
        p_target: target,
        p_note: note.trim() || null,
        p_items: groups[target],
      });
      if (error) {
        setSending(false);
        if ((error.message || '').includes('STOCK_INSUFFISANT')) {
          const itemName = error.message.split(':')[1] || 'un article';
          setCartError(`Stock insuffisant pour ${itemName}. Réduisez la quantité.`);
        } else {
          setCartError('Une erreur est survenue. Veuillez réessayer.');
        }
        return;
      }
    }

    setSending(false);
    setCart({});
    setNote('');
    setCartOpen(false);
    setSuccess(true);
  }

  async function submitService() {
    setServiceFeedback(null);
    if (!serviceCat) {
      setServiceFeedback({ ok: false, text: 'Choisissez d’abord le type de demande.' });
      return;
    }
    const { error } = await db.from('service_requests').insert([
      {
        qr_point_id: point.id,
        origin_label: point.label,
        category: serviceCat,
        message: serviceMsg.trim() || null,
      },
    ]);
    if (error) {
      setServiceFeedback({ ok: false, text: 'Une erreur est survenue. Veuillez réessayer.' });
      return;
    }
    setServiceFeedback({ ok: true, text: 'Demande envoyée ! La réception arrive.' });
    setServiceCat(null);
    setServiceMsg('');
  }

  const pointLabel = point ? (point.type === 'room' ? `Chambre ${point.label.trim()}` : point.label.trim()) : '';

  return (
    <div className="min-h-screen bg-brand-soft pb-32">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-brand-night px-5 py-3.5 text-white">
        <span className="font-heading text-lg font-extrabold tracking-[0.2em]">
          BEL<span className="text-brand">HOTEL</span>
        </span>
        {pointLabel ? (
          <span className="max-w-[60%] truncate rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[0.82rem] font-bold">
            {pointLabel}
          </span>
        ) : null}
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-5">
        {state === 'loading' ? <p className="py-20 text-center text-brand-muted">Chargement...</p> : null}

        {state === 'error' ? (
          <div className="py-20 text-center">
            <h2 className="text-xl font-bold">QR code introuvable</h2>
            <p className="mt-2 text-brand-muted">
              Ce code de commande n’est pas valide ou n’est plus actif. Rapprochez-vous de la réception.
            </p>
          </div>
        ) : null}

        {state === 'ready' ? (
          <>
            {TABS[point.type].length > 1 ? (
              <nav className="sticky top-16 z-30 mb-5 flex gap-2 rounded-xl border border-brand-line bg-white p-1.5 shadow">
                {TABS[point.type].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`flex-1 rounded-lg px-2 py-2.5 text-[0.88rem] font-bold ${
                      tab === item.key ? 'bg-brand-dark text-white' : 'text-brand-muted'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : null}

            {['resto', 'bar'].map((target) =>
              tab === target ? (
                <section key={target}>
                  {(menus[target] || []).length === 0 ? (
                    <p className="py-10 text-center text-brand-muted">
                      Le menu arrive bientôt. Contactez la réception.
                    </p>
                  ) : (
                    ['standard', 'vip', 'vvip'].map((category) => {
                      const items = (menus[target] || []).filter((item) => item.category === category);
                      if (!items.length) return null;
                      return (
                        <div key={category} className="mb-7">
                          <h2 className="mb-3 text-xl font-bold">{CATEGORY_TITLES[target][category]}</h2>
                          {items.map((item) => {
                            const qty = cart[`${target}:${item.id}`]?.qty || 0;
                            return (
                              <article
                                key={item.id}
                                className="mb-3 flex gap-3.5 rounded-2xl border border-brand-line bg-white p-3 shadow-sm"
                              >
                                {item.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    loading="lazy"
                                    className="h-[86px] w-[86px] shrink-0 rounded-xl bg-brand-soft object-cover"
                                  />
                                ) : (
                                  <div className="h-[86px] w-[86px] shrink-0 rounded-xl bg-brand-soft" />
                                )}
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <h3 className="font-sans text-base font-bold">{item.name}</h3>
                                  {item.description ? (
                                    <p className="line-clamp-2 text-[0.85rem] text-brand-muted">{item.description}</p>
                                  ) : null}
                                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                                    <span className="font-extrabold text-brand-deep">{formatPrice(item.price)}</span>
                                    {qty === 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => setQty(target, item, 1)}
                                        className="rounded-lg border border-brand-dark px-4 py-2 text-[0.78rem] font-bold uppercase tracking-wide text-brand-deep hover:bg-brand-pale"
                                      >
                                        Ajouter
                                      </button>
                                    ) : (
                                      <Stepper qty={qty} onChange={(value) => setQty(target, item, value)} />
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </section>
              ) : null,
            )}

            {tab === 'service' ? (
              <section className="rounded-2xl border border-brand-line bg-white p-5 shadow">
                <h2 className="text-xl font-bold">Une demande ? On s’en occupe.</h2>
                <p className="mt-1 text-[0.92rem] text-brand-muted">
                  Sélectionnez votre besoin, la réception est prévenue immédiatement.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {SERVICE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setServiceCat(category)}
                      className={`rounded-xl border px-3 py-3.5 font-bold ${
                        serviceCat === category
                          ? 'border-brand-dark bg-brand-pale text-brand-deep'
                          : 'border-brand-line text-brand-ink'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={serviceMsg}
                  onChange={(event) => setServiceMsg(event.target.value)}
                  placeholder="Précisez votre demande (facultatif)..."
                  className="mt-3.5 w-full rounded-xl border border-brand-line px-4 py-3 outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={submitService}
                  className="mt-3.5 w-full rounded-lg bg-brand-dark py-3.5 text-[0.82rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep"
                >
                  Envoyer la demande
                </button>
                {serviceFeedback ? (
                  <p className={`mt-3 text-center font-semibold ${serviceFeedback.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {serviceFeedback.text}
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Barre panier flottante */}
      {cartCount > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 z-50 flex w-[min(580px,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-2xl bg-brand-dark px-5 py-4 font-bold text-white shadow-2xl hover:bg-brand-deep"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[0.85rem] text-brand-deep">
            {cartCount}
          </span>
          Voir ma commande
          <strong className="ml-auto">{formatPrice(cartTotal)}</strong>
        </button>
      ) : null}

      {/* Panneau panier */}
      {cartOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-night/55" onClick={() => setCartOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">Ma commande</h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setCartOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid gap-2.5">
              {cartLines.map((line) => (
                <div
                  key={`${line.target}:${line.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand-line px-3.5 py-3"
                >
                  <div>
                    <strong className="block text-[0.95rem]">{line.name}</strong>
                    <span className="text-[0.85rem] text-brand-muted">{formatPrice(line.price)}</span>
                  </div>
                  <Stepper
                    qty={line.qty}
                    onChange={(value) => {
                      setQty(line.target, { id: line.id, name: line.name, price: line.price }, value);
                      if (value <= 0 && cartCount - line.qty <= 0) setCartOpen(false);
                    }}
                  />
                </div>
              ))}
            </div>
            <textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Une précision pour votre commande ? (facultatif)"
              className="mt-3.5 w-full rounded-xl border border-brand-line px-4 py-3 outline-none focus:border-brand"
            />
            <div className="mt-3 flex items-baseline justify-between font-bold">
              <span>Total</span>
              <strong className="text-xl text-brand-deep">{formatPrice(cartTotal)}</strong>
            </div>
            <button
              type="button"
              disabled={sending}
              onClick={submitOrder}
              className="mt-4 w-full rounded-lg bg-brand-dark py-4 text-[0.85rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {sending ? 'Envoi en cours...' : 'Envoyer la commande'}
            </button>
            {cartError ? <p className="mt-2.5 text-center font-semibold text-red-700">{cartError}</p> : null}
          </div>
        </div>
      ) : null}

      {/* Confirmation */}
      {success ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-white/95 p-6">
          <div className="max-w-md text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 h-16 w-16 text-green-600"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2 className="text-2xl font-bold">Commande envoyée !</h2>
            <p className="mt-2 text-brand-muted">{point ? SUCCESS_MESSAGES[point.type] : ''}</p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-6 rounded-lg bg-brand-dark px-6 py-3.5 text-[0.82rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep"
            >
              Commander autre chose
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CommanderPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-brand-muted">Chargement...</p>}>
      <CommanderInner />
    </Suspense>
  );
}
