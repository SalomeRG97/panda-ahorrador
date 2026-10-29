const fs = require('fs');
const path = require('path');
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const multer = require('multer');

// Configurar entorno de prueba antes de cargar app
process.env.NODE_ENV = 'production';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-1234567890';

const db = require('../config/database');
db.query = async () => [[], []];

const authRepository = require('../repositories/auth.repository');
const logger = require('../config/logger');

// Stub de base de datos para no requerir MySQL activo durante el test HTTP
authRepository.findUserByEmail = async (email) => {
  if (email === 'sqlerror@dominio.com') {
    const sqlErr = new Error("ER_SYNTAX_ERROR: You have an error in your SQL syntax near 'FROM users'");
    sqlErr.code = 'ER_SYNTAX_ERROR';
    throw sqlErr;
  }
  return null; // Simula usuario no encontrado -> 401 Credenciales inválidas
};

const app = require('../app');
const errorHandler = require('../middlewares/error-handler.middleware');

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

async function runTests() {
  console.log('=== Verificando Fase 1 Prompt 5 (Seguridad Base) ===');

  // 1. Verificar que no existan `throw {` en back/src
  const scanDir = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'scripts') scanDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(
          !/throw\s*\{/.test(content),
          `Se encontró 'throw {' sin migrar en ${fullPath}`
        );
      }
    }
  };
  scanDir(path.join(__dirname, '..'));
  console.log('✔ 1. Todos los throw { statusCode, message } fueron reemplazados por AppError.');

  // 2. Verificar enmascaramiento de email
  assert.strictEqual(logger.maskEmail('juan.perez@dominio.com'), 'j***@dominio.com');
  assert.strictEqual(
    logger.maskEmailsInText('Login de maria@empresa.co exitoso'),
    'Login de m***@empresa.co exitoso'
  );
  console.log('✔ 2. Enmascaramiento de emails funciona correctamente (j***@dominio.com).');

  // 3. Cabeceras de Helmet y X-Request-Id
  const res1 = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'X-Request-Id': 'custom-req-123' },
    body: { email: 'Juan@Dominio.com', password: 'wrong' },
  });

  assert.strictEqual(res1.status, 401);
  assert.strictEqual(res1.headers['x-request-id'], 'custom-req-123');
  assert.strictEqual(res1.headers['x-content-type-options'], 'nosniff');
  assert(res1.headers['x-frame-options'] || res1.headers['content-security-policy'], 'Faltan cabeceras de Helmet');
  assert.strictEqual(res1.body.message, 'Credenciales inválidas');
  assert.strictEqual(res1.body.error, undefined, 'No debe exponer stack cuando NODE_ENV !== development');
  console.log('✔ 3. Cabeceras de Helmet, propagación de X-Request-Id y AppError < 500 verificados.');

  // 4. Rate limit en /api/auth/login: 5 intentos por 15 min por IP+email (case-insensitive)
  for (let i = 2; i <= 5; i++) {
    const r = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: i % 2 === 0 ? 'juan@dominio.com' : 'JUAN@DOMINIO.COM', password: 'wrong' },
    });
    assert.strictEqual(r.status, 401, `Intento ${i} debería devolver 401, devolvió ${r.status}`);
  }

  // Sexto intento seguido con el mismo email -> 429
  const res6 = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'juan@dominio.com', password: 'wrong' },
  });
  assert.strictEqual(res6.status, 429, `El 6to intento debía devolver 429, devolvió ${res6.status}`);
  assert.strictEqual(res6.body.success, false);
  assert.strictEqual(res6.body.message, 'Demasiados intentos, intenta más tarde');

  // Con otro email desde la misma IP sigue permitiendo (porque es IP+email)
  const resOtherEmail = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'otro@dominio.com', password: 'wrong' },
  });
  assert.strictEqual(resOtherEmail.status, 401);
  console.log('✔ 4. Sexto login fallido seguido devuelve 429 con el mensaje esperado (por IP+email en minúsculas).');

  // 5. Error SQL forzado devuelve 500 con mensaje genérico y requestId (sin filtrar SQL ni stack)
  const resSql = await request(app, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'sqlerror@dominio.com', password: 'secret' },
  });
  assert.strictEqual(resSql.status, 500);
  assert.strictEqual(resSql.body.success, false);
  assert.strictEqual(resSql.body.message, 'Error interno del servidor');
  assert(typeof resSql.body.requestId === 'string' && resSql.body.requestId.length > 0, 'Falta requestId en respuesta 500');
  assert.strictEqual(resSql.headers['x-request-id'], resSql.body.requestId);
  assert.strictEqual(resSql.body.error, undefined, 'Nunca debe enviar stack en producción');
  assert(!JSON.stringify(resSql.body).includes('ER_SYNTAX_ERROR'), 'No debe filtrar detalles SQL al cliente');
  console.log('✔ 5. Error SQL forzado devuelve mensaje genérico "Error interno del servidor" + requestId sin stack.');

  // 6. Errores de Multer (LIMIT_FILE_SIZE -> 400) y CORS (-> 403)
  let multerStatus = null;
  let multerBody = null;
  const mockReq = {
    id: 'req-multer-1',
    method: 'POST',
    originalUrl: '/api/profile/avatar',
    headers: {},
  };
  const mockRes = {
    headersSent: false,
    setHeader() {},
    status(code) {
      multerStatus = code;
      return this;
    },
    json(payload) {
      multerBody = payload;
      return this;
    },
  };
  errorHandler(new multer.MulterError('LIMIT_FILE_SIZE'), mockReq, mockRes, () => {});
  assert.strictEqual(multerStatus, 400);
  assert.strictEqual(multerBody.success, false);
  assert.strictEqual(multerBody.requestId, 'req-multer-1');

  const resCors = await request(app, {
    method: 'GET',
    path: '/api/health',
    headers: { Origin: 'https://sitio-malicioso.example.com' },
  });
  assert.strictEqual(resCors.status, 403);
  assert.strictEqual(resCors.body.success, false);
  console.log('✔ 6. Errores de Multer (LIMIT_FILE_SIZE -> 400) y CORS (-> 403) manejados correctamente.');

  console.log('\n🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Falló la verificación:', err);
  process.exit(1);
});
