'use client';

import { useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { Card, Field, inputCls, submitCls } from './ui';

export default function SettingsPanel() {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState(null); // {ok, text}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.from('app_settings')
      .select('value')
      .eq('key', 'whatsapp_number')
      .maybeSingle()
      .then(({ data }) => setValue((data && data.value) || ''));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setFeedback(null);
    const digits = value.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      setFeedback({ ok: false, text: 'Numéro invalide : indiquez 8 à 15 chiffres, avec l’indicatif pays.' });
      return;
    }
    setBusy(true);
    const { error } = await db.from('app_settings').upsert([{ key: 'whatsapp_number', value: digits }]);
    setBusy(false);
    if (error) {
      setFeedback({ ok: false, text: 'Erreur : ' + error.message });
      return;
    }
    setValue(digits);
    setFeedback({ ok: true, text: 'Numéro enregistré ! Les boutons WhatsApp du site utilisent ce numéro dès maintenant.' });
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-1 font-heading text-base font-bold">Numéro WhatsApp de la réception</h2>
      <p className="mb-4 text-[0.9rem] text-brand-muted">
        C’est le numéro qu’ouvrent les boutons « Réserver » et « Discuter sur WhatsApp » du site. Format international
        sans + ni espaces (ex : 2250757432898). La modification est immédiate.
      </p>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Numéro WhatsApp">
          <input
            required
            inputMode="numeric"
            placeholder="2250757432898"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputCls}
          />
        </Field>
        <button type="submit" disabled={busy} className={submitCls}>
          {busy ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
      {feedback ? (
        <p className={`mt-3 font-semibold ${feedback.ok ? 'text-green-700' : 'text-red-700'}`}>{feedback.text}</p>
      ) : null}
    </Card>
  );
}
