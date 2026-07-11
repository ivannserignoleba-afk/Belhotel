'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice } from '../../lib/supabase';
import { showError } from '../../lib/alerts';
import { Card, Chip, EmptyState } from './ui';

const PERIODS = [
  ['today', 'Aujourd’hui', 1],
  ['7', '7 jours', 7],
  ['14', '14 jours', 14],
  ['30', '30 jours', 30],
  ['all', 'Tout', null],
];

const KPI_ICONS = {
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
      <path d="M5 20h14" />
    </svg>
  ),
};

export default function StatsPanel({ refreshTick }) {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const days = PERIODS.find(([value]) => value === period)[2];
    let since = null;
    if (days) {
      since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (days - 1));
    }

    let query = db.from('orders').select('*, order_items(item_name, qty, unit_price)').limit(2000);
    if (since) query = query.gte('created_at', since.toISOString());
    const [{ data: orders }, requestsRes] = await Promise.all([
      query,
      db.from('service_requests').select('*', { count: 'exact', head: true }).neq('status', 'done'),
    ]);

    setData({ orders: orders || [], openRequests: requestsRes.count ?? 0, days });
  }, [period]);

  useEffect(() => {
    load();
  }, [load, refreshTick]);

  const valid = (data?.orders || []).filter((order) => order.status !== 'cancelled');
  const revenue = valid.reduce((total, order) => total + (order.total || 0), 0);
  const average = valid.length ? Math.round(revenue / valid.length) : 0;

  const byDay = new Map();
  valid.forEach((order) => {
    const day = order.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + (order.total || 0));
  });
  let bestDay = null;
  byDay.forEach((total, day) => {
    if (!bestDay || total > bestDay.total) bestDay = { day, total };
  });

  const chartSpan = data?.days || 30;
  const chartDays = [];
  if (data) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (chartSpan - 1));
    for (let index = 0; index < chartSpan; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      chartDays.push({
        key,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        total: byDay.get(key) || 0,
      });
    }
  }
  const maxTotal = Math.max(...chartDays.map((day) => day.total), 1);

  const bySection = { resto: { count: 0, revenue: 0 }, bar: { count: 0, revenue: 0 } };
  const roomOrders = { count: 0, revenue: 0 };
  valid.forEach((order) => {
    bySection[order.target].count += 1;
    bySection[order.target].revenue += order.total || 0;
    if (order.origin_type === 'room') {
      roomOrders.count += 1;
      roomOrders.revenue += order.total || 0;
    }
  });

  const itemTotals = new Map();
  valid.forEach((order) => {
    (order.order_items || []).forEach((line) => {
      const entry = itemTotals.get(line.item_name) || { qty: 0, revenue: 0 };
      entry.qty += line.qty;
      entry.revenue += line.qty * line.unit_price;
      itemTotals.set(line.item_name, entry);
    });
  });
  const topItems = [...itemTotals.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 6);
  const maxQty = topItems[0]?.[1].qty || 1;

  const KPIS = [
    { label: 'Chiffre d’affaires', value: formatPrice(revenue), icon: 'wallet', tone: 'bg-green-100 text-green-700' },
    { label: 'Commandes', value: valid.length, icon: 'receipt', tone: 'bg-blue-100 text-blue-700' },
    { label: 'Ticket moyen', value: formatPrice(average), icon: 'target', tone: 'bg-amber-100 text-amber-700' },
    {
      label: 'Meilleur jour',
      value: bestDay
        ? new Date(bestDay.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : '—',
      sub: bestDay ? formatPrice(bestDay.total) : '',
      icon: 'crown',
      tone: 'bg-violet-100 text-violet-700',
    },
  ];

  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    if (!data || !data.orders.length) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const STATUS_FR = {
        reception: 'À traiter',
        sent: 'Envoyée',
        preparing: 'En préparation',
        delivered: 'Livrée',
        cancelled: 'Annulée',
      };
      const periodLabel = PERIODS.find(([value]) => value === period)[1];
      const wb = XLSX.utils.book_new();

      // 1) Résumé
      const resume = [
        ['BELHOTEL — Statistiques'],
        ['Période', periodLabel],
        ['Généré le', new Date().toLocaleString('fr-FR')],
        [],
        ['Chiffre d’affaires total (FCFA)', revenue],
        ['Nombre de commandes', valid.length],
        ['Ticket moyen (FCFA)', average],
        [],
        ['CA Restaurant (FCFA)', bySection.resto.revenue],
        ['Commandes Restaurant', bySection.resto.count],
        ['CA Bar (FCFA)', bySection.bar.revenue],
        ['Commandes Bar', bySection.bar.count],
        ['CA depuis les chambres (FCFA)', roomOrders.revenue],
        ['Commandes depuis les chambres', roomOrders.count],
        [],
        ['Meilleur jour', bestDay ? new Date(bestDay.day).toLocaleDateString('fr-FR') : '—', bestDay ? bestDay.total : ''],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resume), 'Résumé');

      // 2) Revenu par jour
      const parJour = [['Date', 'Nombre de commandes', 'Chiffre d’affaires (FCFA)']];
      const dayCounts = new Map();
      valid.forEach((order) => {
        const day = order.created_at.slice(0, 10);
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      });
      [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([day, total]) => {
          parJour.push([new Date(day).toLocaleDateString('fr-FR'), dayCounts.get(day) || 0, total]);
        });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parJour), 'Par jour');

      // 3) Par article
      const parArticle = [['Article', 'Quantité vendue', 'Chiffre d’affaires (FCFA)']];
      [...itemTotals.entries()]
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .forEach(([name, entry]) => parArticle.push([name, entry.qty, entry.revenue]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parArticle), 'Par article');

      // 4) Détail des commandes
      const detail = [['Date', 'Heure', 'Origine', 'Section', 'Statut', 'Total (FCFA)', 'Articles']];
      data.orders.forEach((order) => {
        const date = new Date(order.created_at);
        detail.push([
          date.toLocaleDateString('fr-FR'),
          date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          (order.origin_type === 'room' ? 'Chambre ' : '') + order.origin_label.trim(),
          order.target === 'resto' ? 'Restaurant' : 'Bar',
          STATUS_FR[order.status] || order.status,
          order.total || 0,
          (order.order_items || []).map((line) => `${line.qty}x ${line.item_name}`).join(' + '),
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), 'Détail commandes');

      XLSX.writeFile(wb, `statistiques-belhotel-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      showError('Export impossible : ' + error.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {PERIODS.map(([value, label]) => (
          <Chip key={value} active={period === value} onClick={() => setPeriod(value)}>
            {label}
          </Chip>
        ))}
        <button
          type="button"
          onClick={exportExcel}
          disabled={!data || !data.orders.length || exporting}
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border border-green-600 bg-green-600 px-4 py-2 text-[0.82rem] font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          {exporting ? 'Export...' : 'Exporter Excel'}
        </button>
      </div>

      {data === null ? (
        <EmptyState>Chargement...</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((kpi) => (
              <Card key={kpi.label} className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-[0.7rem] font-bold uppercase tracking-wider text-brand-muted">
                    {kpi.label}
                  </span>
                  <strong className="font-heading text-xl">{kpi.value}</strong>
                  {kpi.sub ? <span className="block text-sm text-brand-muted">{kpi.sub}</span> : null}
                </div>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${kpi.tone}`}>
                  {KPI_ICONS[kpi.icon]}
                </span>
              </Card>
            ))}
          </div>

          <Card className="mt-4">
            <h2 className="font-heading text-base font-bold">Revenu par jour</h2>
            <p className="text-[0.85rem] text-brand-muted">
              {PERIODS.find(([value]) => value === period)[1]} · {chartSpan} jour{chartSpan > 1 ? 's' : ''}
              {period === 'all' ? ' (graphique : 30 derniers jours)' : ''}
            </p>
            <div className="mt-4 flex h-[210px] items-end gap-1">
              {chartDays.map((day) => (
                <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${day.label} : ${formatPrice(day.total)}`}>
                  <div
                    className="w-full max-w-[42px] rounded-t-md bg-gradient-to-b from-brand to-brand-deep transition-all"
                    style={{ height: `${Math.max(Math.round((day.total / maxTotal) * 100), 2)}%` }}
                  />
                  {chartSpan <= 14 ? (
                    <span className="mt-1 whitespace-nowrap text-[0.62rem] text-brand-muted">{day.label}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-heading text-base font-bold">Répartition par pôle</h2>
              {[
                ['Hôtel (chambres)', `${roomOrders.count} commandes · ${formatPrice(roomOrders.revenue)} · ${data.openRequests} demande(s) ouverte(s)`],
                ['Restauration', `${bySection.resto.count} commandes · ${formatPrice(bySection.resto.revenue)}`],
                ['Bar', `${bySection.bar.count} commandes · ${formatPrice(bySection.bar.revenue)}`],
              ].map(([label, text]) => (
                <div key={label} className="border-b border-brand-line py-2.5 last:border-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-[0.95rem]">{label}</strong>
                    <span className="text-[0.85rem] text-brand-muted">{text}</span>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <h2 className="mb-3 font-heading text-base font-bold">Articles les plus vendus</h2>
              {topItems.length === 0 ? (
                <EmptyState>Aucune vente sur cette période.</EmptyState>
              ) : (
                topItems.map(([name, entry]) => (
                  <div key={name} className="border-b border-brand-line py-2.5 last:border-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-[0.95rem]">{name}</strong>
                      <span className="text-[0.85rem] text-brand-muted">
                        {entry.qty} vendus · {formatPrice(entry.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-brand-soft">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-deep"
                        style={{ width: `${Math.round((entry.qty / maxQty) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
