/**
 * Pruebas de integración para Fase 1 Prompt 7:
 * 1. Categorías: bloqueo edición global a no-admin (403), ajena (404), validación name/color/icon y duplicados (409).
 * 2. Gastos: verificación de pertenencia/globalidad de category_id y payment_method (400 si ajeno/inválido).
 * 3. adminCreateUser: sin 'Temporal123!', contraseña aleatoria de 16 chars segura devuelta una sola vez, must_change_password = TRUE.
 * 4. must_change_password = TRUE: flag en login, bloqueo 403 (code PASSWORD_CHANGE_REQUIRED) en demás endpoints hasta cambiar contraseña.
 * 5. adminUpdateUser: whitelist explícita, bloqueo auto-degradación/auto-desactivación y último admin activo.
 * 6. Normalización y validación de email (trim + lower + regex) y username (trim, 3-30, [a-zA-Z0-9_.]).
 */

process.env.NODE_ENV = 'development';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test_db';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-prompt7';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-prompt7';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = require('../config/database');
const config = require('../config/environment');
const { clearUserCache } = require('../middlewares/auth.middleware');

const hashSync = (pwd) => bcrypt.hashSync(pwd, 4);

const state = {
  roles: [
    { id: 1, name: 'admin' },
    { id: 2, name: 'regular' },
    { id: 3, name: 'viewer' },
  ],
  users: [
    {
      id: 1,
      email: 'admin@test.com',
      username: 'admin_main',
      password_hash: hashSync('AdminPass123!'),
      name: 'Main Admin',
      role_id: 1,
      role_name: 'admin',
      is_active: 1,
      must_change_password: 0,
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    },
    {
      id: 2,
      email: 'usera@test.com',
      username: 'user_a',
      password_hash: hashSync('UserAPass123!'),
      name: 'User A',
      role_id: 2,
      role_name: 'regular',
      is_active: 1,
      must_change_password: 0,
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    },
    {
      id: 3,
      email: 'userb@test.com',
      username: 'user_b',
      password_hash: hashSync('UserBPass123!'),
      name: 'User B',
      role_id: 2,
      role_name: 'regular',
      is_active: 1,
      must_change_password: 0,
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    },
  ],
  categories: [
    { id: 1, name: 'Hogar', color: '#F4A6C1', icon: 'fa-house', user_id: null },
    { id: 2, name: 'Transporte', color: '#A8D8EA', icon: 'fa-car', user_id: null },
    { id: 101, name: 'Cat A1', color: '#112233', icon: 'fa-star', user_id: 2 },
    { id: 102, name: 'Cat A2', color: '#445566', icon: 'fa-book', user_id: 2 },
    { id: 201, name: 'Cat B1', color: '#778899', icon: 'fa-gamepad', user_id: 3 },
  ],
  payment_methods: [
    { id: 10, user_id: 2, name: 'Nequi A' },
    { id: 20, user_id: 3, name: 'Tarjeta B' },
  ],
  years: [
    { id: 10, year: 2026, start_month: 1, end_month: 12, user_id: 2 },
    { id: 20, year: 2026, start_month: 1, end_month: 12, user_id: 3 },
  ],
  months: [
    { id: 100, year_id: 10, month_number: 1, month_name: 'Enero' },
    { id: 200, year_id: 20, month_number: 1, month_name: 'Enero' },
  ],
  weeks: [
    { id: 1000, month_id: 100, week_number: 1, start_date: '2026-01-01', end_date: '2026-01-07' },
    { id: 2000, month_id: 200, week_number: 1, start_date: '2026-01-01', end_date: '2026-01-07' },
  ],
  budget_expenses: [
    {
      id: 500,
      month_id: 100,
      week_id: 1000,
      category_id: 1,
      date: '2026-01-03',
      concept: 'Mercado A',
      budget_amount: 200,
      real_amount: 0,
      payment_method: 'Nequi A',
      recurrence_id: null,
    },
  ],
  extra_expenses: [
    {
      id: 600,
      month_id: 100,
      week_id: 1000,
      category_id: 1,
      date: '2026-01-04',
      concept: 'Helado A',
      amount: 20,
      payment_method: 'Nequi A',
    },
  ],
  refresh_tokens: [],
  nextId: 5000,
};

