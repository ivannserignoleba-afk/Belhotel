'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { timeAgo } from '../../lib/adminShared';
import { Badge, EmptyState, GhostBtn } from './ui';
import { showError } from '../../lib/alerts';

const REQUEST_LABELS = { new: 'Nouvelle', in_progress: 'En cours', done: 'Traitée' };
const REQUEST_BADGE = {
  new: 'bg-brand-pale text-brand-deep',
  in_progress: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
};

export default function RequestsBoard({ refreshTick, setBadge }) {
  const [requests, setRequests] = useState(null);

  const load = useCallback(async () => {
    const { data } = await db.from('service_requests').select('*').order('created_at', { ascending: false }).limit(60);
    setRequests(data || []);
    setBadge('requests', (data || []).filter((request) => request.status === 'new').length);
  }, [setBadge]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, refreshTick]);

  if (requests === null) return <EmptyState>Chargement...</EmptyState>;

  const active = requests.filter((request) => request.status !== 'done');
  const done = requests.filter((request) => request.status === 'done').slice(0, 12);

  async function advance(id, status) {
    const { error } = await db.from('service_requests').update({ status }).eq('id', id);
    if (error) showError(error.message);
    else load();
  }

  const renderCard = (request, withActions) => (
    <article
      key={request.id}
      className={`flex flex-col gap-2.5 rounded-2xl border border-brand-line bg-white p-4 shadow-sm ${
        withActions ? '' : 'opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <strong className="block">Chambre {request.origin_label.trim()}</strong>
          <span className="text-xs text-brand-muted">{timeAgo(request.created_at)}</span>
        </div>
        <Badge tone={REQUEST_BADGE[request.status]}>{REQUEST_LABELS[request.status]}</Badge>
      </div>
      <p className="text-lg font-bold">{request.category}</p>
      {request.message ? (
        <p className="rounded-lg bg-brand-pale px-3 py-2 text-[0.88rem] font-semibold text-brand-deep">{request.message}</p>
      ) : null}
      {withActions ? (
        <div className="flex gap-2">
          {request.status === 'new' ? (
            <GhostBtn green onClick={() => advance(request.id, 'in_progress')}>
              Prendre en charge
            </GhostBtn>
          ) : null}
          {request.status === 'in_progress' ? (
            <GhostBtn green onClick={() => advance(request.id, 'done')}>
              Marquer comme traitée
            </GhostBtn>
          ) : null}
        </div>
      ) : null}
    </article>
  );

  return (
    <div>
      {active.length === 0 ? (
        <EmptyState>
          Aucune demande en attente. Les demandes des chambres (serviettes, climatisation...) apparaîtront ici
          automatiquement.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map((request) => renderCard(request, true))}</div>
      )}
      {done.length ? (
        <>
          <h3 className="mb-3 mt-8 text-brand-muted">Historique récent</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{done.map((request) => renderCard(request, false))}</div>
        </>
      ) : null}
    </div>
  );
}
