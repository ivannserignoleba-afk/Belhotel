'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db, formatPrice } from '../../lib/supabase';
import {
  ACK_DEADLINE_MS,
  SECTOR_LABELS,
  SECTOR_QR_TYPE,
  beep,
  formatChrono,
  notify,
  splitServeurOrders,
} from '../../lib/adminShared';
import { confirmAction, showError } from '../../lib/alerts';
import { Badge, Card, EmptyState, GhostBtn } from './ui';

const STEPS = ['Reçue', 'En préparation', 'Servie'];

function stepIndex(order) {
  if (order.status === 'delivered') return 2;
  if (order.status === 'preparing') return 1;
  return 0;
}

function pointLabel(order) {
  return (order.qr_points?.label || order.origin_label || '').trim();
}

// Suivi visuel de l'avancement, affiché une fois la commande prise en charge
function Progress({ order }) {
  const current = stepIndex(order);
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-2.5">
      {STEPS.map((label, index) => (
        <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.62rem] font-extrabold ${
              index <= current ? 'bg-brand-deep text-white' : 'bg-white text-brand-muted ring-1 ring-brand-line'
            }`}
          >
            {index + 1}
          </span>
          <span
            className={`truncate text-[0.72rem] font-bold uppercase tracking-wide ${
              index <= current ? 'text-brand-deep' : 'text-brand-muted'
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, now, ownerName, takeOver, busy, onReceive, onServe, onCancel }) {
  const age = now - new Date(order.created_at).getTime();
  const late = age > ACK_DEADLINE_MS;
  const received = Boolean(order.received_at);
  const ackDelay = received ? new Date(order.received_at).getTime() - new Date(order.created_at).getTime() : 0;
  const closed = ['delivered', 'cancelled'].includes(order.status);

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
        closed
          ? 'border-brand-line opacity-70'
          : takeOver
            ? 'border-red-300 ring-1 ring-red-200'
            : !received && late
              ? 'border-amber-400 ring-1 ring-amber-200'
              : 'border-brand-line'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block text-lg">{pointLabel(order)}</strong>
          {takeOver ? (
            <span className="text-xs font-semibold text-red-700">
              {ownerName ? `Assignée à ${ownerName} — non prise en charge` : 'Aucun serveur assigné'}
            </span>
          ) : null}
        </div>
        {closed ? (
          <Badge tone={order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-800'}>
            {order.status === 'cancelled' ? 'Annulée' : 'Servie'}
          </Badge>
        ) : received ? (
          <Badge tone="bg-green-100 text-green-800">Prise en charge</Badge>
        ) : (
          <Badge tone={late ? 'bg-red-100 text-red-700' : 'bg-brand-pale text-brand-deep'}>
            {formatChrono(age)}
          </Badge>
        )}
      </div>

      <div className="grid gap-2">
        {(order.order_items || []).map((line) => (
          <div key={line.id} className="flex items-center gap-2.5 text-[0.92rem]">
            {line.item_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={line.item_image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-brand-soft object-cover" />
            ) : (
              <span className="h-10 w-10 shrink-0 rounded-lg bg-brand-soft" />
            )}
            <span className="min-w-0 flex-1">
              {line.qty} × {line.item_name}
            </span>
            <span className="whitespace-nowrap text-brand-muted">{formatPrice(line.unit_price * line.qty)}</span>
          </div>
        ))}
      </div>

      {order.note ? (
        <p className="rounded-lg bg-brand-pale px-3 py-2 text-[0.88rem] font-semibold text-brand-deep">
          Note : {order.note}
        </p>
      ) : null}

      <div className="flex items-baseline justify-between border-t border-brand-line pt-2.5 font-bold">
        <span>Total</span>
        <strong className="text-brand-deep">{formatPrice(order.total)}</strong>
      </div>

      {closed ? null : received ? (
        <>
          <Progress order={order} />
          <p className="text-[0.78rem] text-brand-muted">Prise en charge en {formatChrono(ackDelay)}</p>
          <div className="flex flex-wrap gap-2">
            <GhostBtn green disabled={busy} onClick={() => onServe(order)}>
              Servie
            </GhostBtn>
            <GhostBtn
              danger
              disabled={busy || order.status !== 'sent'}
              title={
                order.status === 'sent'
                  ? 'Annuler la commande'
                  : 'La cuisine a commencé la préparation : l’annulation passe par le restaurant.'
              }
              onClick={() => onCancel(order)}
            >
              Annuler
            </GhostBtn>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onReceive(order)}
          className="w-full rounded-xl bg-green-700 py-4 text-[0.85rem] font-bold uppercase tracking-wider text-white transition hover:bg-green-800 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? 'Enregistrement...' : takeOver ? 'Reprendre cette commande' : 'Reçu'}
        </button>
      )}
    </article>
  );
}

export default function ServeurBoard({ staff, refreshTick, setBadge }) {
  const [orders, setOrders] = useState(null);
  const [names, setNames] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState(null);

  const sector = staff.sector;

  // Chrono : une seconde de plus à chaque battement
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!sector) {
      setOrders([]);
      return;
    }
    const select = '*, order_items(*), qr_points(*)';
    const base = () =>
      db
        .from('orders')
        .select(select)
        .eq('target', sector)
        .eq('origin_type', SECTOR_QR_TYPE[sector])
        .neq('status', 'reception')
        .order('created_at', { ascending: false });

    // Comme sur les tableaux du restaurant : l'historique récent, plus TOUTES
    // les commandes encore en cours, pour qu'aucune ne sorte de la fenêtre.
    const [{ data: activeRows }, { data: recentRows }, { data: staffRows }] = await Promise.all([
      base().in('status', ['sent', 'preparing']).limit(300),
      base().limit(40),
      db.from('admins').select('id, full_name, email'),
    ]);

    const merged = new Map();
    [...(activeRows || []), ...(recentRows || [])].forEach((order) => merged.set(order.id, order));
    setOrders([...merged.values()]);

    const map = {};
    (staffRows || []).forEach((member) => {
      map[member.id] = member.full_name || member.email;
    });
    setNames(map);
  }, [sector]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, refreshTick]);

  // Répartition : mes tables d'un côté, les commandes à reprendre de l'autre.
  // Une commande d'un collègue ne m'apparaît QUE s'il ne l'a pas prise en
  // charge dans la minute — ou si la table n'a aucun serveur assigné.
  const { mine, toTakeOver } = useMemo(
    () => splitServeurOrders(orders, staff.id, now),
    [orders, staff.id, now],
  );

  const pendingCount = mine.filter(
    (order) => ['sent', 'preparing'].includes(order.status) && !order.received_at,
  ).length;

  useEffect(() => {
    setBadge('my-tables', pendingCount + toTakeOver.length);
  }, [pendingCount, toTakeOver.length, setBadge]);

  // Alertes sonores. Au tout premier chargement on mémorise sans sonner,
  // sinon le poste carillonnerait pour tout ce qui était déjà à l'écran.
  const seenNew = useRef(new Set());
  const seenLate = useRef(new Set());
  const primed = useRef(false);

  useEffect(() => {
    if (!orders) return;
    if (!primed.current) {
      mine.forEach((order) => seenNew.current.add(order.id));
      toTakeOver.forEach((order) => seenLate.current.add(order.id));
      primed.current = true;
      return;
    }

    mine.forEach((order) => {
      if (seenNew.current.has(order.id)) return;
      seenNew.current.add(order.id);
      if (order.received_at || !['sent', 'preparing'].includes(order.status)) return;
      beep();
      notify('Nouvelle commande — Belhotel', `${pointLabel(order)} · ${formatPrice(order.total || 0)}`);
    });

    toTakeOver.forEach((order) => {
      if (seenLate.current.has(order.id)) return;
      seenLate.current.add(order.id);
      beep();
      const owner = order.qr_points?.assigned_to;
      notify(
        'Commande non prise en charge — Belhotel',
        owner
          ? `${pointLabel(order)}, assignée à ${names[owner] || 'un serveur'}, n’a pas été prise en charge.`
          : `${pointLabel(order)} n’a aucun serveur assigné.`,
      );
    });
  }, [orders, mine, toTakeOver, names]);

  async function update(order, patch) {
    setBusyId(order.id);
    const { error } = await db.from('orders').update(patch).eq('id', order.id);
    setBusyId(null);
    if (error) showError(error.message);
    else load();
  }

  const receive = (order) =>
    update(order, { received_at: new Date().toISOString(), received_by: staff.id });

  const serve = (order) => update(order, { status: 'delivered' });

  async function cancel(order) {
    const ok = await confirmAction(
      `Annuler la commande de ${pointLabel(order)} ?`,
      'Le client ne sera pas servi.',
      'Oui, annuler',
    );
    if (ok) update(order, { status: 'cancelled' });
  }

  if (!sector) {
    return (
      <EmptyState>
        Aucun pôle n’est défini sur votre compte. Demandez à la direction de vous rattacher au restaurant ou au bar
        depuis l’onglet Équipe.
      </EmptyState>
    );
  }

  if (orders === null) return <EmptyState>Chargement...</EmptyState>;

  const cardProps = (order, takeOver) => ({

    order,
    now,
    takeOver,
    ownerName: names[order.qr_points?.assigned_to] || null,
    busy: busyId === order.id,
    onReceive: receive,
    onServe: serve,
    onCancel: cancel,
  });

  const active = mine.filter((order) => !['delivered', 'cancelled'].includes(order.status));
  const done = mine.filter((order) => ['delivered', 'cancelled'].includes(order.status)).slice(0, 9);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[0.88rem] font-semibold text-brand-muted">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
          Temps réel actif · {SECTOR_LABELS[sector]}
        </span>
        <GhostBtn onClick={beep}>Tester le son</GhostBtn>
      </div>

      {toTakeOver.length ? (
        <Card className="mb-5 !border-red-300 !bg-red-50">
          <h2 className="mb-1 font-heading text-base font-bold text-red-800">À reprendre</h2>
          <p className="mb-4 text-[0.88rem] text-red-900/80">
            Ces commandes n’ont pas été prises en charge dans la minute. Le premier qui clique s’en occupe.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {toTakeOver.map((order) => (
              <OrderCard key={order.id} {...cardProps(order, true)} />
            ))}
          </div>
        </Card>
      ) : null}

      <h2 className="mb-3 font-heading text-base font-bold">Mes tables</h2>
      {active.length === 0 ? (
        <EmptyState>
          Aucune commande en cours sur vos tables. Les nouvelles arrivent ici automatiquement, avec le son.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((order) => (
            <OrderCard key={order.id} {...cardProps(order, false)} />
          ))}
        </div>
      )}

      {done.length ? (
        <>
          <h3 className="mb-3 mt-8 text-brand-muted">Historique récent</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {done.map((order) => (
              <OrderCard key={order.id} {...cardProps(order, false)} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
