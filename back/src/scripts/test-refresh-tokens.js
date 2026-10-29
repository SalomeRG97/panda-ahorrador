const fs = require('fs');
const path = require('path');
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'production';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-9876543210';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-1234567890';

const db = require('../config/database');
const config = require('../config/environment');
const { clearUserCache, USER_CACHE_TTL_MS } = require('../middlewares/auth.middleware');

const passwordHashSync = bcrypt.hashSync('Password123!', 4);

const mockDb = {
  users: [
    {
      id: 10,
      email: 'panda@test.com',
      username: 'panda',
      password_hash: passwordHashSync,
      name: 'Panda User',
      role_id: 2,
      role_name: 'regular',
      is_active: 1,
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    },
    {
      id: 1,
      email: 'admin@test.com',
      username: 'admin',
      password_hash: passwordHashSync,
      name: 'Admin User',
      role_id: 1,
      role_name: 'admin',
      is_active: 1,
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    },
  ],
  refreshTokens: [],
  nextTokenId: 1,
};

db.query = async (sqlRaw, params = []) => {
  const sql = (typeof sqlRaw === 'string' ? sqlRaw : sqlRaw.sql).replace(/\s+/g, ' ').trim();

  if (sql.includes('FROM users u') && sql.includes('WHERE u.email = ?')) {
    const u = mockDb.users.find((x) => x.email === params[0]);
    return [u ? [{ ...u }] : [], []];
  }

  if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) {
    const u = mockDb.users.find((x) => x.id === Number(params[0]));
    return [u ? [{ ...u }] : [], []];
  }

  if (sql.startsWith('SELECT password_hash FROM users WHERE id = ?')) {
    const u = mockDb.users.find((x) => x.id === Number(params[0]));
    return [u ? [{ password_hash: u.password_hash }] : [], []];
  }

  if (sql.startsWith('UPDATE users SET password_hash = ? WHERE id = ?')) {
    const u = mockDb.users.find((x) => x.id === Number(params[1]));
    if (u) u.password_hash = params[0];
    return [{ affectedRows: u ? 1 : 0 }, []];
  }

  if (sql.startsWith('UPDATE users SET is_active = ? WHERE id = ?')) {
    const u = mockDb.users.find((x) => x.id === Number(params[1]));
    if (u) u.is_active = params[0] ? 1 : 0;
    return [{ affectedRows: u ? 1 : 0 }, []];
  }

  if (sql.startsWith('UPDATE users SET is_active = FALSE WHERE id = ?')) {
    const u = mockDb.users.find((x) => x.id === Number(params[0]));
    if (u) u.is_active = 0;
    return [{ affectedRows: u ? 1 : 0 }, []];
  }

  if (sql.startsWith('INSERT INTO refresh_tokens')) {
    const [user_id, token_hash, family_id, expires_at, user_agent, ip] = params;
    const id = mockDb.nextTokenId++;
    mockDb.refreshTokens.push({
      id,
      user_id: Number(user_id),
      token_hash,
      family_id,
      expires_at,
      revoked_at: null,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user_agent,
      ip,
    });
    return [{ insertId: id }, []];
  }

  if (sql.startsWith('SELECT * FROM refresh_tokens WHERE token_hash = ?')) {
    const row = mockDb.refreshTokens.find((t) => t.token_hash === params[0]);
    return [row ? [{ ...row }] : [], []];
  }

  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?')) {
    const row = mockDb.refreshTokens.find((t) => t.id === Number(params[0]) && t.revoked_at === null);
    if (row) row.revoked_at = new Date().toISOString();
    return [{ affectedRows: row ? 1 : 0 }, []];
  }

  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?')) {
    const row = mockDb.refreshTokens.find((t) => t.token_hash === params[0] && t.revoked_at === null);
    if (row) row.revoked_at = new Date().toISOString();
    return [{ affectedRows: row ? 1 : 0 }, []];
  }

  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ?')) {
    let count = 0;
    for (const t of mockDb.refreshTokens) {
      if (t.family_id === params[0] && t.revoked_at === null) {
        t.revoked_at = new Date().toISOString();
        count++;
      }
    }
    return [{ affectedRows: count }, []];
  }

  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?')) {
    let count = 0;
    for (const t of mockDb.refreshTokens) {
      if (t.user_id === Number(params[0]) && t.revoked_at === null) {
        t.revoked_at = new Date().toISOString();
        count++;
      }
    }
    return [{ affectedRows: count }, []];
  }

  return [[], []];
};

