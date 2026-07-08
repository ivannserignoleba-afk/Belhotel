const os = require('os');
const path = require('path');
const fs = require('fs');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'belhotel-api-'));
process.env.BELHOTEL_DATA_DIR = dataDir;

const request = require('supertest');
const { app } = require('../server');

const ADMIN_COOKIE = 'adminSession=authenticated';

function seed(fileName, data) {
  fs.writeFileSync(path.join(dataDir, fileName), JSON.stringify(data, null, 2), 'utf8');
}

function readFile(fileName) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8'));
}

beforeEach(() => {
  seed('rooms.json', []);
  seed('restaurant.json', []);
  seed('bar.json', []);
  seed('bookings.json', []);
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('authentication', () => {
  test('POST /admin/login with valid credentials sets the session cookie and redirects', async () => {
    const res = await request(app)
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: 'belhotel2026' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin');
    expect(res.headers['set-cookie'][0]).toContain('adminSession=authenticated');
  });

  test('POST /admin/login with invalid credentials redirects back with an error flag', async () => {
    const res = await request(app)
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: 'wrong' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login?error=1');
  });

  test('POST /admin/logout clears the session cookie', async () => {
    const res = await request(app).post('/admin/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
    expect(res.headers['set-cookie'][0]).toContain('adminSession=;');
  });
});

// Public and admin CRUD behave identically across the three catalog resources.
describe.each([
  ['rooms', '/api/rooms', 'Chambre introuvable.'],
  ['restaurant', '/api/restaurant', 'Plat introuvable.'],
  ['bar', '/api/bar', 'Boisson introuvable.'],
])('%s catalog API', (resource, endpoint, notFoundMessage) => {
  const fileName = `${resource}.json`;

  test(`GET ${endpoint} is public and returns the stored items`, async () => {
    seed(fileName, [{ id: '1', name: 'Existing', price: 100 }]);
    const res = await request(app).get(endpoint);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: '1', name: 'Existing', price: 100 }]);
  });

  test(`POST ${endpoint} requires authentication`, async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ name: 'Nouveau', price: 5000 });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  test(`POST ${endpoint} creates an item when authenticated`, async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Cookie', ADMIN_COOKIE)
      .send({ name: 'Nouveau', description: 'desc', price: '5000', image: 'img.jpg' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Nouveau',
      description: 'desc',
      price: 5000,
      image: 'img.jpg',
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(readFile(fileName)).toHaveLength(1);
  });

  test(`POST ${endpoint} defaults optional fields and coerces price to a number`, async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Cookie', ADMIN_COOKIE)
      .send({ name: 'Minimal', price: '250' });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('');
    expect(res.body.image).toBe('');
    expect(res.body.price).toBe(250);
  });

  test(`POST ${endpoint} rejects a missing name`, async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Cookie', ADMIN_COOKIE)
      .send({ price: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Le nom et le prix sont obligatoires.');
    expect(readFile(fileName)).toHaveLength(0);
  });

  test(`POST ${endpoint} rejects a missing price`, async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Cookie', ADMIN_COOKIE)
      .send({ name: 'Sans prix' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Le nom et le prix sont obligatoires.');
  });

  test(`DELETE ${endpoint}/:id requires authentication`, async () => {
    const res = await request(app).delete(`${endpoint}/1`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  test(`DELETE ${endpoint}/:id removes an existing item`, async () => {
    seed(fileName, [
      { id: 'keep', name: 'Keep', price: 1 },
      { id: 'remove', name: 'Remove', price: 2 },
    ]);

    const res = await request(app)
      .delete(`${endpoint}/remove`)
      .set('Cookie', ADMIN_COOKIE);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(readFile(fileName)).toEqual([{ id: 'keep', name: 'Keep', price: 1 }]);
  });

  test(`DELETE ${endpoint}/:id returns 404 for an unknown id`, async () => {
    const res = await request(app)
      .delete(`${endpoint}/does-not-exist`)
      .set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(notFoundMessage);
  });
});

describe('bookings API', () => {
  test('GET /api/bookings requires authentication', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  test('GET /api/bookings returns stored bookings when authenticated', async () => {
    seed('bookings.json', [{ id: '1', name: 'Client' }]);
    const res = await request(app).get('/api/bookings').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: '1', name: 'Client' }]);
  });

  test('POST /api/bookings is public and creates a booking', async () => {
    const res = await request(app).post('/api/bookings').send({
      name: 'Jean',
      email: 'jean@example.com',
      room: 'Suite Prestige',
      checkin: '2026-08-01',
      checkout: '2026-08-05',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Jean',
      email: 'jean@example.com',
      room: 'Suite Prestige',
      checkin: '2026-08-01',
      checkout: '2026-08-05',
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(readFile('bookings.json')).toHaveLength(1);
  });

  test('POST /api/bookings prepends the newest booking', async () => {
    seed('bookings.json', [{ id: 'old', name: 'Old' }]);
    await request(app).post('/api/bookings').send({
      name: 'New',
      email: 'new@example.com',
      room: 'Chambre',
      checkin: '2026-09-01',
      checkout: '2026-09-02',
    });

    const bookings = readFile('bookings.json');
    expect(bookings).toHaveLength(2);
    expect(bookings[0].name).toBe('New');
    expect(bookings[1].id).toBe('old');
  });

  test('POST /api/bookings rejects incomplete payloads', async () => {
    const res = await request(app).post('/api/bookings').send({ name: 'Jean' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Tous les champs sont obligatoires.');
    expect(readFile('bookings.json')).toHaveLength(0);
  });

  test('DELETE /api/bookings/:id requires authentication', async () => {
    const res = await request(app).delete('/api/bookings/1');
    expect(res.status).toBe(302);
  });

  test('DELETE /api/bookings/:id removes a booking when authenticated', async () => {
    seed('bookings.json', [{ id: 'x', name: 'X' }]);
    const res = await request(app)
      .delete('/api/bookings/x')
      .set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(readFile('bookings.json')).toEqual([]);
  });

  test('DELETE /api/bookings/:id returns 404 for an unknown id', async () => {
    const res = await request(app)
      .delete('/api/bookings/nope')
      .set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Réservation introuvable.');
  });
});

describe.each([
  ['/', 'index.html'],
  ['/chambres', 'chambres.html'],
  ['/restaurant', 'restaurant.html'],
  ['/bar', 'bar.html'],
])('GET %s', (route) => {
  test('serves an HTML page', async () => {
    const res = await request(app).get(route);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });
});

describe('page routes', () => {
  test('GET /admin serves the admin page with a valid session', async () => {
    const res = await request(app).get('/admin').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  test('GET /admin redirects to login without a session', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  test('GET /admin/login renders the login page', async () => {
    const res = await request(app).get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('%ERROR%');
  });

  test('GET /admin/login?error=1 shows the error message', async () => {
    const res = await request(app).get('/admin/login').query({ error: '1' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('Identifiants incorrects.');
  });
});
