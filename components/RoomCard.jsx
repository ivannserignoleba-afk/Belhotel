'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '../lib/supabase';

const FALLBACK_IMAGE =
  'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778854766853-photo_2026-05-08_15-43-52.jpg';

export default function RoomCard({ room, waNumber, onPreview }) {
  const images = (room.image_urls || []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const name = (room.name || '').trim();
  const image = images[index] || images[0] || FALLBACK_IMAGE;

  // Mini-diapo si la chambre a plusieurs photos
  useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const message = `Bonjour, je souhaite réserver la chambre « ${name} » (${formatPrice(room.price)}/nuit). Merci de me confirmer la disponibilité.`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_6px_26px_rgba(43,32,24,0.09)] transition hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(43,32,24,0.15)]">
      <div className="relative h-60 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-green-900 shadow">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Disponible
        </span>
        {images.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, dot) => (
              <span
                key={dot}
                className={`h-1.5 rounded-full transition-all ${dot === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mt-1 text-[0.95rem] text-brand-muted">
          {room.description || 'Chambre confortable du complexe Belhotel.'}
        </p>
        <p className="mt-4 border-t border-brand-line pt-4 text-xl font-extrabold text-brand-deep">
          {formatPrice(room.price)} <span className="text-sm font-medium text-brand-muted">/ nuit</span>
        </p>
        <div className="mt-4 flex gap-3">
          {onPreview ? (
            <button
              type="button"
              onClick={() => onPreview({ images: images.length ? images : [image], name, description: room.description, start: index })}
              className="flex-1 rounded-lg border border-brand-line px-4 py-3 text-[0.78rem] font-bold uppercase tracking-wider text-brand-ink hover:border-brand-dark hover:text-brand-deep"
            >
              {images.length > 1 ? `Photos (${images.length})` : 'Photos'}
            </button>
          ) : null}
          <a
            href={waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : '#'}
            target="_blank"
            rel="noopener"
            className="flex-1 rounded-lg bg-brand-dark px-4 py-3 text-center text-[0.78rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep"
          >
            Réserver
          </a>
        </div>
      </div>
    </article>
  );
}
