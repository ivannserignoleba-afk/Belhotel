import { createClient } from '@supabase/supabase-js';

// La clé "anon" est publique par conception : la sécurité est assurée
// par les règles RLS côté base de données.
export const SUPABASE_URL = 'https://kywrazusfmumigbjktaz.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d3JhenVzZm11bWlnYmprdGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjM0OTksImV4cCI6MjA5Mjg5OTQ5OX0.RhEC-auUfjaTyWoqYaC2E11uewHQ90FWHmjE349fiBk';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const FALLBACK_WHATSAPP = '2250757432898';

let settingsCache = null;
export async function getSetting(key, fallback) {
  if (!settingsCache) {
    const { data } = await db.from('app_settings').select('key, value');
    settingsCache = {};
    (data || []).forEach((row) => {
      settingsCache[row.key] = row.value;
    });
  }
  return settingsCache[key] || fallback;
}

export function formatPrice(value) {
  return Number(value).toLocaleString('fr-FR') + ' FCFA';
}

export const CATEGORY_LABELS = {
  standard: 'Standard',
  vip: 'VIP',
  vvip: 'VVIP',
};
