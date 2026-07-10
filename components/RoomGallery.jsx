'use client';

import { useEffect, useState } from 'react';

// Galerie plein écran d'une chambre : navigation entre plusieurs photos.
export default function RoomGallery({ preview, onClose }) {
  const [index, setIndex] = useState(preview?.start || 0);

  useEffect(() => {
    setIndex(preview?.start || 0);
  }, [preview]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % preview.images.length);
      if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + preview.images.length) % preview.images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, onClose]);

  if (!preview) return null;
  const { images, name, description } = preview;
  const multiple = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-night/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-brand-night/70 text-xl text-white hover:bg-brand-deep"
        >
          ×
        </button>

        <div className="relative bg-brand-night">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[index]} alt={name} className="max-h-[70vh] w-full object-contain" />

          {multiple ? (
            <>
              <button
                type="button"
                aria-label="Photo précédente"
                onClick={() => setIndex((current) => (current - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-2xl text-white backdrop-blur hover:bg-white/40"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Photo suivante"
                onClick={() => setIndex((current) => (current + 1) % images.length)}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-2xl text-white backdrop-blur hover:bg-white/40"
              >
                ›
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {images.map((_, dot) => (
                  <button
                    key={dot}
                    type="button"
                    aria-label={`Photo ${dot + 1}`}
                    onClick={() => setIndex(dot)}
                    className={`h-2 rounded-full transition-all ${dot === index ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">{name}</h3>
            {multiple ? (
              <span className="text-[0.85rem] text-brand-muted">
                {index + 1} / {images.length}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-1 text-brand-muted">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
