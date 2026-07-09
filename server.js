const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Charge les variables de .env.local (sans dépendance externe)
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

const app = express();
const publicPath = __dirname;
const ADMIN_USERNAME = process.env.SITE_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SITE_ADMIN_PASSWORD || 'belhotel2026';
// Jeton de session aléatoire, régénéré à chaque démarrage du serveur
const SESSION_TOKEN = crypto.randomBytes(32).toString('hex');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').filter(Boolean).map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [decodeURIComponent(key), decodeURIComponent(rest.join('='))];
    })
  );
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (cookies.adminSession === SESSION_TOKEN) {
    return next();
  }
  return res.redirect('/admin/login');
}

function readJson(fileName) {
  try {
    const raw = fs.readFileSync(path.join(publicPath, fileName), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(publicPath, fileName), JSON.stringify(data, null, 2), 'utf8');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/chambres', (req, res) => {
  res.sendFile(path.join(publicPath, 'chambres.html'));
});

app.get('/restaurant', (req, res) => {
  res.sendFile(path.join(publicPath, 'restaurant.html'));
});

app.get('/bar', (req, res) => {
  res.sendFile(path.join(publicPath, 'bar.html'));
});

app.get('/admin/login', (req, res) => {
  const error = req.query.error === '1' ? 'Identifiants incorrects.' : '';
  const templatePath = path.join(publicPath, 'admin-login.html');
  fs.readFile(templatePath, 'utf8', (err, html) => {
    if (err) {
      return res.status(500).send('Erreur de chargement de la page de connexion.');
    }
    const rendered = html.replace('%ERROR%', error);
    res.send(rendered);
  });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', `adminSession=${SESSION_TOKEN}; HttpOnly; Path=/; Max-Age=86400`);
    return res.redirect('/admin');
  }
  return res.redirect('/admin/login?error=1');
});

app.post('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'adminSession=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/api/rooms', (req, res) => {
  res.json(readJson('rooms.json'));
});

app.post('/api/rooms', requireAdmin, (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Le nom et le prix sont obligatoires.' });
  }

  const rooms = readJson('rooms.json');
  const item = {
    id: Date.now().toString(),
    name,
    description: description || '',
    price: Number(price),
    image: image || '',
  };

  rooms.push(item);
  writeJson('rooms.json', rooms);
  res.status(201).json(item);
});

app.delete('/api/rooms/:id', requireAdmin, (req, res) => {
  const rooms = readJson('rooms.json');
  const next = rooms.filter((item) => item.id !== req.params.id);
  if (next.length === rooms.length) {
    return res.status(404).json({ error: 'Chambre introuvable.' });
  }
  writeJson('rooms.json', next);
  res.json({ success: true });
});

app.get('/api/restaurant', (req, res) => {
  res.json(readJson('restaurant.json'));
});

app.post('/api/restaurant', requireAdmin, (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Le nom et le prix sont obligatoires.' });
  }

  const items = readJson('restaurant.json');
  const item = {
    id: Date.now().toString(),
    name,
    description: description || '',
    price: Number(price),
    image: image || '',
  };

  items.push(item);
  writeJson('restaurant.json', items);
  res.status(201).json(item);
});

app.delete('/api/restaurant/:id', requireAdmin, (req, res) => {
  const items = readJson('restaurant.json');
  const next = items.filter((item) => item.id !== req.params.id);
  if (next.length === items.length) {
    return res.status(404).json({ error: 'Plat introuvable.' });
  }
  writeJson('restaurant.json', next);
  res.json({ success: true });
});

app.get('/api/bar', (req, res) => {
  res.json(readJson('bar.json'));
});

app.post('/api/bar', requireAdmin, (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Le nom et le prix sont obligatoires.' });
  }

  const items = readJson('bar.json');
  const item = {
    id: Date.now().toString(),
    name,
    description: description || '',
    price: Number(price),
    image: image || '',
  };

  items.push(item);
  writeJson('bar.json', items);
  res.status(201).json(item);
});

app.delete('/api/bar/:id', requireAdmin, (req, res) => {
  const items = readJson('bar.json');
  const next = items.filter((item) => item.id !== req.params.id);
  if (next.length === items.length) {
    return res.status(404).json({ error: 'Boisson introuvable.' });
  }
  writeJson('bar.json', next);
  res.json({ success: true });
});

app.get('/api/bookings', requireAdmin, (req, res) => {
  res.json(readJson('bookings.json'));
});

app.post('/api/bookings', (req, res) => {
  const { name, email, room, checkin, checkout } = req.body;
  if (!name || !email || !room || !checkin || !checkout) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const bookings = readJson('bookings.json');
  const booking = {
    id: Date.now().toString(),
    name,
    email,
    room,
    checkin,
    checkout,
    createdAt: new Date().toISOString(),
  };

  bookings.unshift(booking);
  writeJson('bookings.json', bookings);
  res.status(201).json(booking);
});

app.delete('/api/bookings/:id', requireAdmin, (req, res) => {
  const bookings = readJson('bookings.json');
  const next = bookings.filter((item) => item.id !== req.params.id);
  if (next.length === bookings.length) {
    return res.status(404).json({ error: 'Réservation introuvable.' });
  }
  writeJson('bookings.json', next);
  res.json({ success: true });
});

const port = process.env.PORT || 3000;
const os = require('os');

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

const localIP = getLocalIP();
app.listen(port, '0.0.0.0', () => {
  console.log(`Serveur démarré sur:`);
  console.log(`  Local: http://localhost:${port}`);
  console.log(`  Réseau: http://${localIP}:${port}`);
});
