// Client Supabase partagé par toutes les pages du site.
// La clé "anon" est publique par conception : la sécurité est assurée
// par les règles RLS côté base de données.
const SUPABASE_URL = 'https://kywrazusfmumigbjktaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d3JhenVzZm11bWlnYmprdGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjM0OTksImV4cCI6MjA5Mjg5OTQ5OX0.RhEC-auUfjaTyWoqYaC2E11uewHQ90FWHmjE349fiBk';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatPrice(value) {
  return Number(value).toLocaleString('fr-FR') + ' FCFA';
}

const CATEGORY_LABELS = {
  standard: 'Standard',
  vip: 'VIP',
  vvip: 'VVIP',
};
