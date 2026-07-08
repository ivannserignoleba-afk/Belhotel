const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const publicPath = __dirname;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = crypto.randomBytes(18).toString('base64url');
  console.warn(
    '[security] ADMIN_PASSWORD is not set. Generated a temporary password for this run only:\n' +
      `           ${ADMIN_PASSWORD}\n` +
      '           Set ADMIN_USERNAME / ADMIN_PASSWORD environment variables for a stable, secure login.'
  );
}

const SESSION_COOKIE = 'adminSession';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

// In-memory store of valid, unguessable session tokens -> expiry timestamp.
const sessions = new Map();

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function buildSessionCookie(token, maxAgeSeconds) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
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
  if (isValidSession(cookies[SESSION_COOKIE])) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentification requise.' });
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

// Validates the shared "catalog item" payload (rooms, restaurant dishes, bar drinks).
function parseCatalogItem(body) {
  const name = cleanString(body.name, 120);
  if (!name) return { error: 'Le nom est obligatoire (max 120 caractères).' };

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || price > 1e9) {
    return { error: 'Le prix doit être un nombre positif valide.' };
  }

  let description = '';
  if (body.description !== undefined && body.description !== null && body.description !== '') {
    const cleaned = cleanString(body.description, 2000);
    if (!cleaned) return { error: 'La description est invalide (max 2000 caractères).' };
    description = cleaned;
  }

  let image = '';
  if (body.image !== undefined && body.image !== null && body.image !== '') {
    const cleaned = cleanString(body.image, 2000);
    if (!cleaned || !/^https?:\/\//i.test(cleaned)) {
      return { error: 'L\'image doit être une URL http(s) valide.' };
    }
    image = cleaned;
  }

  return {
    item: {
      id: Date.now().toString(),
      name,
      description,
      price,
      image,
    },
  };
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
  const { username, password } = req.body || {};
  const usernameOk = timingSafeEqual(username, ADMIN_USERNAME);
  const passwordOk = timingSafeEqual(password, ADMIN_PASSWORD);
  if (usernameOk && passwordOk) {
    const token = createSession();
    res.setHeader('Set-Cookie', buildSessionCookie(token, 86400));
    return res.redirect('/admin');
  }
  return res.redirect('/admin/login?error=1');
});

app.post('/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  sessions.delete(cookies[SESSION_COOKIE]);
  res.setHeader('Set-Cookie', buildSessionCookie('', 0));
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/api/rooms', (req, res) => {
  res.json(readJson('rooms.json'));
});

app.post('/api/rooms', requireAdmin, (req, res) => {
  const { error, item } = parseCatalogItem(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  const rooms = readJson('rooms.json');
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
  const { error, item } = parseCatalogItem(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  const items = readJson('restaurant.json');
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
  const { error, item } = parseCatalogItem(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  const items = readJson('bar.json');
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
  const body = req.body || {};
  const name = cleanString(body.name, 120);
  const email = cleanString(body.email, 254);
  const room = cleanString(body.room, 120);
  const checkin = cleanString(body.checkin, 40);
  const checkout = cleanString(body.checkout, 40);

  if (!name || !email || !room || !checkin || !checkout) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
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
