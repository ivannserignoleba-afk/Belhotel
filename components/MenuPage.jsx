'use client';

import { useEffect, useState } from 'react';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import CtaBand from './CtaBand';
import { db, getSetting, formatPrice, FALLBACK_WHATSAPP } from '../lib/supabase';

export default function MenuPage({
  active,
  table,
  heroImage,
  eyebrow,
  title,
  subtitle,
  sectionTitle,
  sectionSubtitle,
  categories,
  itemLabel,
}) {
  const [items, setItems] = useState(null);
  const [waNumber, setWaNumber] = useState(FALLBACK_WHATSAPP);

  useEffect(() => {
    getSetting('whatsapp_number', FALLBACK_WHATSAPP).then(setWaNumber).catch(() => {});
    db.from(table)
      .select('*')
      .or('stock_qty.is.null,stock_qty.gt.0')
      .order('price', { ascending: true })
      .then(({ data }) => setItems(data || []));
  }, [table]);

  return (
    <>
      <header
        className="flex min-h-[62vh] flex-col bg-cover bg-center px-6 pb-12 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(36,22,12,0.5), rgba(36,22,12,0.72)), url('${heroImage}')`,
        }}
      >
        <SiteNav active={active} />
        <div className="m-auto max-w-3xl py-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/90">{subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold md:text-3xl">{sectionTitle}</h2>
        <p className="mt-1 text-brand-muted">{sectionSubtitle}</p>

        {categories.map((category) => {
          const categoryItems = (items || []).filter((item) => item.category === category.key);
          return (
            <div
              key={category.key}
              className="mt-7 rounded-3xl border border-brand-line bg-brand-soft p-6 md:p-7"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-xl font-bold">{category.title}</h3>
                <span className="rounded-full bg-brand px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  {category.badge}
                </span>
                <p className="w-full text-brand-muted">{category.text}</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items === null ? (
                  <p className="text-brand-muted">Chargement...</p>
                ) : categoryItems.length === 0 ? (
                  <p className="text-brand-muted">Les {itemLabel}s de cette carte arrivent bientôt.</p>
                ) : (
                  categoryItems.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-brand-line bg-white"
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="h-40 w-full object-cover"
                        />
                      ) : null}
                      <div className="p-4">
                        <h4 className="font-bold">{item.name}</h4>
                        {item.description ? (
                          <p className="mt-1 text-sm text-brand-muted">{item.description}</p>
                        ) : null}
                        <p className="mt-2 font-extrabold text-brand-deep">{formatPrice(item.price)}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>

      <CtaBand waNumber={waNumber} />
      <SiteFooter waNumber={waNumber} />
    </>
  );
}
