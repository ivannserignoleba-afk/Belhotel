'use client';

import { useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { uploadImage } from '../../lib/adminShared';
import { showError, toastSuccess } from '../../lib/alerts';
import { Card, Field, inputCls, submitCls } from './ui';

// Réglage d'une image (téléversée) stockée dans app_settings
function ImageSetting({ label, settingKey, hint, folder = 'home', compress = true, preview = 'rect' }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.from('app_settings')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle()
      .then(({ data }) => setUrl((data && data.value) || ''));
  }, [settingKey]);

  async function onFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const publicUrl = await uploadImage(file, folder, { compress });
      const { error } = await db.from('app_settings').upsert([{ key: settingKey, value: publicUrl }]);
      if (error) throw error;
      setUrl(publicUrl);
      toastSuccess('Image mise à jour');
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  const box = preview === 'circle' ? 'h-20 w-20 rounded-full object-contain bg-white p-1' : 'h-20 w-28 rounded-lg object-cover';

  return (
    <div>
      <p className="mb-2 text-[0.74rem] font-bold uppercase tracking-wider text-brand-muted">{label}</p>
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={`shrink-0 border border-brand-line ${box}`} />
        ) : (
          <div className={`grid shrink-0 place-items-center bg-brand-soft text-[0.72rem] text-brand-muted ${preview === 'circle' ? 'h-20 w-20 rounded-full' : 'h-20 w-28 rounded-lg'}`}>
            Aucune
          </div>
        )}
        <label className="cursor-pointer rounded-lg bg-brand-dark px-4 py-2.5 text-[0.76rem] font-bold uppercase tracking-wide text-white hover:bg-brand-deep">
          {busy ? 'Envoi...' : 'Changer'}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      </div>
      {hint ? <p className="mt-1.5 text-[0.82rem] text-brand-muted">{hint}</p> : null}
    </div>
  );
}

export default function SettingsPanel() {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState(null);
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
    <div className="grid max-w-xl gap-4">
      <Card>
        <h2 className="mb-1 font-heading text-base font-bold">Icône de l’application</h2>
        <p className="mb-4 text-[0.9rem] text-brand-muted">
          C’est l’icône affichée sur l’écran d’accueil quand l’app est installée. Après un changement, prévenez votre
          prestataire pour qu’elle soit appliquée à l’app installée.
        </p>
        <ImageSetting label="Icône" settingKey="logo_url" folder="logo" compress={false} preview="circle" />
      </Card>

      <Card>
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

      <Card>
        <h2 className="mb-1 font-heading text-base font-bold">Photos de la page d’accueil</h2>
        <p className="mb-4 text-[0.9rem] text-brand-muted">
          Ces photos illustrent les sections Restaurant et Bar sur la page d’accueil du site. Choisissez-les depuis
          l’ordinateur ou le téléphone ; elles sont optimisées automatiquement.
        </p>
        <div className="grid gap-5">
          <ImageSetting
            label="Section Restaurant"
            settingKey="home_restaurant_image"
            hint="Ex : la photo de la salle avec les tables."
          />
          <ImageSetting
            label="Section Bar"
            settingKey="home_bar_image"
            hint="Ex : la photo d’une boisson / d’un cocktail."
          />
        </div>
      </Card>
    </div>
  );
}
