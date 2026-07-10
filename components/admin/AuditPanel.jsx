'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { Badge, Card, Chip, EmptyState } from './ui';

const TABLE_LABELS = {
  rooms: 'Chambre',
  restaurant_menu: 'Plat',
  bar_menu: 'Boisson',
  qr_points: 'QR code',
  admins: 'Personnel',
  app_settings: 'Réglages',
  orders: 'Commande',
  service_requests: 'Demande de service',
};

const ACTION_META = {
  INSERT: { label: 'Ajout', tone: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Modification', tone: 'bg-amber-100 text-amber-800' },
  DELETE: { label: 'Suppression', tone: 'bg-red-100 text-red-700' },
};

const FILTERS = [
  ['all', 'Tout'],
  ['INSERT', 'Ajouts'],
  ['UPDATE', 'Modifications'],
  ['DELETE', 'Suppressions'],
];

function formatWhen(dateString) {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditPanel({ refreshTick }) {
  const [entries, setEntries] = useState(null);
  const [names, setNames] = useState({});
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    const [{ data: logs }, { data: staff }] = await Promise.all([
      db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
      db.from('admins').select('email, full_name'),
    ]);
    setEntries(logs || []);
    const map = {};
    (staff || []).forEach((member) => {
      map[member.email] = member.full_name || member.email;
    });
    setNames(map);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, refreshTick]);

  if (entries === null) return <EmptyState>Chargement...</EmptyState>;

  const counts = { all: entries.length };
  ['INSERT', 'UPDATE', 'DELETE'].forEach((action) => {
    counts[action] = entries.filter((entry) => entry.action === action).length;
  });
  const visible = filter === 'all' ? entries : entries.filter((entry) => entry.action === filter);

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([value, label]) => (
          <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
            {label} ({counts[value]})
          </Chip>
        ))}
      </div>

      <Card className="!p-0">
        {visible.length === 0 ? (
          <EmptyState>Aucune activité enregistrée pour le moment.</EmptyState>
        ) : (
          <div className="divide-y divide-brand-line">
            {visible.map((entry) => {
              const meta = ACTION_META[entry.action] || { label: entry.action, tone: 'bg-gray-100 text-gray-600' };
              const actor = entry.actor === 'client' ? 'Un client' : names[entry.actor] || entry.actor;
              return (
                <div key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                  <span className="w-[110px] shrink-0 text-[0.8rem] font-semibold tabular-nums text-brand-muted">
                    {formatWhen(entry.created_at)}
                  </span>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <Badge>{TABLE_LABELS[entry.table_name] || entry.table_name}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.95rem]">
                      <strong>{actor}</strong>
                      <span className="text-brand-muted"> — </span>
                      <span className="font-semibold">{(entry.item_label || '').trim()}</span>
                    </p>
                    {entry.details ? (
                      <p className="truncate text-[0.82rem] text-brand-muted" title={entry.details}>
                        {entry.details}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
