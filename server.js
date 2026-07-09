// Serveur statique pour le développement local.
// En production (Vercel), les fichiers sont servis directement et
// toutes les données passent par Supabase — ce serveur n'est pas utilisé.
const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const publicPath = __dirname;

app.use(express.static(publicPath));

// Anciennes URLs -> nouvelles pages statiques
app.get('/admin/login', (req, res) => res.redirect('/admin-login.html'));
app.get('/admin', (req, res) => res.redirect('/admin.html'));
app.get('/chambres', (req, res) => res.redirect('/chambres.html'));
app.get('/restaurant', (req, res) => res.redirect('/restaurant.html'));
app.get('/bar', (req, res) => res.redirect('/bar.html'));

const port = process.env.PORT || 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(port, '0.0.0.0', () => {
  console.log('Serveur démarré sur:');
  console.log(`  Local: http://localhost:${port}`);
  console.log(`  Réseau: http://${getLocalIP()}:${port}`);
});
