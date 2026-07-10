'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, formatPrice, CATEGORY_LABELS } from '../../lib/supabase';
import { Badge, Card, EmptyState, GhostBtn } from './ui';

export default function StockPanel({ target }) {
  const table = target === 'resto' ? 'restaurant_menu' : 'bar_menu';
  const [items, setItems] = useState(null);
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    const { data } = await db.from(table).select('*').order('category').order('name');
    setItems(data || []);
    setDrafts({});
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(item, value) {
    const { error } = await db.from(table).update({ stock_qty: value }).eq('id', item.id);
    if (error) alert('Erreur : ' + error.message);
    else load();
  }

  return (
    <Card>
      <h2 className="mb-1 font-heading text-base font-bold">
        {target === 'resto' ? 'Stock du restaurant' : 'Stock du bar'}
      </h2>
      <p className="mb-4 text-[0.9rem] text-brand-muted">
        Un article à 0 disparaît automatiquement de la carte des clients. « Illimité » = pas de suivi de stock.
      </p>
      {items === null ? (
        <EmptyState>Chargement...</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>Aucun article. Ajoutez-en d’abord dans le menu.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const stock = item.stock_qty;
            const badge =
              stock === null ? (
                <Badge>Illimité</Badge>
              ) : stock === 0 ? (
                <Badge tone="bg-gray-100 text-gray-500">Rupture</Badge>
              ) : stock <= 5 ? (
                <Badge tone="bg-amber-100 text-amber-800">Stock bas : {stock}</Badge>
              ) : (
                <Badge tone="bg-green-100 text-green-800">{stock} restants</Badge>
              );
            return (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-soft p-3.5"
              >
                <div className="min-w-0">
                  <strong>{item.name}</strong> {badge}
                  <p className="text-[0.9rem] text-brand-muted">
                    {CATEGORY_LABELS[item.category] || item.category} · {formatPrice(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Qté"
                    value={drafts[item.id] ?? (stock ?? '')}
                    onChange={(event) => setDrafts({ ...drafts, [item.id]: event.target.value })}
                    className="w-20 rounded-lg border border-brand-line px-2.5 py-2 text-[0.9rem] outline-none focus:border-brand"
                  />
                  <GhostBtn
                    green
                    onClick={() => {
                      const raw = drafts[item.id] ?? stock;
                      if (raw === '' || raw === null || Number(raw) < 0) {
                        alert('Indiquez une quantité valide.');
                        return;
                      }
                      save(item, Number(raw));
                    }}
                  >
                    Enregistrer
                  </GhostBtn>
                  <GhostBtn onClick={() => save(item, null)}>Illimité</GhostBtn>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