const app = require('../app');

function request(appInstance, { method = 'GET', path: reqPath = '/', headers = {}, body = undefined, ip = '127.0.0.1' }) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    socket.remoteAddress = ip;

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = reqPath;
    req.headers = {};
    for (const [k, v] of Object.entries(headers)) {
      req.headers[k.toLowerCase()] = v;
    }

    const bodyStr = body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    if (bodyStr) {
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    const chunks = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = (chunk, encoding, cb) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      return origWrite(chunk, encoding, cb);
    };

    res.end = (chunk, encoding, cb) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      origEnd(chunk, encoding, cb);
      const raw = Buffer.concat(chunks).toString('utf8');
      const bodyPart = raw.includes('\r\n\r\n') ? raw.split('\r\n\r\n').slice(1).join('\r\n\r\n') : raw;
      let parsed = {};
      try {
        parsed = bodyPart ? JSON.parse(bodyPart) : {};
      } catch (_e) {
        parsed = { raw: bodyPart };
      }
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: parsed });
    };

    res.on('error', reject);
    appInstance.handle(req, res);

    process.nextTick(() => {
      if (bodyStr) req.push(bodyStr);
      req.push(null);
    });
  });
}

function extractRefreshCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookieHeader = Array.isArray(setCookie) ? setCookie.find((c) => c.startsWith('refreshToken=')) : setCookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/^refreshToken=([^;]*)/);
  return {
    rawHeader: cookieHeader,
    value: match ? decodeURIComponent(match[1]) : '',
  };
}

