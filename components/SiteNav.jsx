'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSetting } from '../lib/supabase';

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/chambres', label: 'Chambres' },
  { href: '/restaurant', label: 'Restaurant' },
  { href: '/bar', label: 'Bar' },
];

export function Brand({ className = '' }) {
  const [logo, setLogo] = useState('');

  useEffect(() => {
    getSetting('logo_url', '').then(setLogo).catch(() => {});
  }, []);

  return (
    <Link href="/" className={`inline-flex items-center ${className}`} aria-label="Belhotel">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="Belhotel" className="h-11 w-11 rounded-full object-contain" />
      ) : (
        <span className="font-heading text-xl font-extrabold tracking-[0.2em]">
          BEL<span className="text-brand">HOTEL</span>
        </span>
      )}
    </Link>
  );
}

export default function SiteNav({ active }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between py-4">
      <Brand className="text-white" />

      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-full border border-white/40 bg-white/10 md:hidden"
      >
        <span className={`h-0.5 w-5 rounded bg-white transition ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
        <span className={`h-0.5 w-5 rounded bg-white transition ${open ? 'opacity-0' : ''}`} />
        <span className={`h-0.5 w-5 rounded bg-white transition ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
      </button>

      <div
        className={`${open ? 'flex' : 'hidden'} absolute right-0 top-full z-30 mt-2 w-full flex-col gap-1 rounded-2xl border border-brand-line bg-white p-3 shadow-xl md:static md:mt-0 md:flex md:w-auto md:flex-row md:items-center md:gap-1 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`rounded-full px-4 py-2 font-medium text-brand-ink md:text-white/85 md:hover:bg-white/15 md:hover:text-white ${
              active === link.href ? 'bg-brand-pale text-brand-deep md:bg-white/15 md:text-white' : 'hover:bg-brand-soft'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/admin/login"
          className="mt-1 rounded-lg bg-brand-dark px-4 py-2.5 text-center text-[0.82rem] font-bold uppercase tracking-wider text-white hover:bg-brand-deep md:ml-2 md:mt-0"
        >
          Connexion admin
        </Link>
      </div>
    </nav>
  );
}