db.query = async (sqlRaw, params = []) => {
  const sql = (typeof sqlRaw === 'string' ? sqlRaw : sqlRaw.sql).replace(/\s+/g, ' ').trim();

  if (sql.startsWith('CREATE TABLE') || sql.startsWith('ALTER TABLE')) {
    return [{ affectedRows: 0 }, []];
  }
  if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
    return [[{ c: 1 }], []];
  }

  // ROLES
  if (sql === 'SELECT * FROM roles WHERE name = ?') {
    const r = state.roles.find((x) => x.name === params[0]);
    return [r ? [{ ...r }] : [], []];
  }

  // USERS
  if (sql.includes('FROM users u') && sql.includes('WHERE u.email = ?')) {
    const u = state.users.find((x) => x.email === params[0]);
    return [u ? [{ ...u }] : [], []];
  }
  if (sql.includes('FROM users u') && sql.includes('WHERE u.username = ?')) {
    const u = state.users.find((x) => x.username === params[0]);
    return [u ? [{ ...u }] : [], []];
  }
  if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) {
    const u = state.users.find((x) => x.id === Number(params[0]));
    return [u ? [{ ...u }] : [], []];
  }
  if (sql.includes('COUNT(*) AS count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = \'admin\' AND u.is_active = TRUE')) {
    const excludeId = params[0] !== undefined ? Number(params[0]) : null;
    const count = state.users.filter(
      (u) => u.role_name === 'admin' && Boolean(u.is_active) && (excludeId === null || u.id !== excludeId)
    ).length;
    return [[{ count }], []];
  }
  if (sql.startsWith('INSERT INTO users')) {
    const [email, username, password_hash, name, role_id, must_change_password] = params;
    const role = state.roles.find((r) => r.id === Number(role_id));
    const id = ++state.nextId;
    state.users.push({
      id,
      email,
      username,
      password_hash,
      name,
      role_id: Number(role_id),
      role_name: role ? role.name : 'regular',
      is_active: 1,
      must_change_password: must_change_password ? 1 : 0,
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('SELECT password_hash FROM users WHERE id = ?')) {
    const u = state.users.find((x) => x.id === Number(params[0]));
    return [u ? [{ password_hash: u.password_hash }] : [], []];
  }
  if (sql.startsWith('UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?')) {
    const u = state.users.find((x) => x.id === Number(params[1]));
    if (u) {
      u.password_hash = params[0];
      u.must_change_password = 0;
    }
    return [{ affectedRows: u ? 1 : 0 }, []];
  }
  if (sql.startsWith('UPDATE users SET is_active = FALSE WHERE id = ?')) {
    const u = state.users.find((x) => x.id === Number(params[0]));
    if (u) u.is_active = 0;
    return [{ affectedRows: u ? 1 : 0 }, []];
  }
  if (sql.startsWith('UPDATE users SET ')) {
    const id = Number(params[params.length - 1]);
    const u = state.users.find((x) => x.id === id);
    if (u) {
      const setClause = sql.slice('UPDATE users SET '.length, sql.indexOf(' WHERE id = ?'));
      const parts = setClause.split(',').map((s) => s.trim().split(' = ')[0]);
      parts.forEach((col, idx) => {
        const val = params[idx];
        if (col === 'role_id') {
          u.role_id = Number(val);
          const role = state.roles.find((r) => r.id === Number(val));
          if (role) u.role_name = role.name;
        } else if (col === 'is_active') {
          u.is_active = val ? 1 : 0;
        } else {
          u[col] = val;
        }
      });
    }
    return [{ affectedRows: u ? 1 : 0 }, []];
  }

  // REFRESH TOKENS
  if (sql.startsWith('INSERT INTO refresh_tokens')) {
    const [user_id, token_hash, family_id, expires_at, user_agent, ip] = params;
    const id = ++state.nextId;
    state.refresh_tokens.push({ id, user_id: Number(user_id), token_hash, family_id, expires_at, revoked_at: null, user_agent, ip });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW()')) {
    return [{ affectedRows: 1 }, []];
  }

  // CATEGORIES
  if (sql.includes('FROM categories WHERE user_id IS NULL OR user_id = ?')) {
    const uid = Number(params[0]);
    const rows = state.categories
      .filter((c) => c.user_id === null || c.user_id === uid)
      .map((c) => ({ ...c, isGlobal: c.user_id === null ? 1 : 0 }));
    return [rows, []];
  }
  if (sql.includes('FROM categories WHERE id = ?')) {
    const c = state.categories.find((x) => x.id === Number(params[0]));
    return [c ? [{ ...c, isGlobal: c.user_id === null ? 1 : 0 }] : [], []];
  }
  if (sql.includes('FROM categories WHERE user_id = ? AND name = ?')) {
    const c = state.categories.find(
      (x) => x.user_id === Number(params[0]) && x.name.toLowerCase() === String(params[1]).toLowerCase()
    );
    return [c ? [{ ...c }] : [], []];
  }
  if (sql.includes('FROM categories WHERE user_id IS NULL AND name = ?')) {
    const c = state.categories.find(
      (x) => x.user_id === null && x.name.toLowerCase() === String(params[0]).toLowerCase()
    );
    return [c ? [{ ...c }] : [], []];
  }
  if (sql.startsWith('INSERT INTO categories')) {
    const [name, color, icon, user_id] = params;
    const id = ++state.nextId;
    state.categories.push({ id, name, color, icon, user_id: user_id != null ? Number(user_id) : null });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE categories SET ')) {
    const id = Number(params[params.length - 1]);
    const c = state.categories.find((x) => x.id === id);
    if (c) {
      const setClause = sql.slice('UPDATE categories SET '.length, sql.indexOf(' WHERE id = ?'));
      const cols = setClause.split(',').map((s) => s.trim().split(' = ')[0]);
      cols.forEach((col, i) => {
        c[col] = params[i];
      });
    }
    return [{ affectedRows: c ? 1 : 0 }, []];
  }

  // PAYMENT METHODS
  if (sql.includes('FROM payment_methods WHERE user_id = ? AND name = ?')) {
    const pm = state.payment_methods.find(
      (x) => x.user_id === Number(params[0]) && x.name.toLowerCase() === String(params[1]).toLowerCase()
    );
    return [pm ? [{ ...pm }] : [], []];
  }
  if (sql.includes('FROM payment_methods WHERE id = ?')) {
    const pm = state.payment_methods.find((x) => x.id === Number(params[0]));
    return [pm ? [{ ...pm }] : [], []];
  }

  // OWNERSHIP & EXPENSES
  if (sql.includes('FROM months m JOIN years y ON m.year_id = y.id WHERE m.id = ?')) {
    const m = state.months.find((r) => r.id === Number(params[0]));
    const y = m ? state.years.find((r) => r.id === m.year_id) : null;
    return [y ? [{ user_id: y.user_id }] : [], []];
  }
  if (sql.includes('FROM budget_expenses be JOIN months m ON be.month_id = m.id JOIN years y ON m.year_id = y.id WHERE be.id = ?')) {
    const be = state.budget_expenses.find((r) => r.id === Number(params[0]));
    const m = be ? state.months.find((r) => r.id === be.month_id) : null;
    const y = m ? state.years.find((r) => r.id === m.year_id) : null;
    return [y ? [{ user_id: y.user_id }] : [], []];
  }
  if (sql.includes('FROM extra_expenses ee JOIN months m ON ee.month_id = m.id JOIN years y ON m.year_id = y.id WHERE ee.id = ?')) {
    const ee = state.extra_expenses.find((r) => r.id === Number(params[0]));
    const m = ee ? state.months.find((r) => r.id === ee.month_id) : null;
    const y = m ? state.years.find((r) => r.id === m.year_id) : null;
    return [y ? [{ user_id: y.user_id }] : [], []];
  }
  if (sql.includes('FROM budget_expenses be') && sql.includes('WHERE be.id = ?')) {
    const be = state.budget_expenses.find((r) => r.id === Number(params[0]));
    return [be ? [{ ...be }] : [], []];
  }
  if (sql === 'SELECT * FROM extra_expenses WHERE id = ?') {
    const ee = state.extra_expenses.find((r) => r.id === Number(params[0]));
    return [ee ? [{ ...ee }] : [], []];
  }
  if (sql === 'SELECT * FROM weeks WHERE month_id = ? AND start_date <= ? AND end_date >= ?') {
    const [monthId, d1, d2] = params;
    const rows = state.weeks.filter((w) => w.month_id === Number(monthId) && w.start_date <= d1 && w.end_date >= d2);
    return [rows, []];
  }
  if (sql.startsWith('INSERT INTO budget_expenses')) {
    const id = ++state.nextId;
    const [month_id, week_id, category_id, date, concept, budget_amount, real_amount, payment_method] = params;
    state.budget_expenses.push({ id, month_id: Number(month_id), week_id, category_id: Number(category_id), date, concept, budget_amount, real_amount, payment_method });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE budget_expenses SET month_id')) {
    return [{ affectedRows: 1 }, []];
  }
  if (sql.startsWith('INSERT INTO extra_expenses')) {
    const id = ++state.nextId;
    const [month_id, week_id, category_id, date, concept, amount, payment_method] = params;
    state.extra_expenses.push({ id, month_id: Number(month_id), week_id, category_id: Number(category_id), date, concept, amount, payment_method });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE extra_expenses SET month_id')) {
    return [{ affectedRows: 1 }, []];
  }

  return [[], []];
};

const app = require('../app');

function makeToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, typ: 'access' }, config.jwt.accessSecret, { expiresIn: '15m' });
}

