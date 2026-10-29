/**
 * Script de verificación de propiedad de recursos (Ownership & Access Control).
 * Ejecuta pruebas de integración HTTP sobre el app de Express simulando la capa MySQL en memoria
 * para verificar todos los criterios sin alterar la base de datos remota.
 *
 * Uso: node src/scripts/test-ownership.js
 */

process.env.NODE_ENV = 'development';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test_db';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const assert = require('assert');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config/environment');

// Estado en memoria simulando las tablas relacionales
const state = {
  users: [
    { id: 1, email: 'a@test.com', username: 'usera', name: 'User A', role_name: 'regular', role_id: 2, is_active: true },
    { id: 2, email: 'b@test.com', username: 'userb', name: 'User B', role_name: 'regular', role_id: 2, is_active: true },
    { id: 3, email: 'viewer@test.com', username: 'viewer', name: 'Viewer', role_name: 'viewer', role_id: 3, is_active: true },
  ],
  years: [
    { id: 10, year: 2026, start_month: 1, end_month: 12, user_id: 1 }, // Usuario A
    { id: 20, year: 2026, start_month: 1, end_month: 12, user_id: 2 }, // Usuario B
    { id: 21, year: 2025, start_month: 1, end_month: 12, user_id: 2 }, // Solo Usuario B tiene 2025
  ],
  months: [
    { id: 101, year_id: 10, month_number: 1, month_name: 'Enero' },   // A - Ene 2026
    { id: 102, year_id: 10, month_number: 2, month_name: 'Febrero' }, // A - Feb 2026
    { id: 201, year_id: 20, month_number: 1, month_name: 'Enero' },   // B - Ene 2026
    { id: 205, year_id: 21, month_number: 5, month_name: 'Mayo' },    // B - May 2025
  ],
  weeks: [
    // Usuario B tiene IDs menores para verificar que findWeekByDate no cruce datos hacia B
    { id: 1, month_id: 201, week_number: 1, start_date: '2026-01-01', end_date: '2026-01-07' },
    { id: 2, month_id: 205, week_number: 1, start_date: '2025-05-01', end_date: '2025-05-07' },
    // Usuario A
    { id: 11, month_id: 101, week_number: 1, start_date: '2026-01-01', end_date: '2026-01-07' },
    { id: 12, month_id: 102, week_number: 1, start_date: '2026-02-01', end_date: '2026-02-07' },
  ],
  incomes: [
    { id: 1001, month_id: 101, date: '2026-01-03', concept: 'Salario A', amount: 3000 },
    { id: 2001, month_id: 201, date: '2026-01-03', concept: 'Salario B', amount: 4000 },
  ],
  savings: [
    { id: 1, month_id: 101, amount: 500 },
    { id: 2, month_id: 201, amount: 800 },
  ],
  budget_expenses: [
    {
      id: 3001,
      month_id: 101,
      week_id: 11,
      category_id: 1,
      date: '2026-01-04',
      concept: 'Arriendo A',
      budget_amount: 1000,
      real_amount: 1000,
      payment_method: 'Transferencia',
      recurrence_id: 501,
    },
    {
      id: 4001,
      month_id: 201,
      week_id: 1,
      category_id: 1,
      date: '2026-01-04',
      concept: 'Arriendo B',
      budget_amount: 1200,
      real_amount: 1200,
      payment_method: 'Transferencia',
      recurrence_id: 502,
    },
  ],
  extra_expenses: [
    {
      id: 5001,
      month_id: 101,
      week_id: 11,
      category_id: 2,
      date: '2026-01-05',
      concept: 'Café A',
      amount: 15,
      payment_method: 'Efectivo',
    },
    {
      id: 6001,
      month_id: 201,
      week_id: 1,
      category_id: 2,
      date: '2026-01-05',
      concept: 'Cena B',
      amount: 50,
      payment_method: 'Tarjeta',
    },
  ],
  month_challenges: [
    { id: 7001, month_id: 101, challenge_id: 1 },
    { id: 8001, month_id: 201, challenge_id: 1 },
  ],
  expense_recurrences: [
    {
      id: 501,
      user_id: 1,
      category_id: 1,
      concept: 'Arriendo A',
      budget_amount: 1000,
      payment_method: 'Transferencia',
      frequency: 'monthly',
      start_date: '2026-01-04',
      end_date: null,
    },
    {
      id: 502,
      user_id: 2,
      category_id: 1,
      concept: 'Arriendo B',
      budget_amount: 1200,
      payment_method: 'Transferencia',
      frequency: 'monthly',
      start_date: '2026-01-04',
      end_date: null,
    },
  ],
  user_shares: [
    { id: 1, owner_id: 2, viewer_id: 3 }, // B compartió con Viewer (id=3)
  ],
  categories: [
    { id: 1, name: 'Hogar', color: '#F4A6C1', icon: 'fa-house', user_id: null, isGlobal: 1 },
    { id: 2, name: 'Alimentación', color: '#F7C59F', icon: 'fa-utensils', user_id: null, isGlobal: 1 },
    { id: 10, name: 'Personal A', color: '#A8E6CF', icon: 'fa-star', user_id: 1, isGlobal: 0 },
    { id: 20, name: 'Personal B', color: '#A8D8EA', icon: 'fa-heart', user_id: 2, isGlobal: 0 },
  ],
  payment_methods: [
    { id: 1, user_id: 1, name: 'Transferencia' },
    { id: 2, user_id: 1, name: 'Efectivo' },
    { id: 3, user_id: 2, name: 'Transferencia' },
    { id: 4, user_id: 2, name: 'Tarjeta' },
  ],
  nextId: 9000,
};

