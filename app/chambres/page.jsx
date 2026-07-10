'use client';

import { useEffect, useState } from 'react';
import SiteNav from '../../components/SiteNav';
import SiteFooter from '../../components/SiteFooter';
import CtaBand from '../../components/CtaBand';
import RoomCard from '../../components/RoomCard';
import RoomGallery from '../../components/RoomGallery';
import { db, getSetting, FALLBACK_WHATSAPP } from '../../lib/supabase';

const HERO_IMAGES = [
  'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778854766853-photo_2026-05-08_15-43-52.jpg',
  'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778855021766-photo_2026-05-08_15-43-49.jpg',
  'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778889563322-photo_2026-05-08_15-43-43.jpg',
];

export default function ChambresPage() {
  const [slide, setSlide] = useState(0);
  const [rooms, setRooms] = useState(null);
  const [waNumber, setWaNumber] = useState(FALLBACK_WHATSAPP);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setSlide((current) => (current + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getSetting('whatsapp_number', FALLBACK_WHATSAPP).then(setWaNumber).catch(() => {});
    db.from('rooms')
      .select('*')
      .eq('status', 'available')
      .order('name', { ascending: true })
      .then(({ data }) => setRooms(data || []));
  }, []);

  return (
    <>
      <header className="relative flex min-h-[62vh] flex-col overflow-hidden bg-brand-night px-6 pb-12 text-white">
        <SiteNav active="/chambres" />
        {HERO_IMAGES.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === slide ? 'animate-kenburns opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `linear-gradient(rgba(30,18,10,0.5), rgba(30,18,10,0.68)), url('${image}')`,
            }}
          />
        ))}
        <div className="relative z-10 m-auto max-w-3xl py-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">Hôtel</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-5xl">
            Des chambres confortables pour un séjour paisible
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/90">
            Choisissez votre chambre et réservez directement sur WhatsApp : notre réception vous répond immédiatement.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Nos chambres</p>
        <h2 className="mt-1 text-2xl font-bold md:text-3xl">Trouvez la chambre qu’il vous faut</h2>
        <div className="mt-7 grid gap-6 md:grid-cols-3">
          {rooms === null ? (
            <p className="text-brand-muted">Chargement des chambres...</p>
          ) : rooms.length === 0 ? (
            <p className="text-brand-muted">Aucune chambre disponible pour le moment.</p>
          ) : (
            rooms.map((room) => (
              <RoomCard key={room.id} room={room} waNumber={waNumber} onPreview={setPreview} />
            ))
          )}
        </div>
      </main>

      {/* Galerie photos */}
      <RoomGallery preview={preview} onClose={() => setPreview(null)} />

      <CtaBand waNumber={waNumber} title="Une question ? Une réservation ?" />
      <SiteFooter waNumber={waNumber} />
    </>
  );
}
