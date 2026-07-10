'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import CtaBand, { WhatsappLink } from '../components/CtaBand';
import RoomCard from '../components/RoomCard';
import { db, getSetting, FALLBACK_WHATSAPP } from '../lib/supabase';

const SLIDES = [
  {
    image:
      'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778854766853-photo_2026-05-08_15-43-52.jpg',
    eyebrow: 'Bienvenue au Belhotel After Work',
    title: 'Un séjour d’exception entre élégance et détente',
    text: 'Des chambres confortables, climatisées et accueillantes, au cœur d’un cadre unique.',
    cta: { href: '/chambres', label: 'Voir nos chambres' },
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Le restaurant',
    title: 'Une cuisine savoureuse, du Standard au VVIP',
    text: 'Des plats généreux préparés avec des produits frais, pour tous les goûts et toutes les occasions.',
    cta: { href: '/restaurant', label: 'Découvrir la carte' },
  },
  {
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Le bar lounge',
    title: 'Des soirées chaleureuses autour de boissons raffinées',
    text: 'Cocktails signatures, ambiance feutrée et service attentionné pour vos afterworks.',
    cta: { href: '/bar', label: 'Découvrir le bar' },
  },
  {
    image:
      'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778855021766-photo_2026-05-08_15-43-49.jpg',
    eyebrow: 'Réservation simple et rapide',
    title: 'Réservez votre chambre directement sur WhatsApp',
    text: 'Un clic suffit : notre réception vous répond immédiatement.',
    whatsapp: true,
  },
];

