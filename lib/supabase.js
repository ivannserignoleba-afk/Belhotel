import { createClient } from '@supabase/supabase-js';

// La clé "anon" est publique par conception : la sécurité est assurée
// par les règles RLS côté base de données.
export const SUPABASE_URL = 'https://kywrazusfmumigbjktaz.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d3JhenVzZm11bWlnYmprdGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjM0OTksImV4cCI6MjA5Mjg5OTQ5OX0.RhEC-auUfjaTyWoqYaC2E11uewHQ90FWHmjE349fiBk';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const FALLBACK_WHATSAPP = '2250757432898';

// La page d'accueil demande quatre réglages d'un coup (numéro WhatsApp et les
// trois photos). On met en cache la PROMESSE et pas seulement son résultat :
// sinon les quatre appels partent avant que le premier soit revenu et la page
// lance quatre fois la même requête.
let settingsCache = null;
let settingsPromise = null;

export async function getSetting(key, fallback) {
  if (!settingsCache) {
    if (!settingsPromise) {
      settingsPromise = db
        .from('app_settings')
        .select('key, value')
        .then(({ data }) => {
          const map = {};
          (data || []).forEach((row) => {
            map[row.key] = row.value;
          });
          settingsCache = map;
        })
        .catch(() => {
          // Réseau coupé : on laisse la porte ouverte à un nouvel essai
          settingsPromise = null;
        });
    }
    await settingsPromise;
  }
  return (settingsCache && settingsCache[key]) || fallback;
}

export function formatPrice(value) {
  return Number(value).toLocaleString('fr-FR') + ' FCFA';
}

export const CATEGORY_LABELS = {
  standard: 'Standard',
  vip: 'VIP',
  vvip: 'VVIP',
};
