'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../lib/supabase';
import { downloadQrCard, printQrCards, qrToCanvas, qrDisplayName } from '../../lib/adminShared';
import { confirmDelete, showError, toastSuccess } from '../../lib/alerts';
import { Card, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

function QrPreview({ point, width = 170 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) qrToCanvas(ref.current, point, width);
  }, [point, width]);
  return <canvas ref={ref} className="h-auto w-full max-w-[170px] rounded-2xl bg-white p-3" />;
}

function pointNumber(point) {
  const digits = (point.label.match(/\d+/) || ['0'])[0];
  const number = parseInt(digits, 10);
  return Number.isNaN(number) ? 0 : number;
}

// ----- Mode compteur : Table 1..N / Salon 1..N -----
function BulkQr({ type, readOnly = false }) {
  const base = type === 'table' ? 'Table' : 'Salon';
  const noun = type === 'table' ? 'tables' : 'salons';
  const [points, setPoints] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from('qr_points').select('*').eq('type', type);
    setPoints((data || []).sort((a, b) => pointNumber(a) - pointNumber(b)));
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const actives = (points || []).filter((point) => point.is_active);

  async function add() {
    const nextNumber = Math.max(0, ...actives.map(pointNumber)) + 1;
    const nextLabel = `${base} ${nextNumber}`;
    const existing = (points || []).find((point) => point.label.trim().toLowerCase() === nextLabel.toLowerCase());
    const { error } = existing
      ? await db.from('qr_points').update({ is_active: true }).eq('id', existing.id)
      : await db.from('qr_points').insert([{ type, label: nextLabel }]);
    if (error) showError(error.message);
    else load();
  }

  async function removeLast() {
    if (!actives.length) return;
    const last = actives.reduce((a, b) => (pointNumber(a) >= pointNumber(b) ? a : b));
    const { error } = await db.from('qr_points').update({ is_active: false }).eq('id', last.id);
    if (error) showError(error.message);
    else load();
  }

  async function printAll() {
    if (!actives.length) return;
    setBusy(true);
    await printQrCards(actives);
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <Card className="flex items-center gap-5 !p-4">
          <span className="text-[0.78rem] font-bold uppercase tracking-wider text-brand-muted">Nombre de {noun}</span>
          <div className="flex items-center gap-3.5">
            {!readOnly ? (
              <button
                type="button"
                aria-label="Retirer"
                onClick={removeLast}
                className="grid h-11 w-11 place-items-center rounded-full border border-brand-line bg-brand-soft text-xl hover:border-brand-dark hover:text-brand-deep"
              >
                −
              </button>
            ) : null}
            <strong className="min-w-[2ch] text-center font-heading text-2xl">{actives.length}</strong>
            {!readOnly ? (
              <button
                type="button"
                aria-label="Ajouter"
                onClick={add}
                className="grid h-11 w-11 place-items-center rounded-full border border-brand-line bg-brand-soft text-xl hover:border-brand-dark hover:text-brand-deep"
              >
                +
              </button>
            ) : null}
          </div>
        </Card>
        <PrimaryBtn disabled={busy || !actives.length} onClick={printAll}>
          {busy ? 'Préparation...' : 'Imprimer / Exporter PDF'}
        </PrimaryBtn>
      </div>
      <p className="mb-5 text-[0.88rem] text-brand-muted">
        Chaque QR code ouvre la page de commande avec le bon numéro pré-rempli. Le bouton − retire le dernier numéro
        (son QR est désactivé).
      </p>

      {points === null ? (
        <EmptyState>Chargement...</EmptyState>
      ) : actives.length === 0 ? (
        <EmptyState>Utilisez le compteur + pour générer vos QR codes.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {actives.map((point) => (
            <div
              key={point.id}
              className="flex flex-col items-center gap-2 rounded-2xl bg-brand-poster p-5 text-center text-white shadow-lg"
            >
              <span className="text-[0.68rem] font-extrabold tracking-[0.3em]">BELHOTEL</span>
              <strong className="font-heading text-2xl leading-tight">{point.label.trim().toUpperCase()}</strong>
              <QrPreview point={point} width={150} />
              <p className="text-[0.78rem] text-white/80">Scannez pour commander</p>
              <button
                type="button"
                onClick={() => downloadQrCard(point)}
                className="rounded-lg bg-white px-4 py-2 text-[0.74rem] font-bold uppercase tracking-wide text-brand-deep hover:bg-brand-pale"
              >
                Télécharger
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Mode chambres : création une par une -----
function RoomQr({ readOnly = false }) {
  const [points, setPoints] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: qrPoints }, { data: roomRows }] = await Promise.all([
      db.from('qr_points').select('*').eq('type', 'room').order('label'),
      db.from('rooms').select('id, name').order('name'),
    ]);
    setPoints(qrPoints || []);
    setRooms(roomRows || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (!roomId) return;
    setBusy(true);
    const room = rooms.find((item) => item.id === roomId);
    const { error } = await db.from('qr_points').insert([{ type: 'room', label: room.name.trim(), room_id: roomId }]);
    setBusy(false);
    if (error) {
      showError(error.message);
      return;
    }
    setOpen(false);
    setRoomId('');
    toastSuccess('QR code créé');
    load();
  }

  async function toggle(point) {
    const { error } = await db.from('qr_points').update({ is_active: !point.is_active }).eq('id', point.id);
    if (error) showError(error.message);
    else load();
  }

  async function remove(point) {
    const ok = await confirmDelete(
      `Supprimer le QR code « ${qrDisplayName(point)} » ?`,
      'Les affiches déjà imprimées ne fonctionneront plus.',
    );
    if (!ok) return;
    const { error } = await db.from('qr_points').delete().eq('id', point.id);
    if (error) showError(error.message);
    else {
      toastSuccess('QR code supprimé');
      load();
    }
  }

  return (
    <div>
      {!readOnly ? (
        <div className="mb-4 flex justify-end">
          <PrimaryBtn onClick={() => setOpen(true)}>+ Créer un QR code</PrimaryBtn>
        </div>
      ) : null}

      {points === null ? (
        <EmptyState>Chargement...</EmptyState>
      ) : points.length === 0 ? (
        <EmptyState>Aucun QR code. Créez le premier avec le bouton ci-dessus.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {points.map((point) => (
            <div
              key={point.id}
              className={`flex flex-col items-center gap-2 rounded-2xl bg-brand-poster p-5 text-center text-white shadow-lg ${
                point.is_active ? '' : 'opacity-50'
              }`}
            >
              <span className="text-[0.68rem] font-extrabold tracking-[0.3em]">BELHOTEL</span>
              <strong className="font-heading text-lg leading-tight">{point.label.trim().toUpperCase()}</strong>
              <QrPreview point={point} width={140} />
              <div className="grid w-full gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadQrCard(point)}
                  className="rounded-lg bg-white px-3 py-2 text-[0.72rem] font-bold uppercase tracking-wide text-brand-deep hover:bg-brand-pale"
                >
                  Télécharger
                </button>
                {!readOnly ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle(point)}
                      className="rounded-lg border border-white/40 px-3 py-2 text-[0.72rem] font-bold uppercase tracking-wide text-white hover:bg-white/10"
                    >
                      {point.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(point)}
                      className="rounded-lg border border-white/40 px-3 py-2 text-[0.72rem] font-bold uppercase tracking-wide text-white hover:bg-red-500/30"
                    >
                      Supprimer
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Créer un QR code">
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Chambre">
            <select required value={roomId} onChange={(event) => setRoomId(event.target.value)} className={inputCls}>
              <option value="">Choisissez la chambre...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name.trim()}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={busy} className={submitCls}>
            {busy ? 'Création...' : 'Créer le QR code'}
          </button>
        </form>
        <p className="mt-3 text-[0.88rem] text-brand-muted">
          Le QR code renvoie le client vers la page de commande. Téléchargez la carte puis imprimez-la et placez-la
          dans la chambre.
        </p>
      </Modal>
    </div>
  );
}

export default function QrPanel({ scope, readOnly = false }) {
  return scope === 'room' ? <RoomQr readOnly={readOnly} /> : <BulkQr type={scope} readOnly={readOnly} />;
}