// Mock de db.query que resuelve las consultas reales de ownership, shares y CRUD
db.query = async (sqlRaw, params = []) => {
  const sql = (typeof sqlRaw === 'string' ? sqlRaw : sqlRaw.sql).replace(/\s+/g, ' ').trim();

  // Esquema automático de recurrencias / métodos de pago
  if (sql.startsWith('CREATE TABLE') || sql.startsWith('ALTER TABLE')) {
    return [{ affectedRows: 0 }, []];
  }
  if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
    return [[{ c: 1 }], []];
  }

  // --- USERS (para auth.middleware) ---
  if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) {
    const u = state.users.find((x) => x.id === Number(params[0]));
    return [u ? [u] : [], []];
  }

  // --- CATEGORIES & PAYMENT METHODS ---
  if (sql.includes('FROM categories WHERE id = ?')) {
    const c = state.categories.find((x) => x.id === Number(params[0]));
    return [c ? [{ ...c, isGlobal: c.user_id === null ? 1 : 0 }] : [], []];
  }
  if (sql.includes('FROM payment_methods WHERE user_id = ? AND name = ?')) {
    const pm = state.payment_methods.find(
      (x) => x.user_id === Number(params[0]) && x.name === params[1]
    );
    return [pm ? [pm] : [], []];
  }
  if (sql.includes('FROM payment_methods WHERE id = ?')) {
    const pm = state.payment_methods.find((x) => x.id === Number(params[0]));
    return [pm ? [pm] : [], []];
  }

  // --- OWNERSHIP QUERIES ---
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
  if (sql.includes('FROM savings s JOIN months m ON s.month_id = m.id JOIN years y ON m.year_id = y.id WHERE s.id = ?')) {
    const sav = state.savings.find((r) => r.id === Number(params[0]));
    const m = sav ? state.months.find((r) => r.id === sav.month_id) : null;
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

  // --- SHARES ---
  if (sql.includes('FROM user_shares us') && sql.includes('WHERE us.viewer_id = ?')) {
    const rows = state.user_shares.filter((s) => s.viewer_id === Number(params[0]));
    return [rows, []];
  }
  if (sql.includes('FROM user_shares WHERE owner_id = ? AND viewer_id = ?')) {
    const rows = state.user_shares.filter(
      (s) => s.owner_id === Number(params[0]) && s.viewer_id === Number(params[1])
    );
    return [rows, []];
  }

  // --- WEEKS ---
  if (sql === 'SELECT * FROM weeks WHERE month_id = ? AND start_date <= ? AND end_date >= ?') {
    const [monthId, d1, d2] = params;
    const rows = state.weeks.filter(
      (w) => w.month_id === Number(monthId) && w.start_date <= d1 && w.end_date >= d2
    );
    return [rows, []];
  }
  if (sql.includes('SELECT w.* FROM weeks w JOIN months m ON w.month_id = m.id JOIN years y ON m.year_id = y.id WHERE y.user_id = ?')) {
    const [userId, d1, d2] = params;
    const rows = state.weeks.filter((w) => {
      const m = state.months.find((x) => x.id === w.month_id);
      const y = m ? state.years.find((x) => x.id === m.year_id) : null;
      return y && y.user_id === Number(userId) && w.start_date <= d1 && w.end_date >= d2;
    });
    return [rows, []];
  }
  if (sql === 'SELECT * FROM weeks WHERE start_date <= ? AND end_date >= ? ORDER BY id ASC LIMIT 1') {
    const [d1, d2] = params;
    const rows = state.weeks.filter((w) => w.start_date <= d1 && w.end_date >= d2);
    return [rows.slice(0, 1), []];
  }
  if (sql === 'SELECT id FROM weeks WHERE month_id = ? AND start_date <= ? AND end_date >= ? LIMIT 1') {
    const [monthId, d1, d2] = params;
    const rows = state.weeks.filter(
      (w) => w.month_id === Number(monthId) && w.start_date <= d1 && w.end_date >= d2
    );
    return [rows.slice(0, 1), []];
  }

  // --- INCOMES & SAVINGS ---
  if (sql === 'SELECT * FROM incomes WHERE id = ?') {
    const row = state.incomes.find((i) => i.id === Number(params[0]));
    return [row ? [row] : [], []];
  }
  if (sql.startsWith('INSERT INTO incomes')) {
    const [month_id, date, concept, amount] = params;
    const id = ++state.nextId;
    state.incomes.push({ id, month_id: Number(month_id), date, concept, amount });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE incomes SET')) {
    const [month_id, date, concept, amount, id] = params;
    const row = state.incomes.find((i) => i.id === Number(id));
    if (row) {
      if (month_id != null) row.month_id = Number(month_id);
      row.date = date;
      row.concept = concept;
      row.amount = amount;
    }
    return [{ affectedRows: row ? 1 : 0 }, []];
  }
  if (sql === 'DELETE FROM incomes WHERE id = ?') {
    const idx = state.incomes.findIndex((i) => i.id === Number(params[0]));
    if (idx !== -1) state.incomes.splice(idx, 1);
    return [{ affectedRows: idx !== -1 ? 1 : 0 }, []];
  }
  if (sql.startsWith('INSERT INTO savings')) {
    const [month_id, amount] = params;
    const existing = state.savings.find((s) => s.month_id === Number(month_id));
    if (existing) existing.amount = amount;
    else state.savings.push({ id: ++state.nextId, month_id: Number(month_id), amount });
    return [{ affectedRows: 1 }, []];
  }

  // --- BUDGET EXPENSES & RECURRENCES ---
  if (sql.includes('FROM budget_expenses be') && sql.includes('WHERE be.id = ?')) {
    const be = state.budget_expenses.find((r) => r.id === Number(params[0]));
    return [be ? [be] : [], []];
  }
  if (sql.startsWith('INSERT INTO budget_expenses')) {
    const id = ++state.nextId;
    const [month_id, week_id, category_id, date, concept, budget_amount, real_amount, payment_method, recurrence_id] = params;
    state.budget_expenses.push({
      id,
      month_id: Number(month_id),
      week_id: week_id ? Number(week_id) : null,
      category_id: Number(category_id),
      date,
      concept,
      budget_amount,
      real_amount: real_amount ?? 0,
      payment_method: payment_method || '',
      recurrence_id: recurrence_id || null,
    });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE budget_expenses SET month_id')) {
    const [month_id, category_id, date, concept, budget_amount, real_amount, week_id, payment_method, id] = params;
    const row = state.budget_expenses.find((r) => r.id === Number(id));
    if (row) {
      if (month_id != null) row.month_id = Number(month_id);
      if (category_id != null) row.category_id = Number(category_id);
      if (date != null) row.date = date;
      if (concept != null) row.concept = concept;
      if (budget_amount != null) row.budget_amount = budget_amount;
      if (real_amount != null) row.real_amount = real_amount;
      if (week_id != null) row.week_id = Number(week_id);
      if (payment_method != null) row.payment_method = payment_method;
    }
    return [{ affectedRows: row ? 1 : 0 }, []];
  }
  if (sql === 'DELETE FROM budget_expenses WHERE id = ?') {
    const idx = state.budget_expenses.findIndex((r) => r.id === Number(params[0]));
    if (idx !== -1) state.budget_expenses.splice(idx, 1);
    return [{ affectedRows: idx !== -1 ? 1 : 0 }, []];
  }
  if (sql === 'SELECT * FROM expense_recurrences WHERE id = ?') {
    const r = state.expense_recurrences.find((x) => x.id === Number(params[0]));
    return [r ? [r] : [], []];
  }
  if (sql.startsWith('INSERT INTO expense_recurrences')) {
    const [user_id, category_id, concept, budget_amount, payment_method, frequency, start_date, end_date] = params;
    const id = ++state.nextId;
    state.expense_recurrences.push({
      id,
      user_id: Number(user_id),
      category_id,
      concept,
      budget_amount,
      payment_method,
      frequency,
      start_date,
      end_date,
    });
    return [{ insertId: id }, []];
  }
  if (sql.includes('SELECT m.id, m.month_number, y.year FROM months m JOIN years y ON m.year_id = y.id WHERE y.user_id = ?')) {
    const userId = Number(params[0]);
    const rows = state.months
      .map((m) => {
        const y = state.years.find((yr) => yr.id === m.year_id);
        return y && y.user_id === userId ? { id: m.id, month_number: m.month_number, year: y.year } : null;
      })
      .filter(Boolean);
    return [rows, []];
  }
  if (sql === 'SELECT date FROM budget_expenses WHERE recurrence_id = ? AND month_id = ?') {
    const [recId, mId] = params;
    const rows = state.budget_expenses.filter(
      (b) => b.recurrence_id === Number(recId) && b.month_id === Number(mId)
    );
    return [rows, []];
  }
  if (sql === 'DELETE FROM budget_expenses WHERE recurrence_id = ? AND date >= ?') {
    const [recId, fromDate] = params;
    state.budget_expenses = state.budget_expenses.filter(
      (b) => !(b.recurrence_id === Number(recId) && b.date >= fromDate)
    );
    return [{ affectedRows: 1 }, []];
  }
  if (sql === 'DELETE FROM expense_recurrences WHERE id = ?') {
    state.expense_recurrences = state.expense_recurrences.filter((r) => r.id !== Number(params[0]));
    return [{ affectedRows: 1 }, []];
  }
  if (sql === 'UPDATE expense_recurrences SET end_date = ? WHERE id = ?') {
    const r = state.expense_recurrences.find((x) => x.id === Number(params[1]));
    if (r) r.end_date = params[0];
    return [{ affectedRows: 1 }, []];
  }

  // --- EXTRA EXPENSES ---
  if (sql === 'SELECT * FROM extra_expenses WHERE id = ?') {
    const ee = state.extra_expenses.find((r) => r.id === Number(params[0]));
    return [ee ? [ee] : [], []];
  }
  if (sql.startsWith('INSERT INTO extra_expenses')) {
    const id = ++state.nextId;
    const [month_id, week_id, category_id, date, concept, amount, payment_method] = params;
    state.extra_expenses.push({
      id,
      month_id: Number(month_id),
      week_id: week_id ? Number(week_id) : null,
      category_id: Number(category_id),
      date,
      concept,
      amount,
      payment_method: payment_method || '',
    });
    return [{ insertId: id }, []];
  }
  if (sql.startsWith('UPDATE extra_expenses SET month_id')) {
    const [month_id, category_id, date, concept, amount, week_id, payment_method, id] = params;
    const row = state.extra_expenses.find((r) => r.id === Number(id));
    if (row) {
      if (month_id != null) row.month_id = Number(month_id);
      if (category_id != null) row.category_id = Number(category_id);
      if (date != null) row.date = date;
      if (concept != null) row.concept = concept;
      if (amount != null) row.amount = amount;
      if (week_id != null) row.week_id = Number(week_id);
      if (payment_method != null) row.payment_method = payment_method;
    }
    return [{ affectedRows: row ? 1 : 0 }, []];
  }
  if (sql === 'DELETE FROM extra_expenses WHERE id = ?') {
    const idx = state.extra_expenses.findIndex((r) => r.id === Number(params[0]));
    if (idx !== -1) state.extra_expenses.splice(idx, 1);
    return [{ affectedRows: idx !== -1 ? 1 : 0 }, []];
  }

  // --- CHALLENGES ---
  if (sql.startsWith('UPDATE challenge_progress SET completed = ?')) {
    return [{ affectedRows: 1 }, []];
  }

  // --- YEARS ---
  if (sql === 'DELETE FROM years WHERE id = ? AND user_id = ?') {
    const idx = state.years.findIndex(
      (y) => y.id === Number(params[0]) && y.user_id === Number(params[1])
    );
    if (idx !== -1) state.years.splice(idx, 1);
    return [{ affectedRows: idx !== -1 ? 1 : 0 }, []];
  }

  throw new Error(`SQL no soportado en mock: ${sql}`);
};

