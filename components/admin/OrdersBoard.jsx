'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice } from '../../lib/supabase';
import { STATUS_LABELS, STATUS_BADGE, timeAgo, beep, printOrderTicket } from '../../lib/adminShared';
import { Badge, Chip, EmptyState, GhostBtn } from './ui';
import { confirmAction, showError } from '../../lib/alerts';

const BOARDS = {
  'orders-rooms': {
    context: 'reception',
    active: ['reception'],
    kpis: [
      ['reception', 'À traiter'],
      ['sent', 'Envoyées'],
      ['delivered', 'Livrées'],
      ['cancelled', 'Annulées'],
    ],
    filter: (query) => query.eq('origin_type', 'room'),
  },
  'orders-resto': {
    context: 'kitchen',
    active: ['sent', 'preparing'],
    kpis: [
      ['sent', 'En attente'],
      ['preparing', 'En préparation'],
      ['delivered', 'Livrées'],
      ['cancelled', 'Annulées'],
    ],
    filter: (query) => query.eq('target', 'resto').neq('status', 'reception'),
  },
  'orders-bar': {
    context: 'kitchen',
    active: ['sent', 'preparing'],
    kpis: [
      ['sent', 'En attente'],
      ['preparing', 'En préparation'],
      ['delivered', 'Livrées'],
      ['cancelled', 'Annulées'],
    ],
    filter: (query) => query.eq('target', 'bar').neq('status', 'reception'),
  },
};

const KPI_COLOR = {
  reception: 'text-brand-deep',
  sent: 'text-blue-700',
  preparing: 'text-amber-700',
  delivered: 'text-green-700',
  cancelled: 'text-gray-500',
};

