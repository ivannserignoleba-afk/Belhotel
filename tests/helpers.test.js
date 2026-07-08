const os = require('os');
const path = require('path');
const fs = require('fs');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'belhotel-helpers-'));
process.env.BELHOTEL_DATA_DIR = dataDir;

const {
  parseCookies,
  requireAdmin,
  readJson,
  writeJson,
  getLocalIP,
  start,
} = require('../server');

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('parseCookies', () => {
  test('returns an empty object when no cookie header is present', () => {
    expect(parseCookies({ headers: {} })).toEqual({});
  });

  test('parses a single cookie', () => {
    expect(parseCookies({ headers: { cookie: 'adminSession=authenticated' } })).toEqual({
      adminSession: 'authenticated',
    });
  });

  test('parses multiple cookies separated by semicolons', () => {
    const req = { headers: { cookie: 'a=1; b=2; c=3' } };
    expect(parseCookies(req)).toEqual({ a: '1', b: '2', c: '3' });
  });

  test('URL-decodes keys and values', () => {
    const req = { headers: { cookie: 'na%20me=jean%20dupont' } };
    expect(parseCookies(req)).toEqual({ 'na me': 'jean dupont' });
  });

  test('preserves "=" characters inside a value', () => {
    const req = { headers: { cookie: 'token=abc=def=ghi' } };
    expect(parseCookies(req)).toEqual({ token: 'abc=def=ghi' });
  });

  test('ignores empty segments produced by trailing separators', () => {
    const req = { headers: { cookie: 'a=1;;' } };
    expect(parseCookies(req)).toEqual({ a: '1' });
  });
});

describe('requireAdmin', () => {
  test('calls next() when the admin session cookie is authenticated', () => {
    const req = { headers: { cookie: 'adminSession=authenticated' } };
    const next = jest.fn();
    const res = { redirect: jest.fn() };

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('redirects to the login page when there is no session', () => {
    const req = { headers: {} };
    const next = jest.fn();
    const res = { redirect: jest.fn() };

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/admin/login');
  });

  test('redirects when the session cookie has an unexpected value', () => {
    const req = { headers: { cookie: 'adminSession=nope' } };
    const next = jest.fn();
    const res = { redirect: jest.fn() };

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/admin/login');
  });
});

describe('readJson / writeJson', () => {
  test('writeJson persists data that readJson can read back', () => {
    const payload = [{ id: '1', name: 'Suite' }];
    writeJson('sample.json', payload);
    expect(readJson('sample.json')).toEqual(payload);
  });

  test('writeJson formats the file with two-space indentation', () => {
    writeJson('formatted.json', [{ a: 1 }]);
    const raw = fs.readFileSync(path.join(dataDir, 'formatted.json'), 'utf8');
    expect(raw).toBe(JSON.stringify([{ a: 1 }], null, 2));
  });

  test('readJson returns an empty array when the file does not exist', () => {
    expect(readJson('missing.json')).toEqual([]);
  });

  test('readJson returns an empty array when the file contains invalid JSON', () => {
    fs.writeFileSync(path.join(dataDir, 'broken.json'), '{not valid', 'utf8');
    expect(readJson('broken.json')).toEqual([]);
  });
});

describe('getLocalIP', () => {
  test('returns a string', () => {
    expect(typeof getLocalIP()).toBe('string');
  });

  test('returns the first external IPv4 address when one exists', () => {
    const spy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
      lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
      eth0: [{ family: 'IPv4', internal: false, address: '192.168.1.42' }],
    });

    expect(getLocalIP()).toBe('192.168.1.42');
    spy.mockRestore();
  });

  test('falls back to "localhost" when only internal interfaces exist', () => {
    const spy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
      lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    });

    expect(getLocalIP()).toBe('localhost');
    spy.mockRestore();
  });
});

describe('start', () => {
  test('starts an HTTP server that listens and can be closed', (done) => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const server = start();
    server.on('listening', () => {
      expect(server.listening).toBe(true);
      server.close(() => {
        logSpy.mockRestore();
        done();
      });
    });
  });
});
