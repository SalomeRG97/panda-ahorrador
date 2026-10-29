/**
 * Script de verificación para Fase 1 — Prompt 8:
 * 1. Middleware validate({ body, params, query }) con Zod -> 400 { success: false, message: 'Datos inválidos', errors: [{ field, message }] }
 * 2. Esquemas en back/src/validators/ (common, auth, profile, year, income, saving, expense, challenge, category, payment-method, share, admin, etc.)
 * 3. Validación aplicada en todas las rutas + reemplazo de req.body/params/query por datos parseados (trim, coerción).
 * 4. Verificación de que la fecha del gasto o ingreso caiga dentro del mes (month_id) indicado -> 400.
 * 5. Compatibilidad total con los payloads actuales del frontend (api.service.ts / auth.service.ts).
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_for_prompt8_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_prompt8_12345';

const assert = require('assert');
const http = require('http');
const { Duplex } = require('stream');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const hashSync = (plain) => bcrypt.hashSync(plain, 4);

const state = {
  roles: [
    { id: 1, name: 'admin', description: 'Admin' },
    { id: 2, name: 'regular', description: 'Regular' },
    { id: 3, name: 'viewer', description: 'Viewer' },
  ],
  users: [
    {
      id: 1,
      email: 'admin@test.com',
      username: 'admin_user',
      password_hash: hashSync('AdminPass123!'),
      name: 'Admin User',
      role_id: 1,
      role_name: 'admin',
      is_active: 1,
      must_change_password: 0,
      avatar_url: null,
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
    },
    {
      id: 3,
      email: 'viewer@test.com',
      username: 'viewer_user',
      password_hash: hashSync('ViewerPass123!'),
      name: 'Viewer User',
      role_id: 3,
      role_name: 'viewer',
      is_active: 1,
      must_change_password: 0,
      avatar_url: null,
    },
  ],
  years: [
    { id: 10, year: 2026, start_month: 1, end_month: 12, user_id: 2 },
  ],
  months: [
    { id: 101, year_id: 10, month_number: 1, month_name: 'Enero' },
    { id: 102, year_id: 10, month_number: 2, month_name: 'Febrero' },
  ],
  weeks: [
    { id: 1001, month_id: 101, week_number: 1, start_date: '2026-01-01', end_date: '2026-01-07' },
    { id: 1002, month_id: 101, week_number: 2, start_date: '2026-01-08', end_date: '2026-01-14' },
    { id: 1003, month_id: 102, week_number: 1, start_date: '2026-02-01', end_date: '2026-02-07' },
  ],
  categories: [
    { id: 1, name: 'Hogar', color: '#F4A6C1', icon: 'fa-house', user_id: null },
    { id: 50, name: 'Mascotas', color: '#A8D8EA', icon: 'fa-paw', user_id: 2 },
  ],
  payment_methods: [
    { id: 10, user_id: 2, name: 'Efectivo' },
    { id: 11, user_id: 2, name: 'Nequi' },
  ],
  incomes: [
    { id: 2001, month_id: 101, date: '2026-01-05', concept: 'Salario', amount: 3000000 },
  ],
  savings: [
    { id: 1, month_id: 101, amount: 500000 },
  ],
  budget_expenses: [
    {
      id: 3001,
      month_id: 101,
      week_id: 1001,
      category_id: 1,
      date: '2026-01-05',
      concept: 'Arriendo',
      budget_amount: 1200000,
      real_amount: 1200000,
      payment_method: 'Nequi',
      recurrence_id: null,
    },
  ],
  extra_expenses: [
    {
      id: 4001,
      month_id: 101,
      week_id: 1001,
      category_id: 1,
      date: '2026-01-06',
      concept: 'Helado',
      amount: 15000,
      payment_method: 'Efectivo',
    },
  ],
  month_challenges: [
    { id: 7001, month_id: 101, challenge_id: 1 },
  ],
  user_shares: [],
};

let nextId = 9000;

db.query = async (rawSql, params = []) => {
  const sql = rawSql.replace(/\s+/g, ' ').trim();

  if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
    return [[{ c: 1 }], []];
  }
  if (sql.startsWith('CREATE TABLE')) {
    return [{ affectedRows: 0 }, []];
  }

  // USERS
  if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) {
    const u = state.users.find((x) => x.id === Number(params[0]));
    return [u ? [{ ...u }] : [], []];
  }
  if (sql.includes('FROM users u') && sql.includes('WHERE u.email = ?')) {
    const u = state.users.find((x) => x.email === params[0]);
    return [u ? [{ ...u }] : [], []];
  }
  if (sql.includes('FROM users u') && sql.includes('WHERE u.username = ?')) {
    const u = state.users.find((x) => x.username === params[0]);
    return [u ? [{ ...u }] : [], []];
  }

  // OWNERSHIP
  if (sql === 'SELECT user_id FROM years WHERE id = ?') {
    const y = state.years.find((r) => r.id === Number(params[0]));
    return [y ? [{ user_id: y.user_id }] : [], []];
  }
  if (sql.includes('FROM months m JOIN years y ON m.year_id = y.id WHERE m.id = ?')) {
    const m = state.months.find((r) => r.id === Number(params[0]));
    const y = m ? state.years.find((r) => r.id === m.year_id) : null;
    return [y ? [{ ...m, year: y.year, user_id: y.user_id }] : [], []];
  }
  if (sql.includes('FROM weeks w JOIN months m ON w.month_id = m.id JOIN years y ON m.year_id = y.id WHERE w.id = ?')) {
    const w = state.weeks.find((r) => r.id === Number(params[0]));
    const m = w ? state.months.find((r) => r.id === w.month_id) : null;
    const y = m ? state.years.find((r) => r.id === m.year_id) : null;
    return [y ? [{ user_id: y.user_id }] : [], []];
  }
  if (sql.includes('FROM incomes i JOIN months m ON i.month_id = m.id JOIN years y ON m.year_id = y.id WHERE i.id = ?')) {
    const inc = state.incomes.find((r) => r.id === Number(params[0]));
    const m = inc ? state.months.find((r) => r.id === inc.month_id) : null;
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
  if (sql.includes('FROM month_challenges mc JOIN months m ON mc.month_id = m.id JOIN years y ON m.year_id = y.id WHERE mc.id = ?')) {
    const mc = state.month_challenges.find((r) => r.id === Number(params[0]));
    const m = mc ? state.months.find((r) => r.id === mc.month_id) : null;
    const y = m ? state.years.find((r) => r.id === m.year_id) : null;
    return [y ? [{ user_id: y.user_id }] : [], []];
  }

  // CATEGORIES & PAYMENT METHODS
  if (sql.includes('FROM categories WHERE id = ?')) {
    const c = state.categories.find((x) => x.id === Number(params[0]));
    return [c ? [{ ...c, isGlobal: c.user_id === null ? 1 : 0 }] : [], []];
  }
  if (sql.includes('FROM categories WHERE user_id = ? AND LOWER(name) = LOWER(?)')) {
    const userId = Number(params[0]);
    const name = String(params[1]).toLowerCase();
    const excludeId = params[2] !== undefined ? Number(params[2]) : null;
    const found = state.categories.find(
      (c) => c.user_id === userId && c.name.toLowerCase() === name && (excludeId === null || c.id !== excludeId)
    );
    return [found ? [{ id: found.id }] : [], []];
  }
  if (sql.startsWith('INSERT INTO categories')) {
    const id = ++nextId;
    const cat = { id, name: params[0], color: params[1], icon: params[2], user_id: params[3] };
    state.categories.push(cat);
    return [{ insertId: id }, []];
  }
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
  if (sql.startsWith('INSERT INTO payment_methods')) {
    const id = ++nextId;
    const pm = { id, user_id: Number(params[0]), name: params[1] };
    state.payment_methods.push(pm);
    return [{ insertId: id }, []];
  }

  // WEEKS
  if (sql.includes('FROM weeks w') && sql.includes('WHERE m.id = ? AND ? BETWEEN w.start_date AND w.end_date')) {
    const monthId = Number(params[0]);
    const date = params[1];
    const w = state.weeks.find((r) => r.month_id === monthId && date >= r.start_date && date <= r.end_date);
    return [w ? [{ ...w }] : [], []];
  }
  if (sql.includes('FROM weeks w') && sql.includes('JOIN months m ON w.month_id = m.id') && sql.includes('WHERE ? BETWEEN w.start_date AND w.end_date')) {
    const date = params[0];
    const userId = Number(params[1]);
    const matches = state.weeks.filter((w) => {
      const m = state.months.find((x) => x.id === w.month_id);
      const y = m ? state.years.find((x) => x.id === m.year_id) : null;
      return y && y.user_id === userId && date >= w.start_date && date <= w.end_date;
    });
    return [matches, []];
  }
  if (sql.includes('SELECT * FROM weeks WHERE month_id = ? ORDER BY start_date ASC LIMIT 1')) {
    const w = state.weeks.find((r) => r.month_id === Number(params[0]));
    return [w ? [{ ...w }] : [], []];
  }

  // INCOMES & SAVINGS
  if (sql === 'SELECT * FROM incomes WHERE id = ?') {
    const inc = state.incomes.find((r) => r.id === Number(params[0]));
    return [inc ? [{ ...inc }] : [], []];
  }
  if (sql.startsWith('INSERT INTO incomes')) {
    const id = ++nextId;
    const inc = { id, month_id: Number(params[0]), date: params[1], concept: params[2], amount: Number(params[3]) };
    state.incomes.push(inc);
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE incomes SET')) {
    const id = Number(params[params.length - 1]);
    const inc = state.incomes.find((r) => r.id === id);
    if (inc) {
      inc.date = params[0];
      inc.concept = params[1];
      inc.amount = Number(params[2]);
    }
    return [{ affectedRows: inc ? 1 : 0 }, []];
  }
  if (sql === 'SELECT * FROM savings WHERE month_id = ?') {
    const sav = state.savings.find((r) => r.month_id === Number(params[0]));
    return [sav ? [{ ...sav }] : [], []];
  }
  if (sql.startsWith('UPDATE savings SET amount = ? WHERE month_id = ?')) {
    const sav = state.savings.find((r) => r.month_id === Number(params[1]));
    if (sav) sav.amount = Number(params[0]);
    return [{ affectedRows: sav ? 1 : 0 }, []];
  }

  // EXPENSES
  if (sql.includes('FROM budget_expenses be') && sql.includes('WHERE be.id = ?')) {
    const be = state.budget_expenses.find((r) => r.id === Number(params[0]));
    return [be ? [{ ...be }] : [], []];
  }
  if (sql.startsWith('INSERT INTO budget_expenses')) {
    const id = ++nextId;
    const be = {
      id,
      month_id: Number(params[0]),
      week_id: params[1],
      category_id: Number(params[2]),
      date: params[3],
      concept: params[4],
      budget_amount: Number(params[5]),
      real_amount: params[6],
      payment_method: params[7],
      recurrence_id: params[8] || null,
    };
    state.budget_expenses.push(be);
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE budget_expenses SET')) {
    const id = Number(params[params.length - 1]);
    const be = state.budget_expenses.find((r) => r.id === id);
    if (be) {
      be.category_id = Number(params[0]);
      be.date = params[1];
      be.concept = params[2];
      be.budget_amount = Number(params[3]);
      be.real_amount = params[4];
      be.payment_method = params[5];
    }
    return [{ affectedRows: be ? 1 : 0 }, []];
  }
  if (sql === 'SELECT * FROM extra_expenses WHERE id = ?') {
    const ee = state.extra_expenses.find((r) => r.id === Number(params[0]));
    return [ee ? [{ ...ee }] : [], []];
  }
  if (sql.includes('FROM extra_expenses ee') && sql.includes('WHERE ee.id = ?')) {
    const ee = state.extra_expenses.find((r) => r.id === Number(params[0]));
    return [ee ? [{ ...ee }] : [], []];
  }
  if (sql.startsWith('INSERT INTO extra_expenses')) {
    const id = ++nextId;
    const ee = {
      id,
      month_id: Number(params[0]),
      week_id: params[1],
      category_id: Number(params[2]),
      date: params[3],
      concept: params[4],
      amount: Number(params[5]),
      payment_method: params[6],
    };
    state.extra_expenses.push(ee);
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE extra_expenses SET')) {
    const id = Number(params[params.length - 1]);
    const ee = state.extra_expenses.find((r) => r.id === id);
    if (ee) {
      ee.category_id = Number(params[0]);
      ee.date = params[1];
      ee.concept = params[2];
      ee.amount = Number(params[3]);
      ee.payment_method = params[4];
    }
    return [{ affectedRows: ee ? 1 : 0 }, []];
  }

  // CHALLENGES
  if (sql.startsWith('UPDATE challenge_progress SET completed = ?')) {
    return [{ affectedRows: 1 }, []];
  }
  if (sql.includes('FROM challenge_progress WHERE month_challenge_id = ?')) {
    return [[{ id: 1, month_challenge_id: Number(params[0]), day: 1, completed: 1 }], []];
  }

  // SHARE
  if (sql.startsWith('INSERT INTO user_shares')) {
    const id = ++nextId;
    state.user_shares.push({ id, owner_id: Number(params[0]), viewer_id: Number(params[1]) });
    return [{ insertId: id }, []];
  }

  return [[], []];
};

const app = require('../app');

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role_name, typ: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

function inMemoryRequest(appInstance, method, reqPath, token, body = undefined) {
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
      resolve({ status: res.statusCode, data: parsed });
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
  console.log('=== Verificando Fase 1 — Prompt 8 (Validación de Entrada con Zod y Regla Fecha-Mes) ===');

  const tokenA = makeToken(state.users[1]); // regular user_id = 2
  const tokenAdmin = makeToken(state.users[0]); // admin user_id = 1

  const req = (method, path, token, body) => inMemoryRequest(app, method, path, token, body);

  const assertValidationError = (res, expectedFieldSubstring, label) => {
    assert.strictEqual(res.status, 400, `${label}: esperado HTTP 400, recibido ${res.status} (${JSON.stringify(res.data)})`);
    assert.strictEqual(res.data.success, false, `${label}: success debe ser false`);
    assert.strictEqual(res.data.message, 'Datos inválidos', `${label}: message debe ser 'Datos inválidos'`);
    assert.ok(Array.isArray(res.data.errors) && res.data.errors.length > 0, `${label}: errors debe ser un arreglo no vacío`);
    if (expectedFieldSubstring) {
      const hasField = res.data.errors.some((e) => e.field.includes(expectedFieldSubstring));
      assert.ok(
        hasField,
        `${label}: se esperaba error en campo '${expectedFieldSubstring}', recibido: ${JSON.stringify(res.data.errors)}`
      );
    }
  };

  try {
    // =========================================================================
    // 1. CRITERIO: Montos negativos, > max o con más de 2 decimales -> 400
    // =========================================================================
    let res = await req('POST', '/api/incomes', tokenA, {
      month_id: 101,
      date: '2026-01-05',
      concept: 'Prueba monto negativo',
      amount: -100,
    });
    assertValidationError(res, 'amount', 'POST /api/incomes con monto negativo');

    res = await req('POST', '/api/incomes/saving', tokenA, {
      monthId: 101,
      amount: -0.01,
    });
    assertValidationError(res, 'amount', 'POST /api/incomes/saving con monto negativo');

    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-05',
      concept: 'Gasto presupuesto negativo',
      budget_amount: -50,
      real_amount: 0,
      payment_method: 'Efectivo',
    });
    assertValidationError(res, 'budget_amount', 'POST /api/expenses/budget con budget_amount negativo');

    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-05',
      concept: 'Gasto real negativo',
      budget_amount: 100,
      real_amount: -1,
      payment_method: 'Efectivo',
    });
    assertValidationError(res, 'real_amount', 'POST /api/expenses/budget con real_amount negativo');

    res = await req('POST', '/api/expenses/extra', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-05',
      concept: 'Gasto extra excesivo',
      amount: 1_000_000_000_000,
      payment_method: 'Efectivo',
    });
    assertValidationError(res, 'amount', 'POST /api/expenses/extra > 999_999_999_999');

    res = await req('POST', '/api/expenses/extra', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-05',
      concept: 'Gasto extra 3 decimales',
      amount: 15.999,
      payment_method: 'Efectivo',
    });
    assertValidationError(res, 'amount', 'POST /api/expenses/extra con 3 decimales');

    console.log('✔ 1. Montos negativos, > 999_999_999_999 y > 2 decimales devuelven 400 con detalle por campo.');

    // =========================================================================
    // 2. CRITERIO: Fechas inválidas -> 400
    // =========================================================================
    for (const badDate of ['2026-02-30', '2026-13-01', '2025-02-29', '2026-04-31', '05-01-2026', 'no-es-fecha']) {
      res = await req('POST', '/api/incomes', tokenA, {
        month_id: 101,
        date: badDate,
        concept: 'Ingreso fecha inválida',
        amount: 1000,
      });
      assertValidationError(res, 'date', `POST /api/incomes con fecha inválida (${badDate})`);
    }

    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-02-29', // 2026 no es bisiesto
      concept: 'Gasto fecha inválida',
      budget_amount: 500,
    });
    assertValidationError(res, 'date', 'POST /api/expenses/budget con 2026-02-29');

    console.log('✔ 2. Fechas inválidas de formato o calendario (ej. 2026-02-30, 2025-02-29) devuelven 400 con detalle por campo.');

    // =========================================================================
    // 3. CRITERIO: IDs no numéricos en params y body -> 400
    // =========================================================================
    const nonNumericParamRoutes = [
      ['GET', '/api/years/abc'],
      ['DELETE', '/api/years/abc'],
      ['GET', '/api/months/abc'],
      ['GET', '/api/months/year/abc'],
      ['GET', '/api/weeks/abc'],
      ['GET', '/api/weeks/month/abc'],
      ['GET', '/api/incomes/month/abc'],
      ['PUT', '/api/incomes/abc', { date: '2026-01-05', concept: 'Test', amount: 100 }],
      ['DELETE', '/api/incomes/abc'],
      ['PUT', '/api/expenses/budget/abc', { category_id: 1, date: '2026-01-05', concept: 'Test', budget_amount: 100 }],
      ['DELETE', '/api/expenses/budget/abc'],
      ['PUT', '/api/expenses/extra/abc', { category_id: 1, date: '2026-01-05', concept: 'Test', amount: 100 }],
      ['DELETE', '/api/expenses/extra/abc'],
      ['PUT', '/api/categories/abc', { name: 'Cat', color: '#112233', icon: 'fa-tag' }],
      ['DELETE', '/api/categories/abc'],
      ['PUT', '/api/payment-methods/abc', { name: 'Efectivo 2' }],
      ['DELETE', '/api/payment-methods/abc'],
      ['GET', '/api/challenges/month/abc'],
      ['GET', '/api/summary/year/abc'],
      ['GET', '/api/summary/year/abc/categories'],
      ['GET', '/api/summary/month/abc/categories-weekly'],
      ['DELETE', '/api/share/abc'],
    ];

    for (const [method, path, body] of nonNumericParamRoutes) {
      res = await req(method, path, tokenA, body);
      assertValidationError(res, '', `${method} ${path} con ID no numérico`);
    }

    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 'no-num',
      category_id: 'abc',
      date: '2026-01-05',
      concept: 'Test',
      budget_amount: 100,
    });
    assertValidationError(res, 'month_id', 'POST /api/expenses/budget con month_id no numérico');
    assertValidationError(res, 'category_id', 'POST /api/expenses/budget con category_id no numérico');

    console.log('✔ 3. IDs no numéricos en params y body devuelven 400 con detalle por campo.');

    // =========================================================================
    // 4. CRITERIO: Concepts vacíos o de 10k caracteres -> 400 + Trim
    // =========================================================================
    const longConcept = 'x'.repeat(10000);

    for (const badConcept of ['', '     ', longConcept]) {
      res = await req('POST', '/api/incomes', tokenA, {
        month_id: 101,
        date: '2026-01-05',
        concept: badConcept,
        amount: 1000,
      });
      assertValidationError(res, 'concept', `POST /api/incomes con concept inválido (len=${badConcept.length})`);

      res = await req('POST', '/api/expenses/budget', tokenA, {
        month_id: 101,
        category_id: 1,
        date: '2026-01-05',
        concept: badConcept,
        budget_amount: 1000,
      });
      assertValidationError(res, 'concept', `POST /api/expenses/budget con concept inválido (len=${badConcept.length})`);

      res = await req('POST', '/api/expenses/extra', tokenA, {
        month_id: 101,
        category_id: 1,
        date: '2026-01-05',
        concept: badConcept,
        amount: 1000,
      });
      assertValidationError(res, 'concept', `POST /api/expenses/extra con concept inválido (len=${badConcept.length})`);
    }

    // Verificar que concept con espacios laterales se recorta (trim) y guarda limpio
    res = await req('POST', '/api/incomes', tokenA, {
      month_id: 101,
      date: '2026-01-05',
      concept: '   Bono Trimestral   ',
      amount: 250000,
    });
    assert.strictEqual(res.status, 201);
    const createdIncome = state.incomes.find((i) => i.id === res.data.data.id);
    assert.strictEqual(createdIncome.concept, 'Bono Trimestral', 'El concept debe guardarse con trim aplicado');

    console.log('✔ 4. Concepts vacíos, solo espacios o de 10k caracteres devuelven 400, y concepts válidos aplican trim.');

    // =========================================================================
    // 5. CRITERIO: Esquemas específicos por módulo (year, recurrence, challenge, share, admin, payment-method)
    // =========================================================================
    // Year (2000-2100, startMonth 1-12)
    res = await req('POST', '/api/years', tokenA, { year: 1999, startMonth: 1 });
    assertValidationError(res, 'year', 'POST /api/years con year=1999');

    res = await req('POST', '/api/years', tokenA, { year: 2101, startMonth: 1 });
    assertValidationError(res, 'year', 'POST /api/years con year=2101');

    res = await req('POST', '/api/years', tokenA, { year: 2027, startMonth: 13 });
    assertValidationError(res, 'startMonth', 'POST /api/years con startMonth=13');

    // Expense recurrence (frequency enum, end_date >= date) y scope ('single'|'future'|'all')
    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-10',
      concept: 'Suscripción',
      budget_amount: 30000,
      recurrence: {
        frequency: 'hourly', // inválido (recurrence.service soporta daily|weekly|biweekly|monthly|yearly)
      },
    });
    assertValidationError(res, 'recurrence.frequency', 'POST /api/expenses/budget con frequency inválida');

    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-10',
      concept: 'Suscripción',
      budget_amount: 30000,
      recurrence: {
        frequency: 'monthly',
        end_date: '2026-01-05', // menor a date
      },
    });
    assertValidationError(res, 'recurrence.end_date', 'POST /api/expenses/budget con end_date < date');

    res = await req('PUT', '/api/expenses/budget/3001', tokenA, {
      category_id: 1,
      date: '2026-01-05',
      concept: 'Arriendo',
      budget_amount: 1200000,
      scope: 'invalid_scope',
    });
    assertValidationError(res, 'scope', 'PUT /api/expenses/budget/:id con scope inválido');

    res = await req('DELETE', '/api/expenses/budget/3001?scope=invalid_scope', tokenA);
    assertValidationError(res, 'scope', 'DELETE /api/expenses/budget/:id con query.scope inválido');

    // Challenge progress (day 1-31, completed boolean)
    res = await req('PUT', '/api/challenges/progress', tokenA, {
      monthChallengeId: 7001,
      day: 0,
      completed: true,
    });
    assertValidationError(res, 'day', 'PUT /api/challenges/progress con day=0');

    res = await req('PUT', '/api/challenges/progress', tokenA, {
      monthChallengeId: 7001,
      day: 32,
      completed: true,
    });
    assertValidationError(res, 'day', 'PUT /api/challenges/progress con day=32');

    res = await req('PUT', '/api/challenges/progress', tokenA, {
      monthChallengeId: 7001,
      day: 15,
      completed: 'yes',
    });
    assertValidationError(res, 'completed', 'PUT /api/challenges/progress con completed no booleano');

    // Payment method (reservado "Retiro de ahorros")
    res = await req('POST', '/api/payment-methods', tokenA, {
      name: 'Retiro de ahorros',
    });
    assertValidationError(res, 'name', 'POST /api/payment-methods con nombre reservado');

    // Share (email)
    res = await req('POST', '/api/share', tokenA, {
      email: 'no-es-un-email',
    });
    assertValidationError(res, 'email', 'POST /api/share con email inválido');

    // Admin
    res = await req('PUT', '/api/admin/users/2/status', tokenAdmin, {
      isActive: 'true',
    });
    assertValidationError(res, 'isActive', 'PUT /api/admin/users/:id/status con isActive no booleano');

    console.log('✔ 5. Validaciones de módulos (year, recurrence, scope, challenge, payment-method, share, admin) verificadas.');

    // =========================================================================
    // 6. CRITERIO: Fecha del gasto o ingreso debe caer dentro del mes (month_id) -> 400
    // =========================================================================
    // month_id = 101 es Enero 2026 (2026-01). Enviar fecha de Febrero 2026 (2026-02-05) o Enero 2025 (2025-01-05) -> 400
    res = await req('POST', '/api/incomes', tokenA, {
      month_id: 101,
      date: '2026-02-05',
      concept: 'Ingreso fuera del mes',
      amount: 100000,
    });
    assert.strictEqual(res.status, 400, `POST /api/incomes fuera del mes debe dar 400, dio ${res.status}`);

    res = await req('PUT', '/api/incomes/2001', tokenA, {
      month_id: 101,
      date: '2026-02-05',
      concept: 'Ingreso editado fuera del mes',
      amount: 100000,
    });
    assert.strictEqual(res.status, 400, `PUT /api/incomes/:id fuera del mes indicado debe dar 400, dio ${res.status}`);

    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-02-05',
      concept: 'Gasto presupuestado fuera del mes',
      budget_amount: 50000,
      payment_method: 'Efectivo',
    });
    assert.strictEqual(res.status, 400, `POST /api/expenses/budget fuera del mes debe dar 400, dio ${res.status}`);

    res = await req('PUT', '/api/expenses/budget/3001', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-02-05',
      concept: 'Gasto presupuestado editado fuera del mes indicado',
      budget_amount: 50000,
      payment_method: 'Efectivo',
    });
    assert.strictEqual(res.status, 400, `PUT /api/expenses/budget/:id fuera del mes indicado debe dar 400, dio ${res.status}`);

    res = await req('POST', '/api/expenses/extra', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2025-01-05',
      concept: 'Gasto extra de otro año',
      amount: 20000,
      payment_method: 'Efectivo',
    });
    assert.strictEqual(res.status, 400, `POST /api/expenses/extra fuera del año/mes debe dar 400, dio ${res.status}`);

    res = await req('PUT', '/api/expenses/extra/4001', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-02-05',
      concept: 'Gasto extra editado fuera del mes',
      amount: 20000,
      payment_method: 'Efectivo',
    });
    assert.strictEqual(res.status, 400, `PUT /api/expenses/extra/:id fuera del mes debe dar 400, dio ${res.status}`);

    console.log('✔ 6. Fecha de ingreso o gasto fuera del mes (month_id) indicado devuelve 400.');

    // =========================================================================
    // 7. CRITERIO: Compatibilidad con payloads actuales del frontend
    // =========================================================================
    // setMonthSaving (envía { monthId, amount })
    res = await req('POST', '/api/incomes/saving', tokenA, { monthId: 101, amount: 650000 });
    assert.strictEqual(res.status, 200, 'setMonthSaving con { monthId, amount } debe responder 200');

    // createBudgetExpense (payload de WeekDetailPage / MonthLayoutPage)
    res = await req('POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 50,
      date: '2026-01-09',
      concept: 'Comida mascota',
      budget_amount: 85000,
      real_amount: null,
      payment_method: 'Nequi',
    });
    assert.strictEqual(res.status, 201, 'createBudgetExpense con real_amount: null debe responder 201');

    // createExtraExpense
    res = await req('POST', '/api/expenses/extra', tokenA, {
      month_id: 101,
      category_id: 50,
      date: '2026-01-10',
      concept: 'Juguete mascota',
      amount: 25000,
      payment_method: 'Efectivo',
    });
    assert.strictEqual(res.status, 201, 'createExtraExpense debe responder 201');

    // updateChallengeProgress (envía { monthChallengeId, day, completed })
    res = await req('PUT', '/api/challenges/progress', tokenA, {
      monthChallengeId: 7001,
      day: 12,
      completed: true,
    });
    assert.strictEqual(res.status, 200, 'updateChallengeProgress debe responder 200');

    // shareAccess (auth.service.ts envía { email })
    res = await req('POST', '/api/share', tokenA, {
      email: 'viewer@test.com',
    });
    assert.strictEqual(res.status, 201, 'POST /api/share con { email } del frontend debe responder 201');

    console.log('✔ 7. Todos los payloads actuales del frontend funcionan sin regresiones.');
    console.log('\n🎉 TODAS LAS PRUEBAS DE FASE 1 PROMPT 8 PASARON EXITOSAMENTE');
  } finally {
    // cleanup
  }
}

runTests().catch((err) => {
  console.error('❌ Falló la verificación de Fase 1 Prompt 8:', err);
  process.exit(1);
});
