'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { db, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import { ROLE_OPTIONS, ROLE_LABELS } from '../../lib/adminShared';
import { confirmAction, confirmDelete, showError, toastSuccess } from '../../lib/alerts';
import { Badge, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'serveur' };

function EyeButton({ shown, onToggle }) {
  return (
    <button
      type="button"
      aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      onClick={onToggle}
      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-brand-muted hover:text-brand-deep"
    >
      {shown ? (
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
  );
}

export default function StaffPanel({ myEmail }) {
  const [staff, setStaff] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [editMember, setEditMember] = useState(null); // membre en cours d'édition
  const [editForm, setEditForm] = useState({ full_name: '', role: 'serveur' });
  const [busy, setBusy] = useState(false);

  const signupClient = useMemo(
    () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }),
    [],
  );

  const load = useCallback(async () => {
    const { data } = await db.from('admins').select('*').order('role').order('full_name');
    setStaff(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitCreate(event) {
    event.preventDefault();
    setBusy(true);

    const email = form.email.trim().toLowerCase();
    const { error: signupError } = await signupClient.auth.signUp({ email, password: form.password });

    if (signupError && !/already/i.test(signupError.message)) {
      setBusy(false);
      showError(signupError.message);
      return;
    }

    const { error: rowError } = await db.from('admins').upsert(
      [
        {
          email,
          password_hash: '(supabase-auth)',
          is_active: true,
          role: form.role,
          full_name: form.full_name.trim(),
        },
      ],
      { onConflict: 'email' },
    );

    setBusy(false);
    if (rowError) {
      showError(rowError.message);
      return;
    }

    setCreateOpen(false);
    setForm(EMPTY_FORM);
    toastSuccess(`Compte créé : ${email}`);
    load();
  }

  function openEdit(member) {
    setEditMember(member);
    setEditForm({ full_name: member.full_name || '', role: member.role });
  }

  async function submitEdit(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await db
      .from('admins')
      .update({ full_name: editForm.full_name.trim(), role: editForm.role })
      .eq('id', editMember.id);
    setBusy(false);
    if (error) {
      showError(error.message);
      return;
    }
    setEditMember(null);
    toastSuccess('Membre modifié');
    load();
  }

  async function toggleActive(member) {
    if (member.is_active) {
      const ok = await confirmAction(
        `Désactiver ${member.full_name || member.email} ?`,
        'Son accès à l’espace de gestion sera coupé immédiatement.',
        'Oui, désactiver',
      );
      if (!ok) return;
    }
    const { error } = await db.from('admins').update({ is_active: !member.is_active }).eq('id', member.id);
    if (error) showError(error.message);
    else {
      toastSuccess(member.is_active ? 'Compte désactivé' : 'Compte réactivé');
      load();
    }
  }

  async function remove(member) {
    const ok = await confirmDelete(
      `Supprimer ${member.full_name || member.email} ?`,
      'Le compte perdra définitivement son accès à l’espace de gestion.',
    );
    if (!ok) return;
    const { error } = await db.from('admins').delete().eq('id', member.id);
    if (error) showError(error.message);
    else {
      toastSuccess('Membre supprimé');
      load();
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <PrimaryBtn
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          + Ajouter
        </PrimaryBtn>
      </div>

      {staff === null ? (
        <EmptyState>Chargement...</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {staff.map((member) => {
            const isMe = member.email === myEmail;
            return (
              <article
                key={member.id}
                className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-dark text-lg font-extrabold text-white">
                    {(member.full_name || member.email).trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong>{member.full_name || member.email}</strong>
                      <Badge tone={member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}>
                        {member.is_active ? 'Actif' : 'Désactivé'}
                      </Badge>
                      <Badge>{ROLE_LABELS[member.role] || member.role}</Badge>
                    </div>
                    <p className="truncate text-[0.92rem] text-brand-muted">{member.email}</p>
                  </div>
                </div>
                {isMe ? (
                  <p className="mt-3 text-[0.85rem] text-brand-muted">C’est vous</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GhostBtn onClick={() => openEdit(member)}>Modifier</GhostBtn>
                    <GhostBtn green={!member.is_active} onClick={() => toggleActive(member)}>
                      {member.is_active ? 'Désactiver' : 'Réactiver'}
                    </GhostBtn>
                    <GhostBtn danger onClick={() => remove(member)}>
                      Supprimer
                    </GhostBtn>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Création */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau membre">
        <form onSubmit={submitCreate} className="grid gap-4">
          <Field label="Nom">
            <input
              required
              placeholder="Ex : Awa Koné"
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              placeholder="awa@belhotel.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Mot de passe">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Min. 8 caractères"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className={`${inputCls} pr-12`}
              />
              <EyeButton shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>
          </Field>
          <Field label="Rôle">
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className={inputCls}>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={busy} className={submitCls}>
            {busy ? 'Création...' : 'Créer le compte'}
          </button>
        </form>
        <p className="mt-3 text-[0.88rem] text-brand-muted">
          Communiquez l’email et le mot de passe à l’employé. Il pourra se connecter immédiatement.
        </p>
      </Modal>

      {/* Modification */}
      <Modal open={Boolean(editMember)} onClose={() => setEditMember(null)} title="Modifier le membre">
        {editMember ? (
          <form onSubmit={submitEdit} className="grid gap-4">
            <Field label="Email">
              <input disabled value={editMember.email} className={`${inputCls} opacity-60`} />
            </Field>
            <Field label="Nom">
              <input
                required
                value={editForm.full_name}
                onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Rôle">
              <select
                value={editForm.role}
                onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
                className={inputCls}
              >
                {ROLE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" disabled={busy} className={submitCls}>
              {busy ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
