import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../lib/auth.server.js';

// On tente de charger .env.local en priorité (standard Next.js) puis .env
// Load .env.local first, then .env (standard Next.js behavior)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Load .env as fallback

/**
 * Script pour créer un administrateur initial
 * À exécuter une seule fois après la configuration de Supabase
 * 
 * Usage: npx tsx src/scripts/create-admin.ts
 */

async function createAdmin() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const email = process.env.ADMIN_EMAIL || 'admin@belhotel.com';
    const password = process.env.ADMIN_PASSWORD || 'Belhotel2024!';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Veuillez définir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env.local');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('📝 Création de l\'administrateur...');
    console.log(`Email: ${email}`);

    // Hash du mot de passe
    const passwordHash = hashPassword(password);

    // Création directe dans la table admins (sans Supabase Auth)
    const { data, error } = await supabase
      .from('admins')
      .upsert(
        [
          {
            email,
            password_hash: passwordHash,
            is_active: true,
          },
        ],
        { onConflict: 'email' }
      )
      .select();

    if (error) {
      console.error('❌ Erreur création admin:', error.message);
      process.exit(1);
    }

    console.log('✅ Administrateur créé avec succès!');
    console.log(`\nIdentifiants de connexion:`);
    console.log(`Email: ${email}`);
    console.log(`Mot de passe: ${password}`);
    console.log(`\n⚠️  Changez le mot de passe après votre première connexion !`);
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    return;
  }
}

createAdmin();