function request(appInstance, method, reqPath, token, body = undefined) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = reqPath;
    req.headers = {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };

    const bodyStr = body !== undefined ? JSON.stringify(body) : '';
    if (bodyStr) {
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
      resolve({ status: res.statusCode, body: parsed });
    };

    res.on('error', reject);
    appInstance.handle(req, res);

    process.nextTick(() => {
      if (bodyStr) req.push(bodyStr);
      req.push(null);
    });
  });
}

async function runTests() {
  const tokenAdmin = makeToken({ id: 1, role: 'admin' });
  const tokenA = makeToken({ id: 2, role: 'regular' });
  const tokenB = makeToken({ id: 3, role: 'regular' });

  console.log('=== Verificando Fase 1 Prompt 7 ===');

  // 1. Categorías: edición global, ajena, validaciones y duplicados
  let res = await request(app, 'PUT', '/api/categories/1', tokenA, {
    name: 'Hogar Editado',
    color: '#FF00AA',
    icon: 'fa-home',
  });
  assert.strictEqual(res.status, 403, 'Usuario regular NO puede modificar categoría global');
  assert.strictEqual(res.body.message, 'No puedes modificar categorías predeterminadas');

  res = await request(app, 'PUT', '/api/categories/1', tokenAdmin, {
    name: 'Hogar Principal',
    color: '#F4A6C1',
    icon: 'fa-house',
  });
  assert.strictEqual(res.status, 200, 'Admin SÍ puede modificar categoría global');

  res = await request(app, 'PUT', '/api/categories/201', tokenA, {
    name: 'Robada',
    color: '#123456',
    icon: 'fa-tag',
  });
  assert.strictEqual(res.status, 404, 'Editar categoría de otro usuario debe devolver 404');

  // Validaciones de name, color, icon
  res = await request(app, 'PUT', '/api/categories/101', tokenA, {
    name: 'X'.repeat(51),
  });
  assert.strictEqual(res.status, 400, 'Nombre > 50 caracteres debe devolver 400');

  res = await request(app, 'PUT', '/api/categories/101', tokenA, {
    color: 'red',
  });
  assert.strictEqual(res.status, 400, 'Color no hex #RRGGBB debe devolver 400');

  res = await request(app, 'PUT', '/api/categories/101', tokenA, {
    icon: 'INVALID_UPPERCASE!',
  });
  assert.strictEqual(res.status, 400, 'Icono fuera de [a-z0-9- ] debe devolver 400');

  // Duplicados al renombrar
  res = await request(app, 'PUT', '/api/categories/101', tokenA, {
    name: 'Cat A2',
  });
  assert.strictEqual(res.status, 409, 'Renombrar a una categoría propia ya existente debe devolver 409');

  console.log('✔ 1. Reglas de category.service.updateCategory verificadas.');

  // 2. Gastos: verificar category_id y payment_method al crear o editar
  res = await request(app, 'POST', '/api/expenses/budget', tokenA, {
    month_id: 100,
    category_id: 201, // Categoría de User B
    date: '2026-01-05',
    concept: 'Gasto con cat ajena',
    budget_amount: 50,
  });
  assert.strictEqual(res.status, 400, 'Crear gasto presupuestado con category_id de otro usuario debe devolver 400');

  res = await request(app, 'PUT', '/api/expenses/budget/500', tokenA, {
    category_id: 201, // Categoría de User B
  });
  assert.strictEqual(res.status, 400, 'Editar gasto presupuestado con category_id de otro usuario debe devolver 400');

  res = await request(app, 'POST', '/api/expenses/extra', tokenA, {
    month_id: 100,
    category_id: 201, // Categoría de User B
    date: '2026-01-05',
    concept: 'Extra con cat ajena',
    amount: 30,
  });
  assert.strictEqual(res.status, 400, 'Crear gasto extra con category_id de otro usuario debe devolver 400');

  res = await request(app, 'POST', '/api/expenses/budget', tokenA, {
    month_id: 100,
    category_id: 101, // Categoría propia de A
    date: '2026-01-05',
    concept: 'Gasto con medio de pago de B',
    budget_amount: 50,
    payment_method: 'Tarjeta B', // Medio de pago de User B
  });
  assert.strictEqual(res.status, 400, 'Crear gasto con payment_method de otro usuario debe devolver 400');

  res = await request(app, 'POST', '/api/expenses/budget', tokenA, {
    month_id: 100,
    category_id: 101,
    date: '2026-01-05',
    concept: 'Gasto válido con medio propio',
    budget_amount: 50,
    payment_method: 'Nequi A',
  });
  assert.strictEqual(res.status, 201, 'Crear gasto con categoría propia y medio propio debe devolver 201');

  res = await request(app, 'POST', '/api/expenses/extra', tokenA, {
    month_id: 100,
    category_id: 1, // Global
    date: '2026-01-05',
    concept: 'Gasto con Retiro de Ahorros',
    amount: 40,
    payment_method: 'Retiro de Ahorros',
  });
  assert.strictEqual(res.status, 201, 'Crear gasto con categoría global y Retiro de Ahorros debe devolver 201');

  console.log('✔ 2. Validación de category_id y payment_method al crear/editar gastos verificada.');

  // 3. adminCreateUser: sin 'Temporal123!', generación aleatoria 16 chars y must_change_password = TRUE
  const authServiceContent = fs.readFileSync(path.join(__dirname, '../services/auth.service.js'), 'utf8');
  assert(!authServiceContent.includes('Temporal123!'), 'No debe existir Temporal123! en auth.service.js');

  res = await request(app, 'POST', '/api/admin/users', tokenAdmin, {
    email: '  Nuevo.Usuario@Test.COM ',
    username: '  nuevo.user_1 ',
    name: 'Nuevo Usuario',
    role: 'regular',
    password: 'weak',
  });
  assert.strictEqual(res.status, 400, 'Contraseña débil enviada por admin debe devolver 400');

  res = await request(app, 'POST', '/api/admin/users', tokenAdmin, {
    email: '  Nuevo.Usuario@Test.COM ',
    username: '  nuevo.user_1 ',
    name: 'Nuevo Usuario',
    role: 'regular',
  });
  assert.strictEqual(res.status, 201, 'Admin debe poder crear usuario sin enviar contraseña');
  const createdData = res.body.data;
  assert.strictEqual(createdData.email, 'nuevo.usuario@test.com', 'El email debe normalizarse a minúsculas y trim');
  assert.strictEqual(createdData.username, 'nuevo.user_1', 'El username debe normalizarse con trim');
  assert.strictEqual(createdData.mustChangePassword, true, 'mustChangePassword debe ser true');
  assert(
    typeof createdData.temporaryPassword === 'string' && createdData.temporaryPassword.length === 16,
    'Debe devolver contraseña aleatoria de 16 caracteres'
  );
  const generatedPwd = createdData.temporaryPassword;
  assert(/[A-Z]/.test(generatedPwd) && /[a-z]/.test(generatedPwd) && /[0-9]/.test(generatedPwd) && /[@$!%*?&.#_\-]/.test(generatedPwd));

  console.log('✔ 3. adminCreateUser genera contraseña segura de 16 caracteres y activa must_change_password.');

  // 4. Login de usuario con must_change_password = TRUE y bloqueo 403 PASSWORD_CHANGE_REQUIRED
  const loginRes = await request(app, 'POST', '/api/auth/login', null, {
    email: 'nuevo.usuario@test.com',
    password: generatedPwd,
  });
  assert.strictEqual(loginRes.status, 200);
  assert.strictEqual(loginRes.body.data.mustChangePassword, true, 'El login debe devolver mustChangePassword: true');
  assert.strictEqual(loginRes.body.data.user.mustChangePassword, true);

  const newUserToken = loginRes.body.data.accessToken;

  // Intentar acceder a endpoints normales -> 403 PASSWORD_CHANGE_REQUIRED
  const blockedYears = await request(app, 'GET', '/api/years', newUserToken);
  assert.strictEqual(blockedYears.status, 403);
  assert.strictEqual(blockedYears.body.code, 'PASSWORD_CHANGE_REQUIRED');

  const blockedCats = await request(app, 'GET', '/api/categories', newUserToken);
  assert.strictEqual(blockedCats.status, 403);
  assert.strictEqual(blockedCats.body.code, 'PASSWORD_CHANGE_REQUIRED');

  // Cambiar contraseña en PUT /api/profile/password -> permitido (200) y desbloquea la cuenta
  const changePwdRes = await request(app, 'PUT', '/api/profile/password', newUserToken, {
    oldPassword: generatedPwd,
    newPassword: 'MiNuevaPassword123!',
  });
  assert.strictEqual(changePwdRes.status, 200);

  // Ahora los demás endpoints ya no están bloqueados
  const unlockedCats = await request(app, 'GET', '/api/categories', newUserToken);
  assert.strictEqual(unlockedCats.status, 200);

  console.log('✔ 4. Flujo must_change_password y bloqueo 403 PASSWORD_CHANGE_REQUIRED verificados.');

  // 5. adminUpdateUser: whitelist y protección del último admin / auto-edición
  res = await request(app, 'PUT', '/api/admin/users/1', tokenAdmin, {
    role: 'regular',
  });
  assert.strictEqual(res.status, 400, 'Un admin no puede quitarse el rol de admin a sí mismo');

  res = await request(app, 'PUT', '/api/admin/users/1', tokenAdmin, {
    isActive: false,
  });
  assert.strictEqual(res.status, 400, 'Un admin no puede desactivarse a sí mismo');

  res = await request(app, 'PUT', '/api/admin/users/1/status', tokenAdmin, {
    isActive: false,
  });
  assert.strictEqual(res.status, 400, 'Un admin no puede desactivarse a sí mismo vía /status');

  // Verificar whitelist: intentar inyectar password_hash o must_change_password en adminUpdateUser
  const oldHashB = state.users.find((u) => u.id === 3).password_hash;
  res = await request(app, 'PUT', '/api/admin/users/3', tokenAdmin, {
    name: 'User B Actualizado',
    password_hash: 'hacked_hash',
    must_change_password: 1,
  });
  assert.strictEqual(res.status, 200);
  const updatedB = state.users.find((u) => u.id === 3);
  assert.strictEqual(updatedB.name, 'User B Actualizado');
  assert.strictEqual(updatedB.password_hash, oldHashB, 'password_hash no debe poder modificarse por adminUpdateUser');
  assert.strictEqual(updatedB.must_change_password, 0, 'must_change_password no está en la whitelist de adminUpdateUser');

  console.log('✔ 5. adminUpdateUser con whitelist y protección de administradores verificado.');

  // 6. Validación de email y username en register y updateProfile
  res = await request(app, 'POST', '/api/auth/register', null, {
    email: 'email-invalido',
    username: 'valid_user',
    password: 'ValidPass123!',
    name: 'Test',
  });
  assert.strictEqual(res.status, 400, 'Email inválido en register debe devolver 400');

  res = await request(app, 'POST', '/api/auth/register', null, {
    email: 'valid@test.com',
    username: 'ab', // < 3 chars
    password: 'ValidPass123!',
    name: 'Test',
  });
  assert.strictEqual(res.status, 400, 'Username < 3 chars en register debe devolver 400');

  res = await request(app, 'POST', '/api/auth/register', null, {
    email: 'valid@test.com',
    username: 'usuario con espacios',
    password: 'ValidPass123!',
    name: 'Test',
  });
  assert.strictEqual(res.status, 400, 'Username con caracteres inválidos debe devolver 400');

  res = await request(app, 'PUT', '/api/profile', tokenA, {
    email: 'no-es-un-correo',
  });
  assert.strictEqual(res.status, 400, 'Email inválido en updateProfile debe devolver 400');

  res = await request(app, 'PUT', '/api/profile', tokenA, {
    username: 'bad$username!',
  });
  assert.strictEqual(res.status, 400, 'Username inválido en updateProfile debe devolver 400');

  clearUserCache();
  console.log('✔ 6. Validación y normalización de email y username verificadas.');

  console.log('\n🎉 TODAS LAS PRUEBAS DE FASE 1 PROMPT 7 PASARON EXITOSAMENTE');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Falló la verificación:', err);
  process.exit(1);
});

