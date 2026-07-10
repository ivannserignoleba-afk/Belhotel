'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice } from '../../lib/supabase';
import { uploadImage } from '../../lib/adminShared';
import { Badge, Card, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

const EMPTY_FORM = { name: '', description: '', price: '', status: 'available' };

export default function RoomsPanel() {
  const [rooms, setRooms] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // id de la chambre en édition
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from('rooms').select('*').order('name', { ascending: true });
    setRooms(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setOpen(true);
  }

  function openEdit(room) {
    setEditing(room.id);
    setForm({
      name: (room.name || '').trim(),
      description: room.description || '',
      price: room.price,
      status: room.status || 'available',
    });
    setFile(null);
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        status: form.status,
      };
      if (file) payload.image_urls = [await uploadImage(file, 'rooms')];

      const { error } = editing
        ? await db.from('rooms').update(payload).eq('id', editing)
        : await db.from('rooms').insert([{ ...payload, image_urls: payload.image_urls || null }]);
      if (error) throw error;

      setOpen(false);
      load();
    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(room) {
    const next = room.status === 'available' ? 'unavailable' : 'available';
    const { error } = await db.from('rooms').update({ status: next }).eq('id', room.id);
    if (error) alert('Erreur : ' + error.message);
    else load();
  }

  async function remove(room) {
    if (!confirm(`Supprimer la chambre « ${(room.name || '').trim()} » ?`)) return;
    const { error } = await db.from('rooms').delete().eq('id', room.id);
    if (error) alert('Erreur : ' + error.message + '\n(Une chambre liée à des réservations ne peut pas être supprimée.)');
    else load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <PrimaryBtn onClick={openAdd}>+ Ajouter une chambre</PrimaryBtn>
      </div>

      <Card>
        <h2 className="mb-4 font-heading text-base font-bold">Chambres enregistrées</h2>
        {rooms === null ? (
          <EmptyState>Chargement...</EmptyState>
        ) : rooms.length === 0 ? (
          <EmptyState>Aucune chambre enregistrée.</EmptyState>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => {
              const available = room.status === 'available';
              return (
                <article
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-soft p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {room.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={room.image_urls[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : null}
                    <div className="min-w-0">
                      <strong>{(room.name || '').trim()}</strong>{' '}
                      <Badge tone={available ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                        {available ? 'Disponible' : 'Indisponible'}
                      </Badge>
                      <p className="truncate text-[0.92rem] text-brand-muted">{room.description || 'Aucune description.'}</p>
                      <p className="font-bold text-brand-deep">{formatPrice(room.price)} / nuit</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <GhostBtn onClick={() => openEdit(room)}>Modifier</GhostBtn>
                    <GhostBtn green onClick={() => toggleStatus(room)}>
                      {available ? 'Rendre indisponible' : 'Rendre disponible'}
                    </GhostBtn>
                    <GhostBtn danger onClick={() => remove(room)}>
                      Supprimer
                    </GhostBtn>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier la chambre' : 'Ajouter une chambre'}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Nom de la chambre">
            <input
              required
              placeholder="Ex : 104-LA DOUCEUR"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              placeholder="Description de la chambre..."
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Prix par nuit (FCFA)">
            <input
              type="number"
              min="0"
              required
              placeholder="Ex : 20000"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Photo (depuis l’ordinateur ou le téléphone)">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files[0] || null)}
              className="w-full rounded-xl border border-dashed border-brand-line bg-brand-soft p-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2.5 file:text-[0.76rem] file:font-bold file:uppercase file:tracking-wide file:text-white"
            />
          </Field>
          <Field label="Statut">
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className={inputCls}
            >
              <option value="available">Disponible</option>
              <option value="unavailable">Indisponible</option>
            </select>
          </Field>
          <button type="submit" disabled={busy} className={submitCls}>
            {busy ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : 'Ajouter la chambre'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