const app = require('../app');

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, typ: 'access' },
    config.jwt.accessSecret,
    { expiresIn: '15m' }
  );
}

const tokenA = makeToken({ id: 1, email: 'a@test.com', role: 'regular' });
const tokenB = makeToken({ id: 2, email: 'b@test.com', role: 'regular' });
const tokenViewer = makeToken({ id: 3, email: 'viewer@test.com', role: 'viewer' });

const { Duplex } = require('stream');
const http = require('http');

function request(appInstance, method, url, token, body = undefined) {
  return new Promise((resolve, reject) => {
    /** @type {any} */
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };

    const bodyStr = body !== undefined ? JSON.stringify(body) : '';
    if (bodyStr) {
      req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
    }

    /** @type {any} */
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
  const server = app;
  let passed = 0;

  const check = (name, actual, expected) => {
    assert.strictEqual(
      actual,
      expected,
      `❌ [${name}] Esperado HTTP ${expected}, recibido HTTP ${actual}`
    );
    console.log(`✅ ${name} -> HTTP ${actual}`);
    passed++;
  };

  try {
    console.log('=== 1. Usuario A intenta modificar/borrar o crear en recursos de Usuario B (debe recibir 404) ===');

    // Incomes
    let res = await request(server, 'POST', '/api/incomes', tokenA, {
      monthId: 201, // mes de B
      date: '2026-01-05',
      concept: 'Intruso',
      amount: 100,
    });
    check('A POST /api/incomes con monthId de B', res.status, 404);

    res = await request(server, 'PUT', '/api/incomes/2001', tokenA, {
      date: '2026-01-05',
      concept: 'Hack',
      amount: 1,
    });
    check('A PUT /api/incomes/:id de B', res.status, 404);

    res = await request(server, 'DELETE', '/api/incomes/2001', tokenA);
    check('A DELETE /api/incomes/:id de B', res.status, 404);

    res = await request(server, 'POST', '/api/incomes/saving', tokenA, {
      monthId: 201, // mes de B
      amount: 999,
    });
    check('A POST /api/incomes/saving con monthId de B', res.status, 404);

    // Budget Expenses
    res = await request(server, 'POST', '/api/expenses/budget', tokenA, {
      month_id: 201, // mes de B
      category_id: 1,
      date: '2026-01-04',
      concept: 'Intruso',
      budget_amount: 100,
    });
    check('A POST /api/expenses/budget con month_id de B', res.status, 404);

    res = await request(server, 'PUT', '/api/expenses/budget/4001', tokenA, {
      category_id: 1,
      date: '2026-01-04',
      concept: 'Hack',
      budget_amount: 10,
      real_amount: 10,
    });
    check('A PUT /api/expenses/budget/:id de B', res.status, 404);

    res = await request(server, 'DELETE', '/api/expenses/budget/4001', tokenA);
    check('A DELETE /api/expenses/budget/:id de B', res.status, 404);

    res = await request(server, 'DELETE', '/api/expenses/budget/4001/series', tokenA);
    check('A DELETE /api/expenses/budget/:id/series de B', res.status, 404);

    // Extra Expenses
    res = await request(server, 'POST', '/api/expenses/extra', tokenA, {
      month_id: 201, // mes de B
      category_id: 2,
      date: '2026-01-05',
      concept: 'Intruso extra',
      amount: 50,
    });
    check('A POST /api/expenses/extra con month_id de B', res.status, 404);

    res = await request(server, 'PUT', '/api/expenses/extra/6001', tokenA, {
      category_id: 2,
      date: '2026-01-05',
      concept: 'Hack extra',
      amount: 1,
    });
    check('A PUT /api/expenses/extra/:id de B', res.status, 404);

    res = await request(server, 'DELETE', '/api/expenses/extra/6001', tokenA);
    check('A DELETE /api/expenses/extra/:id de B', res.status, 404);

    // Challenges
    res = await request(server, 'PUT', '/api/challenges/progress', tokenA, {
      monthChallengeId: 8001, // reto de B
      day: 1,
      completed: true,
    });
    check('A PUT /api/challenges/progress con monthChallengeId de B', res.status, 404);

    // Years
    res = await request(server, 'DELETE', '/api/years/20', tokenA);
    check('A DELETE /api/years/:id de B', res.status, 404);

    console.log('\n=== 2. Verificación de recálculo de week/month al cambiar fecha (Tarea 4) ===');

    // A intenta mover su propio gasto presupuestado a una fecha (2025-05-03) cuya semana solo existe en el año de B
    res = await request(server, 'PUT', '/api/expenses/budget/3001', tokenA, {
      category_id: 1,
      date: '2025-05-03',
      concept: 'Arriendo A movido a fecha de B',
      budget_amount: 1000,
      real_amount: 1000,
    });
    check('A PUT /api/expenses/budget/:id Propio con fecha que cae en mes de B', res.status, 404);

    // A intenta mover su propio gasto extra a un month_id de B
    res = await request(server, 'PUT', '/api/expenses/extra/5001', tokenA, {
      month_id: 201,
      category_id: 2,
      date: '2026-01-05',
      concept: 'Café A movido a mes de B',
      amount: 15,
    });
    check('A PUT /api/expenses/extra/:id Propio con month_id de B', res.status, 404);

    // A intenta actualizar su propio ingreso a una fecha (2025-05-03) cuya semana solo existe en el año de B
    res = await request(server, 'PUT', '/api/incomes/1001', tokenA, {
      date: '2025-05-03',
      concept: 'Salario A en fecha de B',
      amount: 3000,
    });
    check('A PUT /api/incomes/:id Propio con fecha que cae en mes de B', res.status, 404);

    console.log('\n=== 3. Viewer recibe 403 en cualquier escritura ===');

    res = await request(server, 'POST', '/api/incomes?viewAs=2', tokenViewer, {
      monthId: 201,
      date: '2026-01-05',
      concept: 'Intento viewer',
      amount: 100,
    });
    check('Viewer POST /api/incomes', res.status, 403);

    res = await request(server, 'PUT', '/api/incomes/2001?viewAs=2', tokenViewer, {
      date: '2026-01-05',
      concept: 'Intento viewer',
      amount: 100,
    });
    check('Viewer PUT /api/incomes/:id', res.status, 403);

    res = await request(server, 'DELETE', '/api/incomes/2001?viewAs=2', tokenViewer);
    check('Viewer DELETE /api/incomes/:id', res.status, 403);

    res = await request(server, 'POST', '/api/incomes/saving?viewAs=2', tokenViewer, {
      monthId: 201,
      amount: 500,
    });
    check('Viewer POST /api/incomes/saving', res.status, 403);

    res = await request(server, 'POST', '/api/expenses/budget?viewAs=2', tokenViewer, {
      month_id: 201,
      category_id: 1,
      date: '2026-01-04',
      concept: 'Viewer budget',
      budget_amount: 100,
    });
    check('Viewer POST /api/expenses/budget', res.status, 403);

    res = await request(server, 'PUT', '/api/expenses/budget/4001?viewAs=2', tokenViewer, {
      category_id: 1,
      date: '2026-01-04',
      concept: 'Viewer budget',
      budget_amount: 100,
      real_amount: 100,
    });
    check('Viewer PUT /api/expenses/budget/:id', res.status, 403);

    res = await request(server, 'DELETE', '/api/expenses/budget/4001?viewAs=2', tokenViewer);
    check('Viewer DELETE /api/expenses/budget/:id', res.status, 403);

    res = await request(server, 'DELETE', '/api/expenses/budget/4001/series?viewAs=2', tokenViewer);
    check('Viewer DELETE /api/expenses/budget/:id/series', res.status, 403);

    res = await request(server, 'POST', '/api/expenses/extra?viewAs=2', tokenViewer, {
      month_id: 201,
      category_id: 2,
      date: '2026-01-05',
      concept: 'Viewer extra',
      amount: 20,
    });
    check('Viewer POST /api/expenses/extra', res.status, 403);

    res = await request(server, 'PUT', '/api/expenses/extra/6001?viewAs=2', tokenViewer, {
      category_id: 2,
      date: '2026-01-05',
      concept: 'Viewer extra',
      amount: 20,
    });
    check('Viewer PUT /api/expenses/extra/:id', res.status, 403);

    res = await request(server, 'DELETE', '/api/expenses/extra/6001?viewAs=2', tokenViewer);
    check('Viewer DELETE /api/expenses/extra/:id', res.status, 403);

    res = await request(server, 'PUT', '/api/challenges/progress?viewAs=2', tokenViewer, {
      monthChallengeId: 8001,
      day: 1,
      completed: true,
    });
    check('Viewer PUT /api/challenges/progress', res.status, 403);

    res = await request(server, 'DELETE', '/api/years/20?viewAs=2', tokenViewer);
    check('Viewer DELETE /api/years/:id', res.status, 403);

    console.log('\n=== 4. Flujos normales de cada usuario siguen funcionando ===');

    // A crea ingreso en su propio mes
    res = await request(server, 'POST', '/api/incomes', tokenA, {
      monthId: 101,
      date: '2026-01-06',
      concept: 'Bono A',
      amount: 450,
    });
    check('A POST /api/incomes en mes propio', res.status, 201);
    const createdIncomeId = res.body.data.id;

    // A actualiza su propio ingreso
    res = await request(server, 'PUT', `/api/incomes/${createdIncomeId}`, tokenA, {
      date: '2026-01-07',
      concept: 'Bono A actualizado',
      amount: 500,
    });
    check('A PUT /api/incomes/:id propio', res.status, 200);

    // A elimina su propio ingreso
    res = await request(server, 'DELETE', `/api/incomes/${createdIncomeId}`, tokenA);
    check('A DELETE /api/incomes/:id propio', res.status, 200);

    // A actualiza ahorro de su mes
    res = await request(server, 'POST', '/api/incomes/saving', tokenA, {
      monthId: 101,
      amount: 700,
    });
    check('A POST /api/incomes/saving en mes propio', res.status, 200);

    // A crea gasto presupuestado puntual y recurrente en su mes
    res = await request(server, 'POST', '/api/expenses/budget', tokenA, {
      month_id: 101,
      category_id: 1,
      date: '2026-01-04',
      concept: 'Internet A',
      budget_amount: 80,
      recurrence: { frequency: 'monthly' },
    });
    check('A POST /api/expenses/budget (serie recurrente) en mes propio', res.status, 201);

    // A mueve su gasto presupuestado a otro mes propio (Febrero 2026 -> month_id 102)
    res = await request(server, 'PUT', '/api/expenses/budget/3001', tokenA, {
      category_id: 1,
      date: '2026-02-03',
      concept: 'Arriendo A en Febrero',
      budget_amount: 1000,
      real_amount: 1000,
    });
    check('A PUT /api/expenses/budget/:id propio moviendo a otro mes propio', res.status, 200);
    const updatedBe = state.budget_expenses.find((b) => b.id === 3001);
    assert.strictEqual(updatedBe.month_id, 102, 'El month_id recalculado debe ser 102 (de A)');

    // B actualiza su gasto extra propio
    res = await request(server, 'PUT', '/api/expenses/extra/6001', tokenB, {
      category_id: 2,
      date: '2026-01-05',
      concept: 'Cena B actualizada',
      amount: 65,
    });
    check('B PUT /api/expenses/extra/:id propio', res.status, 200);

    // A actualiza progreso de su reto
    res = await request(server, 'PUT', '/api/challenges/progress', tokenA, {
      monthChallengeId: 7001,
      day: 3,
      completed: true,
    });
    check('A PUT /api/challenges/progress propio', res.status, 200);

    // B elimina su año 2025 (id 21)
    res = await request(server, 'DELETE', '/api/years/21', tokenB);
    check('B DELETE /api/years/:id propio', res.status, 200);

    console.log(`\n🎉 Todas las ${passed} pruebas de propiedad y control de acceso pasaron exitosamente.`);
    process.exit(0);
  } finally {
    // Fin de pruebas
  }
}

runTests().catch((err) => {
  console.error('❌ Falló la suite de pruebas de propiedad:', err);
  process.exit(1);
});
