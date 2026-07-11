'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice } from '../../lib/supabase';
import { uploadImage } from '../../lib/adminShared';
import { confirmDelete, showError, toastSuccess } from '../../lib/alerts';
import { Badge, Card, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

const EMPTY_FORM = { name: '', description: '', price: '', status: 'available' };

export default function RoomsPanel({ readOnly = false }) {
  const [rooms, setRooms] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // id de la chambre en édition
  const [form, setForm] = useState(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState([]); // URLs déjà enregistrées
  const [newFiles, setNewFiles] = useState([]); // nouvelles photos à envoyer
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
    setExistingImages([]);
    setNewFiles([]);
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
    setExistingImages((room.image_urls || []).filter(Boolean));
    setNewFiles([]);
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const uploaded = [];
      for (const image of newFiles) {
        uploaded.push(await uploadImage(image, 'rooms'));
      }
      const allImages = [...existingImages, ...uploaded];

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        status: form.status,
        image_urls: allImages.length ? allImages : null,
      };

      const { error } = editing
        ? await db.from('rooms').update(payload).eq('id', editing)
        : await db.from('rooms').insert([payload]);
      if (error) throw error;

      setOpen(false);
      toastSuccess(editing ? 'Chambre modifiée' : 'Chambre ajoutée');
      load();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(room) {
    const next = room.status === 'available' ? 'unavailable' : 'available';
    const { error } = await db.from('rooms').update({ status: next }).eq('id', room.id);
    if (error) showError(error.message);
    else {
      toastSuccess(next === 'available' ? 'Chambre disponible' : 'Chambre indisponible');
      load();
    }
  }

  async function remove(room) {
    const ok = await confirmDelete(
      `Supprimer « ${(room.name || '').trim()} » ?`,
      'La chambre disparaîtra du site et de l’admin.',
    );
    if (!ok) return;
    const { error } = await db.from('rooms').delete().eq('id', room.id);
    if (error) showError(error.message + ' (Une chambre liée à des réservations ne peut pas être supprimée.)');
    else {
      toastSuccess('Chambre supprimée');
      load();
    }
  }

  return (
    <div>
      {!readOnly ? (
        <div className="mb-4 flex justify-end">
          <PrimaryBtn onClick={openAdd}>+ Ajouter une chambre</PrimaryBtn>
        </div>
      ) : null}

      <Card>
        <h2 className="mb-4 font-heading text-base font-bold">Chambres enregistrées</h2>
        {rooms === null ? (
          <EmptyState>Chargement...</EmptyState>
        ) : rooms.length === 0 ? (
          <EmptyState>Aucune chambre enregistrée.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {rooms.map((room) => {
              const available = room.status === 'available';
              return (
                <article key={room.id} className="rounded-xl border border-brand-line bg-brand-soft p-3.5">
                  <div className="flex items-start gap-3">
                    {room.image_urls?.[0] ? (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={room.image_urls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
                        {room.image_urls.length > 1 ? (
                          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-dark px-1 text-[0.62rem] font-bold text-white">
                            {room.image_urls.length}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong>{(room.name || '').trim()}</strong>
                        <Badge tone={available ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {available ? 'Disponible' : 'Indisponible'}
                        </Badge>
                      </div>
                      <p className="truncate text-[0.92rem] text-brand-muted">{room.description || 'Aucune description.'}</p>
                      <p className="whitespace-nowrap font-bold text-brand-deep">{formatPrice(room.price)} / nuit</p>
                    </div>
                  </div>
                  {!readOnly ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <GhostBtn onClick={() => openEdit(room)}>Modifier</GhostBtn>
                      <GhostBtn green onClick={() => toggleStatus(room)}>
                        {available ? 'Rendre indisponible' : 'Rendre disponible'}
                      </GhostBtn>
                      <GhostBtn danger onClick={() => remove(room)}>
                        Supprimer
                      </GhostBtn>
                    </div>
                  ) : null}
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
          <Field label="Photos (plusieurs possibles, depuis l’ordinateur ou le téléphone)">
            {existingImages.length || newFiles.length ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {existingImages.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      aria-label="Retirer la photo"
                      onClick={() => setExistingImages(existingImages.filter((item) => item !== url))}
                      className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-sm text-white shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newFiles.map((image, index) => (
                  <div key={`${image.name}-${index}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(image)} alt="" className="h-20 w-20 rounded-lg object-cover ring-2 ring-brand" />
                    <button
                      type="button"
                      aria-label="Retirer la photo"
                      onClick={() => setNewFiles(newFiles.filter((_, position) => position !== index))}
                      className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-sm text-white shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                setNewFiles([...newFiles, ...Array.from(event.target.files)]);
                event.target.value = '';
              }}
              className="w-full rounded-xl border border-dashed border-brand-line bg-brand-soft p-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2.5 file:text-[0.76rem] file:font-bold file:uppercase file:tracking-wide file:text-white"
            />
            <span className="text-[0.8rem] text-brand-muted">La première photo est la principale (affichée en couverture).</span>
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
