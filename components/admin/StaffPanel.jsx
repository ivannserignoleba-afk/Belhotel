'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { db, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import {
  ROLE_OPTIONS,
  ROLE_LABELS,
  SECTOR_LABELS,
  SECTOR_OPTIONS,
  SECTOR_QR_TYPE,
} from '../../lib/adminShared';
import { confirmAction, confirmDelete, showError, showWarning, toastSuccess } from '../../lib/alerts';
import { Badge, EmptyState, Field, GhostBtn, Modal, PrimaryBtn, inputCls, submitCls } from './ui';

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'serveur', sector: 'resto' };

// Attribution des tables (restaurant) ou des salons (bar) à un serveur.
// Une table n'a qu'un seul responsable : l'assigner à quelqu'un la retire
// automatiquement au précédent, puisque c'est une simple colonne.
function AssignPoints({ member, points, names, onClose, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const type = SECTOR_QR_TYPE[member?.sector];
  const list = (points || []).filter((point) => point.type === type && point.is_active);

  async function toggle(point) {
    setBusyId(point.id);
    const next = point.assigned_to === member.id ? null : member.id;
    const { error } = await db.from('qr_points').update({ assigned_to: next }).eq('id', point.id);
    setBusyId(null);
    if (error) showError(error.message);
    else onChanged();
  }

  return (
    <Modal
      open={Boolean(member)}
      onClose={onClose}
      title={member ? `Tables de ${member.full_name || member.email}` : ''}
    >
      {!type ? (
        <EmptyState>Définissez d’abord le pôle de ce serveur (Restaurant ou Bar).</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState>
          Aucun {type === 'table' ? 'e table' : ' salon'} actif. Créez-les d’abord dans la section QR codes.
        </EmptyState>
      ) : (
        <div className="grid gap-2">
          {list.map((point) => {
            const owner = point.assigned_to;
            const isMine = owner === member.id;
            return (
              <div
                key={point.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                  isMine ? 'border-brand-dark bg-brand-soft' : 'border-brand-line'
                }`}
              >
                <div className="min-w-0">
                  <strong className="block">{point.label.trim()}</strong>
                  <span className="text-[0.82rem] text-brand-muted">
                    {!owner ? 'Libre' : isMine ? 'Assignée à ce serveur' : `Assignée à ${names[owner] || 'un autre serveur'}`}
                  </span>
                </div>
                <GhostBtn green={!isMine} danger={isMine} disabled={busyId === point.id} onClick={() => toggle(point)}>
                  {isMine ? 'Retirer' : 'Assigner'}
                </GhostBtn>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[0.88rem] text-brand-muted">
        Assigner une table déjà prise la retire automatiquement à l’autre serveur.
      </p>
    </Modal>
  );
}

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
  const [editForm, setEditForm] = useState({ full_name: '', role: 'serveur', sector: 'resto' });
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState([]); // tables et salons, pour l'assignation
  const [assignMember, setAssignMember] = useState(null);

  const signupClient = useMemo(
    () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }),
    [],
  );

  const load = useCallback(async () => {
    const [{ data }, { data: qrPoints }] = await Promise.all([
      db.from('admins').select('*').order('role').order('full_name'),
      db.from('qr_points').select('*').order('label'),
    ]);
    setStaff(data || []);
    setPoints(qrPoints || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitCreate(event) {
    event.preventDefault();
    setBusy(true);

    const email = form.email.trim().toLowerCase();
    const { data: signupData, error: signupError } = await signupClient.auth.signUp({
      email,
      password: form.password,
    });

    if (signupError && !/already/i.test(signupError.message)) {
      setBusy(false);
      showError(signupError.message);
      return;
    }

    // Supabase ne dit pas toujours franchement qu'un email existe déjà : selon
    // les réglages il renvoie une erreur « already registered », ou bien un
    // utilisateur factice dont la liste d'identités est vide. Dans les deux cas
    // le mot de passe saisi ici N'A PAS été appliqué au compte existant.
    const alreadyRegistered =
      Boolean(signupError) || (signupData?.user ? (signupData.user.identities || []).length === 0 : false);

    // Sans session renvoyée ni erreur, c'est que la confirmation par email est
    // activée : l'employé ne pourra pas se connecter avant d'avoir cliqué le lien.
    const needsEmailConfirmation = !alreadyRegistered && Boolean(signupData?.user) && !signupData?.session;

    const { error: rowError } = await db.from('admins').upsert(
      [
        {
          email,
          password_hash: '(supabase-auth)',
          is_active: true,
          role: form.role,
          full_name: form.full_name.trim(),
          sector: form.role === 'serveur' ? form.sector : null,
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

    if (alreadyRegistered) {
      showWarning(
        'Compte déjà existant',
        `${email} possède déjà un compte. Son nom et son rôle ont bien été enregistrés, mais le mot de passe saisi n’a PAS été appliqué : l’employé doit continuer à utiliser son ancien mot de passe.`,
      );
    } else if (needsEmailConfirmation) {
      showWarning(
        'Email à confirmer',
        `Le compte ${email} est créé, mais la confirmation par email est activée sur le projet : l’employé doit d’abord cliquer le lien reçu avant de pouvoir se connecter.`,
      );
    } else {
      toastSuccess(`Compte créé : ${email}`);
    }

    load();
  }

  function openEdit(member) {
    setEditMember(member);
    setEditForm({
      full_name: member.full_name || '',
      role: member.role,
      sector: member.sector || 'resto',
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await db
      .from('admins')
      .update({
        full_name: editForm.full_name.trim(),
        role: editForm.role,
        sector: editForm.role === 'serveur' ? editForm.sector : null,
      })
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

  const names = {};
  (staff || []).forEach((member) => {
    names[member.id] = member.full_name || member.email;
  });
  const pointsOf = (id) => points.filter((point) => point.assigned_to === id && point.is_active);

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
                      {member.role === 'serveur' && member.sector ? (
                        <Badge tone="bg-blue-100 text-blue-700">{SECTOR_LABELS[member.sector]}</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-[0.92rem] text-brand-muted">{member.email}</p>
                    {member.role === 'serveur' ? (
                      <p className="text-[0.85rem] text-brand-muted">
                        {pointsOf(member.id).length
                          ? pointsOf(member.id)
                              .map((point) => point.label.trim())
                              .join(' · ')
                          : 'Aucune table assignée'}
                      </p>
                    ) : null}
                  </div>
                </div>
                {isMe ? (
                  <p className="mt-3 text-[0.85rem] text-brand-muted">C’est vous</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.role === 'serveur' ? (
                      <GhostBtn onClick={() => setAssignMember(member)}>Tables</GhostBtn>
                    ) : null}
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
          {form.role === 'serveur' ? (
            <Field label="Pôle du serveur">
              <select
                value={form.sector}
                onChange={(event) => setForm({ ...form, sector: event.target.value })}
                className={inputCls}
              >
                {SECTOR_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
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
            {editForm.role === 'serveur' ? (
              <Field label="Pôle du serveur">
                <select
                  value={editForm.sector}
                  onChange={(event) => setEditForm({ ...editForm, sector: event.target.value })}
                  className={inputCls}
                >
                  {SECTOR_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <button type="submit" disabled={busy} className={submitCls}>
              {busy ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        ) : null}
      </Modal>

      {/* Attribution des tables */}
      <AssignPoints
        member={assignMember}
        points={points}
        names={names}
        onClose={() => setAssignMember(null)}
        onChanged={load}
      />
    </div>
  );
}
