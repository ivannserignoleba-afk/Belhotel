'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice, CATEGORY_LABELS } from '../../lib/supabase';
import { uploadImage } from '../../lib/adminShared';
import { Badge, Card, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

export default function MenuPanel({ table, itemLabel, categoryOptions, listTitle }) {
  const EMPTY_FORM = { category: 'standard', name: '', description: '', price: '' };
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const uploadFolder = table === 'restaurant_menu' ? 'restaurant' : 'bar';

  const load = useCallback(async () => {
    const { data } = await db.from(table).select('*').order('category').order('name');
    setItems(data || []);
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setOpen(true);
  }

  function openEdit(item) {
    setEditing(item.id);
    setForm({
      category: item.category,
      name: item.name,
      description: item.description || '',
      price: item.price,
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
        category: form.category,
      };
      if (file) payload.image_url = await uploadImage(file, uploadFolder);

      const { error } = editing
        ? await db.from(table).update(payload).eq('id', editing)
        : await db.from(table).insert([{ ...payload, image_url: payload.image_url || null }]);
      if (error) throw error;

      setOpen(false);
      load();
    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Supprimer « ${item.name} » ?`)) return;
    const { error } = await db.from(table).delete().eq('id', item.id);
    if (error) alert('Erreur : ' + error.message);
    else load();
  }

  const addLabel = itemLabel === 'plat' ? '+ Ajouter un plat' : '+ Ajouter une boisson';

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <PrimaryBtn onClick={openAdd}>{addLabel}</PrimaryBtn>
      </div>

      <Card>
        <h2 className="mb-4 font-heading text-base font-bold">{listTitle}</h2>
        {items === null ? (
          <EmptyState>Chargement...</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Aucun {itemLabel} enregistré.</EmptyState>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-soft p-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <strong>{item.name}</strong> <Badge>{CATEGORY_LABELS[item.category] || item.category}</Badge>
                    <p className="truncate text-[0.92rem] text-brand-muted">{item.description || 'Aucune description.'}</p>
                    <p className="font-bold text-brand-deep">{formatPrice(item.price)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GhostBtn onClick={() => openEdit(item)}>Modifier</GhostBtn>
                  <GhostBtn danger onClick={() => remove(item)}>
                    Supprimer
                  </GhostBtn>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? itemLabel === 'plat'
              ? 'Modifier le plat'
              : 'Modifier la boisson'
            : itemLabel === 'plat'
              ? 'Ajouter un plat'
              : 'Ajouter une boisson'
        }
      >
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Catégorie">
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className={inputCls}
            >
              {categoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={itemLabel === 'plat' ? 'Nom du plat' : 'Nom de la boisson'}>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Prix (FCFA)">
            <input
              type="number"
              min="0"
              required
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
          <button type="submit" disabled={busy} className={submitCls}>
            {busy ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : addLabel.replace('+ ', '')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
