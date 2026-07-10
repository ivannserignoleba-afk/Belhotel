'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/supabase';
import { ROLE_LABELS, beep, initSound, notify, flashTitle } from '../../lib/adminShared';
import { toastSuccess, warnLowStock } from '../../lib/alerts';
import OrdersBoard from '../../components/admin/OrdersBoard';
import RequestsBoard from '../../components/admin/RequestsBoard';
import RoomsPanel from '../../components/admin/RoomsPanel';
import MenuPanel from '../../components/admin/MenuPanel';
import AuditPanel from '../../components/admin/AuditPanel';
import StaffPanel from '../../components/admin/StaffPanel';
import SettingsPanel from '../../components/admin/SettingsPanel';
import StatsPanel from '../../components/admin/StatsPanel';
import QrPanel from '../../components/admin/QrPanel';

const ICONS = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  bed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M2 18h20" />
    </svg>
  ),
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  ),
  wine: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M8 22h8" />
      <path d="M7 10h10" />
      <path d="M12 15v7" />
      <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

const SECTIONS = {
  overview: { title: 'Aperçu', subtitle: 'Vue d’ensemble du complexe Belhotel' },
  staff: { title: 'Personnel', subtitle: 'Gérez les comptes de votre équipe' },
  audit: { title: 'Audit', subtitle: 'Tout ce qui se passe sur la plateforme : qui, quoi, quand' },
  settings: { title: 'Réglages', subtitle: 'Paramètres du site et des réservations' },
  'orders-rooms': { title: 'Commandes des chambres', subtitle: 'Commandes reçues depuis les QR codes des chambres' },
  requests: { title: 'Demandes de service', subtitle: 'Serviettes, climatisation, ménage...' },
  rooms: { title: 'Chambres', subtitle: 'Gérez les chambres de l’hôtel' },
  'qr-room': { title: 'QR codes des chambres', subtitle: 'Créez et imprimez les QR codes à placer dans les chambres' },
  'orders-resto': { title: 'Commandes', subtitle: 'Commandes des tables et des chambres en temps réel' },
  restaurant: { title: 'Menus du restaurant', subtitle: 'Cartes, prix et stock des plats' },
  'qr-table': { title: 'QR codes des tables', subtitle: 'Créez et imprimez les QR codes des tables' },
  'orders-bar': { title: 'Commandes', subtitle: 'Commandes des salons et des chambres en temps réel' },
  bar: { title: 'Carte du bar', subtitle: 'Boissons, prix et stock du bar' },
  'qr-salon': { title: 'QR codes des salons', subtitle: 'Créez et imprimez les QR codes des salons' },
};

const NAV_LABELS = {
  overview: 'Statistiques',
  audit: 'Audit',
  staff: 'Équipe',
  settings: 'Réglages',
  'orders-rooms': 'Commandes',
  requests: 'Demandes de service',
  rooms: 'Chambres',
  'qr-room': 'QR codes',
  'orders-resto': 'Commandes',
  restaurant: 'Menus',
  'qr-table': 'QR codes',
  'orders-bar': 'Commandes',
  bar: 'Carte',
  'qr-salon': 'QR codes',
};

const TOP_SECTIONS = [
  { key: 'stats', label: 'Stats', icon: 'overview', items: ['overview'] },
  { key: 'audit', label: 'Audit', icon: 'audit', items: ['audit'] },
  { key: 'hotel', label: 'Hôtel', icon: 'bed', items: ['orders-rooms', 'requests', 'rooms', 'qr-room'] },
  { key: 'restaurant', label: 'Restaurant', icon: 'utensils', items: ['orders-resto', 'restaurant', 'qr-table'] },
  { key: 'bar', label: 'Bar', icon: 'wine', items: ['orders-bar', 'bar', 'qr-salon'] },
  { key: 'equipe', label: 'Équipe', icon: 'users', items: ['staff'] },
  { key: 'reglages', label: 'Réglages', icon: 'settings', items: ['settings'] },
];