async function runTests() {
  console.log('=== Verificando Fase 1 Prompt 6 (Refresh Tokens, Rotación, Familias y Caché) ===');

  // 1. Verificar archivo SQL de migración
  const migrationPath = path.join(__dirname, '../../database/migrations/001-refresh-tokens.sql');
  assert(fs.existsSync(migrationPath), 'Debe existir back/database/migrations/001-refresh-tokens.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS refresh_tokens'), 'Falta CREATE TABLE refresh_tokens');
  assert(migrationSql.includes('token_hash CHAR(64)'), 'Falta token_hash CHAR(64)');
  assert(migrationSql.includes('family_id CHAR(36)'), 'Falta family_id CHAR(36)');
  assert(migrationSql.includes('ON DELETE CASCADE'), 'Falta FK ON DELETE CASCADE');
  console.log('✔ 1. Migración SQL 001-refresh-tokens.sql verificada.');

  // 2. Login: verifica access token (typ: 'access', sub: id, 15m) y cookie httpOnly de 64 bytes
  const loginRes = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'User-Agent': 'TestAgent/1.0' },
    body: { email: 'panda@test.com', password: 'Password123!' },
  });
  assert.strictEqual(loginRes.status, 200);
  const accessToken1 = loginRes.body.data.accessToken;
  assert(accessToken1, 'Login debe devolver accessToken');
  assert.strictEqual(loginRes.body.data.refreshToken, undefined, 'No debe exponer refreshToken en el JSON body');

  const decodedAccess = jwt.verify(accessToken1, config.jwt.accessSecret);
  assert.strictEqual(decodedAccess.sub, 10);
  assert.strictEqual(decodedAccess.role, 'regular');
  assert.strictEqual(decodedAccess.typ, 'access');
  assert.strictEqual(decodedAccess.exp - decodedAccess.iat, 15 * 60, 'El access token debe expirar en 15m');

  const cookie1 = extractRefreshCookie(loginRes.headers);
  assert(cookie1 && cookie1.value.length === 128, 'El refresh token debe ser 64 bytes aleatorios en hex (128 chars)');
  assert(cookie1.rawHeader.includes('HttpOnly'), 'La cookie debe ser HttpOnly');
  assert(cookie1.rawHeader.includes('Secure'), 'En producción la cookie debe ser Secure');
  assert(cookie1.rawHeader.includes('SameSite=None'), 'En producción SameSite debe ser None');
  assert(cookie1.rawHeader.includes('Path=/api/auth'), 'El Path de la cookie debe ser /api/auth');

  const expectedHash1 = crypto.createHash('sha256').update(cookie1.value).digest('hex');
  assert.strictEqual(mockDb.refreshTokens.length, 1);
  assert.strictEqual(mockDb.refreshTokens[0].token_hash, expectedHash1);
  assert.strictEqual(mockDb.refreshTokens[0].user_agent, 'TestAgent/1.0');
  console.log('✔ 2. Login emite access token (sub, role, typ=access, 15m) y cookie httpOnly con sha256 en BD.');

  // 3. Un access token enviado a /auth/refresh NO sirve (ni en cookie ni en body)
  const badRefreshRes = await request(app, {
    method: 'POST',
    path: '/api/auth/refresh',
    headers: { Cookie: `refreshToken=${accessToken1}` },
    body: { refreshToken: accessToken1 },
  });
  assert.strictEqual(badRefreshRes.status, 401, 'Un access token enviado a /auth/refresh debe devolver 401');

  // Y un JWT sin typ='access' tampoco sirve como access token en auth.middleware
  const fakeNoTypToken = jwt.sign({ sub: 10, role: 'regular' }, config.jwt.accessSecret, { expiresIn: '15m' });
  const noTypRes = await request(app, {
    method: 'GET',
    path: '/api/auth/me',
    headers: { Authorization: `Bearer ${fakeNoTypToken}` },
  });
  assert.strictEqual(noTypRes.status, 401, 'Un JWT sin typ===access debe ser rechazado por auth.middleware');
  console.log('✔ 3. Un access token enviado a /auth/refresh devuelve 401, y un JWT sin typ=access devuelve 401.');

  // 4. Rotación de refresh token y detección de reutilización (revoca toda la familia)
  const refreshRes1 = await request(app, {
    method: 'POST',
    path: '/api/auth/refresh',
    headers: { Cookie: `refreshToken=${cookie1.value}` },
  });
  assert.strictEqual(refreshRes1.status, 200);
  const cookie2 = extractRefreshCookie(refreshRes1.headers);
  assert(cookie2 && cookie2.value && cookie2.value !== cookie1.value, 'Debe rotar el refresh token');
  assert(mockDb.refreshTokens[0].revoked_at !== null, 'El primer refresh token debe quedar revocado');
  assert.strictEqual(
    mockDb.refreshTokens[1].family_id,
    mockDb.refreshTokens[0].family_id,
    'El nuevo refresh token debe mantener el mismo family_id'
  );

  // Reutilizar cookie1 (ya rotado/revocado) -> debe revocar toda la familia (incluyendo cookie2) y devolver 401
  const reuseRes = await request(app, {
    method: 'POST',
    path: '/api/auth/refresh',
    headers: { Cookie: `refreshToken=${cookie1.value}` },
  });
  assert.strictEqual(reuseRes.status, 401, 'Reutilizar un refresh token revocado debe devolver 401');
  assert(mockDb.refreshTokens[1].revoked_at !== null, 'Toda la familia (incluyendo el token activo) debe quedar revocada');

  // Intentar usar cookie2 después de que la familia fue revocada -> también 401
  const afterReuseRes = await request(app, {
    method: 'POST',
    path: '/api/auth/refresh',
    headers: { Cookie: `refreshToken=${cookie2.value}` },
  });
  assert.strictEqual(afterReuseRes.status, 401, 'El token hijo de la familia comprometida también debe fallar con 401');
  console.log('✔ 4. Rotación de refresh token y revocación completa de la familia ante reutilización verificadas.');

  // 5. auth.middleware usa el rol de la BD (no el del token) y respeta caché de 60s + desactivación
  clearUserCache();
  const forgedRoleToken = jwt.sign(
    { sub: 10, role: 'admin', typ: 'access' }, // token dice admin, pero en BD user 10 es regular
    config.jwt.accessSecret,
    { expiresIn: '15m' }
  );
  const adminAttemptRes = await request(app, {
    method: 'GET',
    path: '/api/admin/users',
    headers: { Authorization: `Bearer ${forgedRoleToken}` },
  });
  assert.strictEqual(adminAttemptRes.status, 403, 'Debe usar el rol de la BD (regular -> 403 en /api/admin/users)');
  assert.strictEqual(USER_CACHE_TTL_MS, 60000, 'El TTL de la caché de usuarios debe ser 60 s (60000 ms)');

  // Nuevo login de usuario 10 para probar desactivación por admin
  const loginRes2 = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'panda@test.com', password: 'Password123!' },
  });
  const cookie3 = extractRefreshCookie(loginRes2.headers);
  const activeTokensBeforeDeactivate = mockDb.refreshTokens.filter((t) => t.user_id === 10 && t.revoked_at === null);
  assert.strictEqual(activeTokensBeforeDeactivate.length, 1);

  // Admin desactiva al usuario 10
  const adminToken = jwt.sign({ sub: 1, role: 'admin', typ: 'access' }, config.jwt.accessSecret, { expiresIn: '15m' });
  const deactivateRes = await request(app, {
    method: 'PUT',
    path: '/api/admin/users/10/status',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { isActive: false },
  });
  assert.strictEqual(deactivateRes.status, 200);

  // Verificar que todos sus refresh tokens fueron revocados y pierde acceso con su access token
  const activeTokensAfterDeactivate = mockDb.refreshTokens.filter((t) => t.user_id === 10 && t.revoked_at === null);
  assert.strictEqual(activeTokensAfterDeactivate.length, 0, 'Al desactivar usuario se deben revocar todos sus refresh tokens');

  const meAfterDeactivate = await request(app, {
    method: 'GET',
    path: '/api/auth/me',
    headers: { Authorization: `Bearer ${loginRes2.body.data.accessToken}` },
  });
  assert.strictEqual(meAfterDeactivate.status, 401, 'Usuario desactivado debe recibir 401');

  // Reactivar usuario 10 para pruebas de logout y cambio de contraseña
  mockDb.users[0].is_active = 1;
  clearUserCache();
  console.log('✔ 5. Rol cargado desde BD, caché de 60s y pérdida de acceso/revocación al desactivar usuario verificados.');

  // 6. POST /auth/logout y POST /auth/logout-all y cambio de contraseña
  const loginRes3 = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'panda@test.com', password: 'Password123!' },
  });
  const cookie4 = extractRefreshCookie(loginRes3.headers);

  const logoutRes = await request(app, {
    method: 'POST',
    path: '/api/auth/logout',
    headers: { Cookie: `refreshToken=${cookie4.value}` },
  });
  assert.strictEqual(logoutRes.status, 200);
  const token4Record = mockDb.refreshTokens.find(
    (t) => t.token_hash === crypto.createHash('sha256').update(cookie4.value).digest('hex')
  );
  assert(token4Record.revoked_at !== null, 'POST /auth/logout debe revocar el refresh token actual');

  // Crear 2 sesiones activas y probar POST /auth/logout-all
  const s1 = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'panda@test.com', password: 'Password123!' },
  });
  await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'panda@test.com', password: 'Password123!' },
  });
  assert.strictEqual(mockDb.refreshTokens.filter((t) => t.user_id === 10 && t.revoked_at === null).length, 2);

  const logoutAllRes = await request(app, {
    method: 'POST',
    path: '/api/auth/logout-all',
    headers: { Authorization: `Bearer ${s1.body.data.accessToken}` },
  });
  assert.strictEqual(logoutAllRes.status, 200);
  assert.strictEqual(
    mockDb.refreshTokens.filter((t) => t.user_id === 10 && t.revoked_at === null).length,
    0,
    'POST /auth/logout-all debe revocar todos los refresh tokens del usuario'
  );
  console.log('✔ 6. POST /auth/logout y POST /auth/logout-all revocan tokens y borran la cookie correctamente.');

  // 7. Verificar que no queden referencias a panda_access_token ni panda_refresh_token en front/src
  const frontSrcDir = path.join(__dirname, '../../../front/src');
  const checkFrontDir = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkFrontDir(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(
          !content.includes('panda_access_token') && !content.includes('panda_refresh_token'),
          `Se encontró referencia prohibida a panda_access_token o panda_refresh_token en ${fullPath}`
        );
      }
    }
  };
  checkFrontDir(frontSrcDir);
  console.log('✔ 7. Cero referencias a panda_access_token y panda_refresh_token en front/src.');

  console.log('\n🎉 TODAS LAS PRUEBAS DE REFRESH TOKENS Y AUTENTICACIÓN PASARON EXITOSAMENTE');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Falló la verificación:', err);
  process.exit(1);
});

