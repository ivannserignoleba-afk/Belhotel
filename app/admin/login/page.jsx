'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../lib/supabase';
import { Field, inputCls, submitCls } from '../../../components/admin/ui';

const HERO =
  'https://kywrazusfmumigbjktaz.supabase.co/storage/v1/object/public/belhotel-images/rooms/1778854766853-photo_2026-05-08_15-43-52.jpg';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/admin');
    });
  }, [router]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    const { error: authError } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      setBusy(false);
      setError('Identifiants incorrects. Vérifiez votre email et votre mot de passe.');
      return;
    }

    const { data: staff } = await db
      .from('admins')
      .select('role')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (!staff) {
      await db.auth.signOut();
      setBusy(false);
      setError('Ce compte n’a pas accès à l’espace de gestion.');
      return;
    }

    router.replace('/admin');
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <div
        className="hidden flex-col justify-end bg-cover bg-center p-12 text-white md:flex"
        style={{
          backgroundImage: `linear-gradient(rgba(24,14,8,0.45), rgba(24,14,8,0.78)), url('${HERO}')`,
        }}
      >
        <span className="font-heading text-2xl font-extrabold tracking-[0.2em]">
          BEL<span className="text-brand">HOTEL</span>
        </span>
        <h1 className="mt-5 max-w-md text-3xl font-extrabold leading-tight">Espace de gestion du complexe</h1>
        <p className="mt-3 max-w-md text-white/85">
          Hôtel, restaurant et bar : pilotez toute l’activité depuis un seul endroit.
        </p>
      </div>

      <div className="grid place-items-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Espace personnel</p>
          <h2 className="mt-1 text-3xl font-extrabold">Connexion</h2>
          <p className="mt-1 text-brand-muted">Connectez-vous avec le compte fourni par votre direction.</p>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="Adresse email">
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="vous@belhotel.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Mot de passe">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-brand-muted hover:text-brand-deep"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>
            <button type="submit" disabled={busy} className={submitCls}>
              {busy ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {error ? <p className="mt-3 font-semibold text-red-700">{error}</p> : null}
          <p className="mt-5 text-[0.95rem]">
            <Link href="/" className="font-semibold text-brand-deep hover:underline">
              ← Retour au site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