export default function OrdersBoard({ boardKey, refreshTick, setBadge }) {
  const config = BOARDS[boardKey];
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('all');
  const [names, setNames] = useState({});

  const load = useCallback(async () => {
    // Deux requêtes : l'historique récent, et TOUTES les commandes encore à
    // traiter. Sans la seconde, une commande oubliée depuis longtemps sortirait
    // des 80 plus récentes et disparaîtrait silencieusement du tableau.
    const recent = () =>
      config
        .filter(db.from('orders').select('*, order_items(*), qr_points(*)'))
        .order('created_at', { ascending: false });

    const [{ data: activeRows }, { data: recentRows }, { data: staffRows }] = await Promise.all([
      recent().in('status', config.active).limit(300),
      recent().limit(80),
      db.from('admins').select('id, full_name, email'),
    ]);

    const nameMap = {};
    (staffRows || []).forEach((member) => {
      nameMap[member.id] = member.full_name || member.email;
    });
    setNames(nameMap);

    const merged = new Map();
    [...(activeRows || []), ...(recentRows || [])].forEach((order) => merged.set(order.id, order));
    const data = [...merged.values()];

    setOrders(data);
    setBadge(boardKey, data.filter((order) => config.active.includes(order.status)).length);
  }, [boardKey, config, setBadge]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, refreshTick]);

  if (orders === null) return <EmptyState>Chargement...</EmptyState>;

  const counts = { all: orders.length };
  ['reception', 'sent', 'preparing', 'delivered', 'cancelled'].forEach((status) => {
    counts[status] = orders.filter((order) => order.status === status).length;
  });
  const revenue = orders
    .filter((order) => ['reception', 'sent', 'preparing'].includes(order.status))
    .reduce((total, order) => total + (order.total || 0), 0);

  const visible = (filter === 'all' ? orders : orders.filter((order) => order.status === filter)).sort((a, b) => {
    const aActive = config.active.includes(a.status) ? 0 : 1;
    const bActive = config.active.includes(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const actionable = config.context === 'reception' ? ['reception'] : ['sent', 'preparing'];

  async function updateStatus(id, status) {
    if (status === 'cancelled') {
      const ok = await confirmAction('Annuler cette commande ?', 'Le client ne sera pas servi.', 'Oui, annuler');
      if (!ok) return;
    }
    const { error } = await db.from('orders').update({ status }).eq('id', id);
    if (error) showError(error.message);
    else load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-[0.88rem] font-semibold text-brand-muted">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
          Temps réel actif
        </span>
        <GhostBtn onClick={beep}>Tester le son</GhostBtn>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {config.kpis.map(([status, label]) => (
          <div key={status} className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
            <span className="block text-[0.7rem] font-bold uppercase tracking-wider text-brand-muted">{label}</span>
            <strong className={`font-heading text-2xl ${KPI_COLOR[status]}`}>{counts[status]}</strong>
          </div>
        ))}
        <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
          <span className="block text-[0.7rem] font-bold uppercase tracking-wider text-brand-muted">
            Revenus en cours
          </span>
          <strong className="font-heading text-xl text-brand-ink">{formatPrice(revenue)}</strong>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[['all', 'Toutes'], ...config.kpis].map(([value, label]) => (
          <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
            {label} ({counts[value]})
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="py-14 text-center text-brand-muted">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-brand-soft p-3.5"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <p className="font-bold text-brand-ink">Aucune commande</p>
          <p className="text-sm">Les nouvelles commandes apparaîtront ici en temps réel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const withActions = actionable.includes(order.status);
            const originName = (order.origin_type === 'room' ? 'Chambre ' : '') + (order.origin_label || '').trim();

            // Suivi du serveur : seules les tables et les salons ont un
            // responsable ; les commandes des chambres passent par la réception.
            const ownerName = names[order.qr_points?.assigned_to] || null;
            const takerName = names[order.received_by] || null;
            const waiting = ['sent', 'preparing'].includes(order.status) && !order.received_at;
            const serveurLine =
              order.origin_type === 'room'
                ? null
                : order.received_at
                  ? `Pris en charge par ${takerName || 'un serveur'}`
                  : ownerName
                    ? `${ownerName}${waiting ? ' — pas encore pris en charge' : ''}`
                    : 'Aucun serveur assigné';

            return (
              <article
                key={order.id}
                className={`flex flex-col gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-sm ${
                  ['delivered', 'cancelled'].includes(order.status) ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <strong className="block">{originName}</strong>
                    <span className="text-xs text-brand-muted">{timeAgo(order.created_at)}</span>
                  </div>
                  <Badge tone={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                </div>
                {serveurLine ? (
                  <p
                    className={`text-[0.82rem] font-semibold ${
                      order.received_at ? 'text-green-700' : waiting ? 'text-red-700' : 'text-brand-muted'
                    }`}
                  >
                    {serveurLine}
                  </p>
                ) : null}
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
                <div className="flex flex-wrap gap-2">
                  <GhostBtn onClick={() => printOrderTicket(order)}>Imprimer</GhostBtn>
                </div>
                {withActions ? (
                  <div className="flex flex-wrap gap-2">
                    {config.context === 'reception' && order.status === 'reception' ? (
                      <>
                        <GhostBtn green onClick={() => updateStatus(order.id, 'sent')}>
                          {order.target === 'resto' ? 'Envoyer à la restauration' : 'Envoyer au barman'}
                        </GhostBtn>
                        <GhostBtn danger onClick={() => updateStatus(order.id, 'cancelled')}>
                          Annuler
                        </GhostBtn>
                      </>
                    ) : null}
                    {config.context === 'kitchen' && order.status === 'sent' ? (
                      <>
                        <GhostBtn green onClick={() => updateStatus(order.id, 'preparing')}>
                          Commencer la préparation
                        </GhostBtn>
                        <GhostBtn danger onClick={() => updateStatus(order.id, 'cancelled')}>
                          Annuler
                        </GhostBtn>
                      </>
                    ) : null}
                    {config.context === 'kitchen' && order.status === 'preparing' ? (
                      <GhostBtn green onClick={() => updateStatus(order.id, 'delivered')}>
                        Marquer comme livrée
                      </GhostBtn>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
