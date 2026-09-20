'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { timeAgo } from '../../lib/adminShared';
import { formatFcfa, toAmount, PAYMENT_LABELS } from '../../lib/paiement.mjs';
import { confirmAction, showError, toastSuccess } from '../../lib/alerts';
import { Badge, Card, Chip, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';
import PaymentModal from './PaymentModal';

const SECTOR_TITLES = { resto: 'Restaurant', bar: 'Bar', hotel: 'Hôtel' };

// Les commandes encaissables d'un pôle : une commande de chambre se règle à
// la réception, une commande de table au restaurant, un salon au bar.
function filterBySector(query, sector) {
  if (sector === 'hotel') return query.eq('origin_type', 'room');
  return query.eq('target', sector).neq('origin_type', 'room');
}

function dateLongue(value) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Bandeau sombre : l'état de la caisse doit se lire d'un coup d'œil
function SessionBar({ sector, session, summary, onClose }) {
  const ouverte = Boolean(session);
  return (
    <div className="overflow-hidden rounded-3xl bg-brand-night text-white shadow-[0_20px_60px_rgba(24,14,8,0.35)] ring-1 ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${ouverte ? 'animate-pulse bg-green-400' : 'bg-white/30'}`} />
          <div>
            <p className="font-heading text-lg font-bold">Caisse {SECTOR_TITLES[sector]}</p>
            <p className="text-[0.8rem] text-white/50">
              {ouverte ? `Ouverte ${timeAgo(session.opened_at)}` : 'Aucune session ouverte'}
            </p>
          </div>
        </div>
        {ouverte ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/25 px-4 py-2.5 text-[0.76rem] font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
          >
            Clôturer la caisse
          </button>
        ) : null}
      </div>

      {ouverte && summary ? (
        <div className="grid grid-cols-2 divide-white/10 md:grid-cols-4 md:divide-x">
          {[
            ['Espèces encaissées', summary.cash_collected, 'text-green-300'],
            ['Mobile money', summary.momo_collected, 'text-blue-300'],
            ['Fond de caisse', summary.opening_float, 'text-white/80'],
            ['Solde théorique', summary.expected_cash, 'text-amber-300'],
          ].map(([label, value, tone]) => (
            <div key={label} className="px-6 py-5">
              <span className="block text-[0.66rem] font-bold uppercase tracking-[0.15em] text-white/40">{label}</span>
              <strong className={`font-heading text-2xl tabular-nums ${tone}`}>{formatFcfa(value)}</strong>
            </div>
          ))}
          <div className="col-span-2 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/10 px-6 py-3 text-[0.82rem] text-white/60 md:col-span-4">
            <span>
              <strong className="text-white">{summary.orders_count}</strong> commande
              {summary.orders_count > 1 ? 's' : ''} encaissée{summary.orders_count > 1 ? 's' : ''}
            </span>
            <span>
              Sorties : <strong className="text-white">{formatFcfa(summary.movements_total)}</strong>
            </span>
            <span className="text-white/35">
              Solde théorique = fond de caisse + espèces − sorties
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CaissePanel({ sector, refreshTick }) {
  const [tab, setTab] = useState('session');
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [unpaid, setUnpaid] = useState(null);
  const [history, setHistory] = useState(null);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [migrationManquante, setMigrationManquante] = useState(false);

  const [openForm, setOpenForm] = useState('');
  const [busy, setBusy] = useState(false);
  const [moveForm, setMoveForm] = useState({ amount: '', reason: '' });
  const [closeOpen, setCloseOpen] = useState(false);
  const [counted, setCounted] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    const [{ data: sessions, error: sessionError }, { data: staffRows }] = await Promise.all([
      db.from('cash_sessions').select('*').eq('sector', sector).is('closed_at', null).limit(1),
      db.from('admins').select('id, full_name, email'),
    ]);

    // Tant que la migration SQL n'a pas été exécutée, les tables de caisse
    // n'existent pas. On le dit clairement plutôt que d'afficher une caisse
    // vide qui refuserait ensuite de s'ouvrir sans explication.
    if (sessionError) {
      const message = `${sessionError.code || ''} ${sessionError.message || ''}`;
      setMigrationManquante(/42P01|PGRST205|schema cache|does not exist/i.test(message));
      setLoading(false);
      return;
    }
    setMigrationManquante(false);

    const nameMap = {};
    (staffRows || []).forEach((member) => {
      nameMap[member.id] = member.full_name || member.email;
    });
    setNames(nameMap);

    const current = (sessions || [])[0] || null;
    setSession(current);

    if (current) {
      const [{ data: resume }, { data: moves }] = await Promise.all([
        db.rpc('get_cash_session_summary', { p_session_id: current.id }),
        db.from('cash_movements').select('*').eq('session_id', current.id).order('created_at', { ascending: false }),
      ]);
      setSummary(resume || null);
      setMovements(moves || []);
    } else {
      setSummary(null);
      setMovements([]);
    }

    const { data: pending } = await filterBySector(
      db.from('orders').select('*, order_items(*)').is('paid_at', null).neq('status', 'cancelled'),
      sector,
    )
      .order('created_at', { ascending: true })
      .limit(120);
    setUnpaid(pending || []);

    setLoading(false);
  }, [sector]);

  const loadHistory = useCallback(async () => {
    const { data } = await db
      .from('cash_sessions')
      .select('*')
      .eq('sector', sector)
      .not('closed_at', 'is', null)
      .order('opened_at', { ascending: false })
      .limit(60);
    setHistory(data || []);
  }, [sector]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load, refreshTick]);

  useEffect(() => {
    if (tab === 'historique') loadHistory();
  }, [tab, loadHistory, refreshTick]);

  async function ouvrir(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await db.rpc('open_cash_session', {
      p_sector: sector,
      p_opening_float: toAmount(openForm),
    });
    setBusy(false);
    if (error) {
      showError(
        error.message.includes('SESSION_DEJA_OUVERTE')
          ? 'Une caisse est déjà ouverte pour ce pôle.'
          : error.message,
      );
      return;
    }
    setOpenForm('');
    toastSuccess('Caisse ouverte');
    load();
  }

  async function ajouterSortie(event) {
    event.preventDefault();
    const montant = toAmount(moveForm.amount);
    if (!montant || !moveForm.reason.trim()) return;
    setBusy(true);
    const { error } = await db.from('cash_movements').insert([
      { session_id: session.id, amount: montant, reason: moveForm.reason.trim() },
    ]);
    setBusy(false);
    if (error) {
      showError(error.message);
      return;
    }
    setMoveForm({ amount: '', reason: '' });
    toastSuccess('Sortie enregistrée');
    load();
  }

  async function cloturer(event) {
    event.preventDefault();
    const montant = toAmount(counted);
    const ecart = montant - toAmount(summary?.expected_cash);
    if (ecart !== 0) {
      const ok = await confirmAction(
        ecart > 0 ? `Excédent de ${formatFcfa(ecart)}` : `Manquant de ${formatFcfa(-ecart)}`,
        'L’écart sera enregistré définitivement dans l’historique. Confirmez-vous le comptage ?',
        'Oui, clôturer',
      );
      if (!ok) return;
    }
    setBusy(true);
    const { error } = await db.rpc('close_cash_session', {
      p_session_id: session.id,
      p_counted_cash: montant,
      p_note: closeNote.trim() || null,
    });
    setBusy(false);
    if (error) {
      showError(error.message);
      return;
    }
    setCloseOpen(false);
    setCounted('');
    setCloseNote('');
    toastSuccess('Caisse clôturée');
    load();
    loadHistory();
  }

  if (loading) return <EmptyState>Chargement...</EmptyState>;

  if (migrationManquante) {
    return (
      <Card className="max-w-2xl !border-amber-300 !bg-amber-50">
        <h2 className="font-heading text-base font-bold text-amber-900">La caisse n’est pas encore installée</h2>
        <p className="mt-2 text-[0.92rem] text-amber-900/80">
          Les tables de caisse n’existent pas encore dans la base. Exécutez le script
          <strong> supabase/migrations/2026-09-20_caisse_et_paiements.sql </strong>
          dans le SQL Editor de Supabase, puis rechargez cette page.
        </p>
      </Card>
    );
  }

  const ecartPreview = toAmount(counted) - toAmount(summary?.expected_cash);
  const restantsAEncaisser = (unpaid || []).length;

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={tab === 'session'} onClick={() => setTab('session')}>
          Session en cours
        </Chip>
        <Chip active={tab === 'encaisser'} onClick={() => setTab('encaisser')}>
          À encaisser ({restantsAEncaisser})
        </Chip>
        <Chip active={tab === 'historique'} onClick={() => setTab('historique')}>
          Historique
        </Chip>
      </div>

      {tab !== 'historique' ? (
        <SessionBar sector={sector} session={session} summary={summary} onClose={() => setCloseOpen(true)} />
      ) : null}

      {/* ---------- Session ---------- */}
      {tab === 'session' ? (
        !session ? (
          <Card className="mt-4 max-w-md">
            <h2 className="mb-1 font-heading text-base font-bold">Ouvrir la caisse</h2>
            <p className="mb-4 text-[0.9rem] text-brand-muted">
              Indiquez le fond de caisse : l’argent déjà présent dans le tiroir avant le premier encaissement.
            </p>
            <form onSubmit={ouvrir} className="grid gap-4">
              <Field label="Fond de caisse (FCFA)">
                <input
                  required
                  inputMode="numeric"
                  placeholder="0"
                  value={openForm}
                  onChange={(event) => setOpenForm(event.target.value.replace(/[^\d]/g, ''))}
                  className={`${inputCls} text-right font-heading text-xl font-bold tabular-nums`}
                />
              </Field>
              <button type="submit" disabled={busy} className={submitCls}>
                {busy ? 'Ouverture...' : 'Ouvrir la caisse'}
              </button>
            </form>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 font-heading text-base font-bold">Sortie de caisse</h2>
              <p className="mb-4 text-[0.9rem] text-brand-muted">
                Toute dépense payée en espèces depuis le tiroir : courses, pourboires, petit matériel.
              </p>
              <form onSubmit={ajouterSortie} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
                <Field label="Montant">
                  <input
                    required
                    inputMode="numeric"
                    placeholder="0"
                    value={moveForm.amount}
                    onChange={(event) =>
                      setMoveForm({ ...moveForm, amount: event.target.value.replace(/[^\d]/g, '') })
                    }
                    className={`${inputCls} text-right font-bold tabular-nums`}
                  />
                </Field>
                <Field label="Motif">
                  <input
                    required
                    placeholder="Ex : achat de glaçons"
                    value={moveForm.reason}
                    onChange={(event) => setMoveForm({ ...moveForm, reason: event.target.value })}
                    className={inputCls}
                  />
                </Field>
                <PrimaryBtn type="submit" disabled={busy}>
                  Enregistrer
                </PrimaryBtn>
              </form>

              {movements.length ? (
                <div className="mt-5 divide-y divide-brand-line border-t border-brand-line">
                  {movements.map((move) => (
                    <div key={move.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <strong className="block text-[0.95rem]">{move.reason}</strong>
                        <span className="text-xs text-brand-muted">
                          {timeAgo(move.created_at)}
                          {names[move.created_by] ? ` · ${names[move.created_by]}` : ''}
                        </span>
                      </div>
                      <strong className="whitespace-nowrap tabular-nums text-red-700">
                        − {formatFcfa(move.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-[0.88rem] text-brand-muted">Aucune sortie enregistrée.</p>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 font-heading text-base font-bold">Détail de la session</h2>
              {[
                ['Ouverte par', names[session.opened_by] || '—'],
                ['Ouverture', dateLongue(session.opened_at)],
                ['Fond de caisse', formatFcfa(summary?.opening_float)],
                ['Espèces encaissées', formatFcfa(summary?.cash_collected)],
                ['Sorties de caisse', `− ${formatFcfa(summary?.movements_total)}`],
                ['Solde théorique en tiroir', formatFcfa(summary?.expected_cash)],
                ['Mobile money (hors tiroir)', formatFcfa(summary?.momo_collected)],
                ['Total encaissé', formatFcfa(summary?.total_collected)],
              ].map(([label, value], index, all) => (
                <div
                  key={label}
                  className={`flex flex-wrap items-baseline justify-between gap-2 py-2.5 ${
                    index < all.length - 1 ? 'border-b border-brand-line' : ''
                  }`}
                >
                  <span className="text-[0.92rem] text-brand-muted">{label}</span>
                  <strong className="tabular-nums">{value}</strong>
                </div>
              ))}
            </Card>
          </div>
        )
      ) : null}

      {/* ---------- À encaisser ---------- */}
      {tab === 'encaisser' ? (
        <div className="mt-4">
          {!session ? (
            <EmptyState>Ouvrez d’abord la caisse pour pouvoir encaisser.</EmptyState>
          ) : restantsAEncaisser === 0 ? (
            <EmptyState>Aucune commande en attente de paiement. Tout est encaissé.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {unpaid.map((order) => (
                <article key={order.id} className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="block">
                        {(order.origin_type === 'room' ? 'Chambre ' : '') + (order.origin_label || '').trim()}
                      </strong>
                      <span className="text-xs text-brand-muted">{timeAgo(order.created_at)}</span>
                    </div>
                    <Badge tone={order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-brand-pale text-brand-deep'}>
                      {order.status === 'delivered' ? 'Servie' : 'En cours'}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-[0.9rem] text-brand-muted">
                    {(order.order_items || []).map((line) => (
                      <span key={line.id}>
                        {line.qty} × {line.item_name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-baseline justify-between border-t border-brand-line pt-2.5 font-bold">
                    <span>Total</span>
                    <strong className="text-brand-deep tabular-nums">{formatFcfa(order.total)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaying(order)}
                    className="w-full rounded-xl bg-brand-dark py-3.5 text-[0.8rem] font-bold uppercase tracking-wider text-white transition hover:bg-brand-deep active:scale-[0.99]"
                  >
                    Encaisser
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ---------- Historique ---------- */}
      {tab === 'historique' ? (
        <div className="mt-1">
          {history === null ? (
            <EmptyState>Chargement...</EmptyState>
          ) : history.length === 0 ? (
            <EmptyState>Aucune caisse clôturée pour le moment.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {history.map((item) => {
                const ecart = item.difference || 0;
                return (
                  <Card key={item.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <strong className="block">{dateLongue(item.opened_at)}</strong>
                        <span className="text-[0.85rem] text-brand-muted">
                          Ouverte par {names[item.opened_by] || '—'} · Clôturée par {names[item.closed_by] || '—'} le{' '}
                          {dateLongue(item.closed_at)}
                        </span>
                      </div>
                      <Badge
                        tone={
                          ecart === 0
                            ? 'bg-green-100 text-green-800'
                            : ecart > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                        }
                      >
                        {ecart === 0 ? 'Compte juste' : ecart > 0 ? `Excédent ${formatFcfa(ecart)}` : `Manquant ${formatFcfa(-ecart)}`}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-brand-line pt-3 text-[0.9rem] sm:grid-cols-4">
                      {[
                        ['Fond de caisse', formatFcfa(item.opening_float)],
                        ['Solde théorique', formatFcfa(item.expected_cash)],
                        ['Espèces comptées', formatFcfa(item.counted_cash)],
                        ['Écart', ecart === 0 ? '—' : `${ecart > 0 ? '+' : '−'} ${formatFcfa(Math.abs(ecart))}`],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-brand-muted">
                            {label}
                          </span>
                          <strong className="tabular-nums">{value}</strong>
                        </div>
                      ))}
                    </div>
                    {item.note ? (
                      <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-[0.88rem] text-brand-ink">{item.note}</p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* ---------- Clôture ---------- */}
      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Clôturer la caisse">
        <form onSubmit={cloturer} className="grid gap-4">
          <div className="rounded-2xl bg-brand-night px-5 py-4 text-white">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.82rem] text-white/70">Solde théorique en tiroir</span>
              <strong className="font-heading text-2xl tabular-nums">{formatFcfa(summary?.expected_cash)}</strong>
            </div>
          </div>
          <Field label="Espèces réellement comptées (FCFA)">
            <input
              required
              autoFocus
              inputMode="numeric"
              placeholder="0"
              value={counted}
              onChange={(event) => setCounted(event.target.value.replace(/[^\d]/g, ''))}
              className={`${inputCls} text-right font-heading text-xl font-bold tabular-nums`}
            />
          </Field>
          {counted !== '' ? (
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${
                ecartPreview === 0
                  ? 'bg-green-50 text-green-800 ring-green-200'
                  : ecartPreview > 0
                    ? 'bg-blue-50 text-blue-800 ring-blue-200'
                    : 'bg-red-50 text-red-800 ring-red-200'
              }`}
            >
              <span className="text-[0.85rem] font-bold uppercase tracking-wide">
                {ecartPreview === 0 ? 'Compte juste' : ecartPreview > 0 ? 'Excédent' : 'Manquant'}
              </span>
              <strong className="font-heading text-2xl tabular-nums">{formatFcfa(Math.abs(ecartPreview))}</strong>
            </div>
          ) : null}
          <Field label="Remarque (facultatif)">
            <textarea
              rows={2}
              value={closeNote}
              onChange={(event) => setCloseNote(event.target.value)}
              placeholder="Ex : billet de 2000 déchiré remplacé"
              className={inputCls}
            />
          </Field>
          <button type="submit" disabled={busy} className={submitCls}>
            {busy ? 'Clôture...' : 'Clôturer définitivement'}
          </button>
        </form>
      </Modal>

      <PaymentModal
        order={paying}
        onClose={() => setPaying(null)}
        onPaid={() => {
          setPaying(null);
          load();
        }}
      />
    </div>
  );
}