const HIGHLIGHTS = [
  {
    title: 'Chambres confortables',
    text: 'Climatisation, télévision, literie soignée et ambiance chaleureuse.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9">
        <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
        <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
        <path d="M2 18h20" />
      </svg>
    ),
  },
  {
    title: 'Restaurant savoureux',
    text: 'Trois cartes — Standard, VIP et VVIP — pour toutes les envies.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    ),
  },
  {
    title: 'Bar lounge',
    text: 'Cocktails signatures et ambiance feutrée pour vos soirées.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9">
        <path d="M8 22h8" />
        <path d="M7 10h10" />
        <path d="M12 15v7" />
        <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [slide, setSlide] = useState(0);
  const [rooms, setRooms] = useState(null);
  const [waNumber, setWaNumber] = useState(FALLBACK_WHATSAPP);

  useEffect(() => {
    const timer = setInterval(() => setSlide((current) => (current + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getSetting('whatsapp_number', FALLBACK_WHATSAPP).then(setWaNumber).catch(() => {});
    db.from('rooms')
      .select('*')
      .eq('status', 'available')
      .order('price', { ascending: true })
      .limit(3)
      .then(({ data }) => setRooms(data || []));
  }, []);

  return (
    <>
      {/* Diaporama plein écran */}
      <header className="relative flex min-h-[92vh] flex-col overflow-hidden bg-brand-night px-6 pb-12 text-white">
        <SiteNav active="/" />
        {SLIDES.map((item, index) => (
          <div
            key={item.title}
            className={`absolute inset-0 grid place-items-center bg-cover bg-center px-6 pb-24 pt-20 transition-opacity duration-1000 ${
              index === slide ? 'z-[5] opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
              backgroundImage: `linear-gradient(rgba(30,18,10,0.45), rgba(30,18,10,0.65)), url('${item.image}')`,
            }}
          >
            <div
              className={`max-w-3xl text-center transition-all delay-300 duration-700 ${
                index === slide ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">{item.eyebrow}</p>
              <h1 className="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">{item.title}</h1>
              <p className="mx-auto mt-4 max-w-xl text-white/90">{item.text}</p>
              {item.whatsapp ? (
                <WhatsappLink
                  waNumber={waNumber}
                  message="Bonjour, je souhaite réserver une chambre au Belhotel After Work."
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1da851] px-7 py-3.5 text-[0.82rem] font-bold uppercase tracking-wider text-white hover:bg-[#178f44]"
                >
                  Réserver sur WhatsApp
                </WhatsappLink>
              ) : (
                <Link
                  href={item.cta.href}
                  className="mt-7 inline-block rounded-lg bg-brand-dark px-7 py-3.5 text-[0.82rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep"
                >
                  {item.cta.label}
                </Link>
              )}
            </div>
          </div>
        ))}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2.5">
          {SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Aller à l'image ${index + 1}`}
              onClick={() => setSlide(index)}
              className={`h-[11px] w-[11px] rounded-full transition ${
                index === slide ? 'scale-125 bg-brand' : 'bg-white/45'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Bienvenue */}
        <section className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Bienvenue</p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-bold md:text-3xl">
            Le confort, la cuisine et l’animation au meilleur niveau
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-brand-muted">
            Belhotel After Work vous accueille pour des séjours reposants, des repas savoureux et des soirées
            mémorables. Hôtel, restaurant et bar réunis dans un seul complexe.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-brand-line bg-white p-7 text-center shadow-[0_10px_30px_rgba(194,65,12,0.08)]"
              >
                <div className="mb-3 flex justify-center text-brand">{item.icon}</div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-[0.95rem] text-brand-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Aperçu des chambres */}
        <section className="mt-16">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Nos chambres</p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">Choisissez votre chambre</h2>
            </div>
            <Link
              href="/chambres"
              className="rounded-lg border border-brand-line px-5 py-3 text-[0.78rem] font-bold uppercase tracking-wider hover:border-brand-dark hover:text-brand-deep"
            >
              Voir toutes les chambres
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {rooms === null ? (
              <p className="text-brand-muted">Chargement des chambres...</p>
            ) : rooms.length === 0 ? (
              <p className="text-brand-muted">Nos chambres arrivent bientôt. Contactez-nous sur WhatsApp !</p>
            ) : (
              rooms.map((room) => <RoomCard key={room.id} room={room} waNumber={waNumber} />)
            )}
          </div>
        </section>

        {/* Restaurant / Bar */}
        <section className="mt-16 grid overflow-hidden rounded-3xl border border-brand-line bg-white shadow-[0_10px_30px_rgba(194,65,12,0.08)] md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
            alt="Le restaurant du Belhotel"
            loading="lazy"
            className="h-full min-h-[260px] w-full object-cover"
          />
          <div className="flex flex-col items-start justify-center p-9">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Restaurant</p>
            <h2 className="mt-2 text-2xl font-bold">Une table pour chaque occasion</h2>
            <p className="mt-3 text-brand-muted">
              Du plat du jour généreux au menu VVIP entièrement personnalisé, notre cuisine met à l’honneur des
              produits frais et des saveurs locales et internationales.
            </p>
            <Link
              href="/restaurant"
              className="mt-6 rounded-lg bg-brand-dark px-6 py-3 text-[0.78rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep"
            >
              Voir la carte du restaurant
            </Link>
          </div>
        </section>

        <section className="mt-8 grid overflow-hidden rounded-3xl border border-brand-line bg-white shadow-[0_10px_30px_rgba(194,65,12,0.08)] md:grid-cols-2">
          <div className="order-2 flex flex-col items-start justify-center p-9 md:order-1">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Bar Lounge</p>
            <h2 className="mt-2 text-2xl font-bold">L’afterwork comme il se doit</h2>
            <p className="mt-3 text-brand-muted">
              Un espace convivial, un salon VIP intimiste et une expérience VVIP exclusive : le Belhotel After Work
              porte bien son nom.
            </p>
            <Link
              href="/bar"
              className="mt-6 rounded-lg bg-brand-dark px-6 py-3 text-[0.78rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep"
            >
              Découvrir le bar
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1000&q=80"
            alt="Le bar lounge du Belhotel"
            loading="lazy"
            className="order-1 h-full min-h-[260px] w-full object-cover md:order-2"
          />
        </section>
      </main>

      <CtaBand waNumber={waNumber} />
      <SiteFooter waNumber={waNumber} />
    </>
  );
}
