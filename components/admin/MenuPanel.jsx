'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice, CATEGORY_LABELS } from '../../lib/supabase';
import { uploadImage } from '../../lib/adminShared';
import { confirmDelete, showError, toastSuccess } from '../../lib/alerts';
import { Badge, Card, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

function StockBadge({ stock }) {
  if (stock === null) return <Badge>Illimité</Badge>;
  if (stock === 0) return <Badge tone="bg-red-100 text-red-700">Rupture</Badge>;
  if (stock <= 5) return <Badge tone="bg-amber-100 text-amber-800">Stock bas : {stock}</Badge>;
  return <Badge tone="bg-green-100 text-green-800">{stock} en stock</Badge>;
}

export default function MenuPanel({ table, itemLabel, categoryOptions, listTitle, readOnly = false }) {
  const EMPTY_FORM = { category: 'standard', name: '', description: '', price: '', stock: '', unlimited: true };
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
      stock: item.stock_qty ?? '',
      unlimited: item.stock_qty === null,
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
        stock_qty: form.unlimited ? null : Number(form.stock || 0),
      };
      if (file) payload.image_url = await uploadImage(file, uploadFolder);

      const { error } = editing
        ? await db.from(table).update(payload).eq('id', editing)
        : await db.from(table).insert([{ ...payload, image_url: payload.image_url || null }]);
      if (error) throw error;

      setOpen(false);
      toastSuccess(editing ? 'Article modifié' : 'Article ajouté');
      load();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    const ok = await confirmDelete(`Supprimer « ${item.name} » ?`, 'L’article disparaîtra de la carte des clients.');
    if (!ok) return;
    const { error } = await db.from(table).delete().eq('id', item.id);
    if (error) showError(error.message);
    else {
      toastSuccess('Article supprimé');
      load();
    }
  }

  const addLabel = itemLabel === 'plat' ? '+ Ajouter un plat' : '+ Ajouter une boisson';
  const lowItems = (items || []).filter((item) => item.stock_qty !== null && item.stock_qty <= 5);

  return (
    <div>
      {!readOnly ? (
        <div className="mb-4 flex justify-end">
          <PrimaryBtn onClick={openAdd}>{addLabel}</PrimaryBtn>
        </div>
      ) : null}

      {lowItems.length ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <div>
            <strong>Alerte stock</strong>
            <p className="text-[0.9rem]">
              {lowItems.map((item) => `${item.name} (${item.stock_qty})`).join(' · ')}
            </p>
          </div>
        </div>
      ) : null}

      <Card>
        <h2 className="mb-4 font-heading text-base font-bold">{listTitle}</h2>
        {items === null ? (
          <EmptyState>Chargement...</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Aucun {itemLabel} enregistré.</EmptyState>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-brand-line bg-brand-soft p-3.5">
                <div className="flex items-start gap-3">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong>{item.name}</strong>
                      <Badge>{CATEGORY_LABELS[item.category] || item.category}</Badge>
                      <StockBadge stock={item.stock_qty} />
                    </div>
                    <p className="truncate text-[0.92rem] text-brand-muted">{item.description || 'Aucune description.'}</p>
                    <p className="whitespace-nowrap font-bold text-brand-deep">{formatPrice(item.price)}</p>
                  </div>
                </div>
                {!readOnly ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GhostBtn onClick={() => openEdit(item)}>Modifier</GhostBtn>
                    <GhostBtn danger onClick={() => remove(item)}>
                      Supprimer
                    </GhostBtn>
                  </div>
                ) : null}
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Stock disponible">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  disabled={form.unlimited}
                  placeholder="Qté"
                  value={form.stock}
                  onChange={(event) => setForm({ ...form, stock: event.target.value })}
                  className={`${inputCls} disabled:opacity-50`}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[0.85rem] font-semibold text-brand-muted">
                  <input
                    type="checkbox"
                    checked={form.unlimited}
                    onChange={(event) => setForm({ ...form, unlimited: event.target.checked })}
                    className="h-4 w-4 accent-brand-dark"
                  />
                  Illimité
                </label>
              </div>
            </Field>
          </div>
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
