'use client';

import Link from 'next/link';
import { Brand } from './SiteNav';

export default function SiteFooter({ waNumber }) {
  return (
    <footer className="bg-brand-night px-6 pb-6 pt-10 text-white/75">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Brand className="text-white" />
          <p className="mt-3 text-sm leading-relaxed">
            Hôtel · Restaurant · Bar Lounge
            <br />
            Un complexe unique pour vos séjours et vos soirées.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-extrabold uppercase tracking-[0.15em] text-white">Le complexe</h4>
          <Link href="/chambres" className="block py-1 hover:text-brand">Nos chambres</Link>
          <Link href="/restaurant" className="block py-1 hover:text-brand">Le restaurant</Link>
          <Link href="/bar" className="block py-1 hover:text-brand">Le bar lounge</Link>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-extrabold uppercase tracking-[0.15em] text-white">Contact</h4>
          {waNumber ? (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Bonjour, je vous contacte depuis le site du Belhotel After Work.')}`}
              target="_blank"
              rel="noopener"
              className="block py-1 hover:text-brand"
            >
              WhatsApp : +{waNumber}
            </a>
          ) : null}
          <p className="py-1">Côte d’Ivoire</p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-5 text-center text-sm">
        © {new Date().getFullYear()} Belhotel After Work. Tous droits réservés.
      </p>
    </footer>
  );
}