const ROLE_SECTIONS = {
  superadmin: Object.keys(SECTIONS),
  reception: ['orders-rooms', 'requests', 'rooms', 'qr-room'],
  resto: ['orders-resto', 'restaurant', 'qr-table'],
  bar: ['orders-bar', 'bar', 'qr-salon'],
  serveur: ['orders-resto', 'orders-bar'],
};

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[0.68rem] font-extrabold text-white">
      {count}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [email, setEmail] = useState('');
  const [section, setSection] = useState(null);
  const [badges, setBadges] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);
  const [alertsOn, setAlertsOn] = useState(false);

  const setBadge = useCallback((key, count) => {
    setBadges((current) => (current[key] === count ? current : { ...current, [key]: count }));
  }, []);

  // Garde d'authentification + rôle
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await db.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
        return;
      }
      const { data: row } = await db.from('admins').select('role, full_name').eq('email', session.user.email).maybeSingle();
      if (!row) {
        await db.auth.signOut();
        router.replace('/admin/login');
        return;
      }
      setEmail(session.user.email);
      setStaff(row);
    })();
  }, [router]);

  const sections = useMemo(() => (staff ? ROLE_SECTIONS[staff.role] || [] : []), [staff]);
  const myTopSections = useMemo(
    () =>
      TOP_SECTIONS.map((top) => ({ ...top, items: top.items.filter((key) => sections.includes(key)) })).filter(
        (top) => top.items.length,
      ),
    [sections],
  );

  useEffect(() => {
    if (staff && !section && myTopSections.length) setSection(myTopSections[0].items[0]);
  }, [staff, section, myTopSections]);

  // Le son est déverrouillé au premier geste (exigence des navigateurs)
  useEffect(() => {
    const unlock = () => initSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Écran maintenu allumé (tablette cuisine/réception) + proposition d'installation
  const [installEvt, setInstallEvt] = useState(null);
  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch (ignore) {
        /* wake lock indisponible */
      }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);

    const onInstall = (event) => {
      event.preventDefault();
      setInstallEvt(event);
    };
    window.addEventListener('beforeinstallprompt', onInstall);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeinstallprompt', onInstall);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  async function installApp() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  async function enableAlerts() {
    initSound();
    beep(1);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    } catch (ignore) {
      /* notifications non disponibles */
    }
    setAlertsOn(true);
    toastSuccess('Alertes sonores activées');
  }

  // Temps réel : les nouveaux évènements rafraîchissent les tableaux
  const channelRef = useRef(null);
  useEffect(() => {
    if (!staff || channelRef.current) return undefined;
    const channel = db
      .channel('staff-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          beep(3);
          const origin = (payload.new.origin_type === 'room' ? 'Chambre ' : '') + (payload.new.origin_label || '');
          notify('Nouvelle commande — Belhotel', `${origin} · ${(payload.new.total || 0).toLocaleString('fr-FR')} FCFA`);
          flashTitle('(1) Nouvelle commande — Belhotel');
        }
        setRefreshTick((tick) => tick + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          beep(3);
          notify('Nouvelle demande de service — Belhotel', `Chambre ${payload.new.origin_label || ''} · ${payload.new.category || ''}`);
          flashTitle('(1) Nouvelle demande — Belhotel');
        }
        setRefreshTick((tick) => tick + 1);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      db.removeChannel(channel);
      channelRef.current = null;
    };
  }, [staff]);

  // Alerte stock : badges sur les compartiments Stock + avertissement à l'arrivée
  const lowStockWarned = useRef(false);
  useEffect(() => {
    if (!staff) return;
    const targets = [];
    if (sections.includes('restaurant')) targets.push(['restaurant', 'restaurant_menu']);
    if (sections.includes('bar')) targets.push(['bar', 'bar_menu']);
    if (!targets.length) return;
    (async () => {
      const lowNames = [];
      for (const [key, table] of targets) {
        const { data } = await db
          .from(table)
          .select('name, stock_qty')
          .not('stock_qty', 'is', null)
          .lte('stock_qty', 5);
        setBadge(key, (data || []).length);
        (data || []).forEach((item) => lowNames.push(`${item.name} (${item.stock_qty} restant${item.stock_qty > 1 ? 's' : ''})`));
      }
      if (lowNames.length && !lowStockWarned.current) {
        lowStockWarned.current = true;
        warnLowStock(lowNames);
      }
    })();
  }, [staff, sections, refreshTick, setBadge]);

  if (!staff || !section) {
    return <p className="py-24 text-center text-brand-muted">Chargement...</p>;
  }

  const currentTop = myTopSections.find((top) => top.items.includes(section));
  const meta = SECTIONS[section];
  const name = staff.full_name || email;

  async function logout() {
    await db.auth.signOut();
    router.replace('/admin/login');
  }

  return (
    <div className="min-h-screen bg-brand-soft">
      {/* Barre du haut */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-brand-line bg-white px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-dark font-extrabold text-white">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <strong className="block max-w-[160px] truncate text-[0.92rem]">{name}</strong>
            <span className="hidden items-center gap-1.5 text-xs text-brand-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {ROLE_LABELS[staff.role] || staff.role}
            </span>
          </div>
        </div>

        <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-2xl bg-[#f4efe9] p-1 md:order-none md:mx-auto md:w-auto md:rounded-full [&::-webkit-scrollbar]:hidden">
          {myTopSections.map((top) => {
            const total = top.items.reduce((sum, key) => sum + (badges[key] || 0), 0);
            const active = currentTop?.key === top.key;
            return (
              <button
                key={top.key}
                type="button"
                onClick={() => setSection(top.items[0])}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[0.88rem] font-semibold transition ${
                  active ? 'bg-white font-bold text-brand-ink shadow-md' : 'text-[#6d5d4f] hover:text-brand-ink'
                }`}
              >
                {ICONS[top.icon]}
                {top.label}
                <Badge count={total} />
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {installEvt ? (
            <button
              type="button"
              onClick={installApp}
              className="mr-1 hidden items-center gap-1.5 rounded-full bg-brand-dark px-3.5 py-2 text-[0.78rem] font-bold text-white hover:bg-brand-deep sm:inline-flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Installer l’app
            </button>
          ) : null}
          <button
            type="button"
            onClick={enableAlerts}
            title={alertsOn ? 'Alertes sonores activées' : 'Activer le son et les notifications'}
            className={`grid h-10 w-10 place-items-center rounded-full transition ${
              alertsOn ? 'bg-brand-pale text-brand-deep' : 'bg-brand-soft text-brand-muted hover:text-brand-deep'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.88rem] font-semibold text-brand-muted hover:bg-brand-soft hover:text-brand-deep"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-5 md:px-6">
        {/* Compartiments de la section */}
        {currentTop && currentTop.items.length > 1 ? (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {currentTop.items.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-[0.82rem] font-semibold transition ${
                  section === key
                    ? 'border-brand-deep bg-brand-deep text-white'
                    : 'border-brand-line bg-white text-brand-ink hover:border-brand-dark'
                }`}
              >
                {NAV_LABELS[key]}
                <Badge count={badges[key] || 0} />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mb-5 flex items-center gap-3">
          <span className="h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-brand to-brand-deep" />
          <div>
            <h1 className="text-2xl font-bold">{meta.title}</h1>
            <p className="text-[0.92rem] text-brand-muted">{meta.subtitle}</p>
          </div>
        </div>

        {/* Panneaux */}
        {section === 'overview' ? <StatsPanel refreshTick={refreshTick} /> : null}
        {section === 'audit' ? <AuditPanel refreshTick={refreshTick} /> : null}
        {section === 'staff' ? <StaffPanel myEmail={email} /> : null}
        {section === 'settings' ? <SettingsPanel /> : null}
        {['orders-rooms', 'orders-resto', 'orders-bar'].includes(section) ? (
          <OrdersBoard boardKey={section} refreshTick={refreshTick} setBadge={setBadge} />
        ) : null}
        {section === 'requests' ? <RequestsBoard refreshTick={refreshTick} setBadge={setBadge} /> : null}
        {section === 'rooms' ? <RoomsPanel /> : null}
        {section === 'restaurant' ? (
          <MenuPanel
            table="restaurant_menu"
            itemLabel="plat"
            listTitle="Plats du restaurant"
            categoryOptions={[
              ['standard', 'Menu Standard'],
              ['vip', 'Menu VIP'],
              ['vvip', 'Menu VVIP'],
            ]}
          />
        ) : null}
        {section === 'bar' ? (
          <MenuPanel
            table="bar_menu"
            itemLabel="boisson"
            listTitle="Boissons du bar"
            categoryOptions={[
              ['standard', 'Bar Standard'],
              ['vip', 'Salon VIP'],
              ['vvip', 'Expérience VVIP'],
            ]}
          />
        ) : null}
        {section === 'qr-room' ? <QrPanel scope="room" /> : null}
        {section === 'qr-table' ? <QrPanel scope="table" /> : null}
        {section === 'qr-salon' ? <QrPanel scope="salon" /> : null}
      </main>
    </div>
  );
}
