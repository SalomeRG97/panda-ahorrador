const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runNewMigrations() {
  console.log('🔄 Conectando a MySQL para nuevas migraciones...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('✅ Conexión establecida.');

    // 1. Migración Medio de Pago
    const sqlPaymentPath = path.join(__dirname, '../../database/add-payment-method.sql');
    if (fs.existsSync(sqlPaymentPath)) {
      const sqlPayment = fs.readFileSync(sqlPaymentPath, 'utf8');
      console.log('📜 Ejecutando add-payment-method.sql...');
      try {
        await connection.query(sqlPayment);
        console.log('✅ Columnas de medio de pago verificadas/creadas.');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ La columna payment_method ya existe en las tablas.');
        } else {
          console.error('⚠️ Detalle migración medio de pago:', err.message);
        }
      }
    }

    // 2. Migración Categorías Personalizadas
    const sqlCatPath = path.join(__dirname, '../../database/user-categories-migration.sql');
    if (fs.existsSync(sqlCatPath)) {
      const sqlCat = fs.readFileSync(sqlCatPath, 'utf8');
      console.log('📜 Ejecutando user-categories-migration.sql...');
      try {
        await connection.query(sqlCat);
        console.log('✅ Estructura de categorías por usuario verificada/actualizada.');
      } catch (err) {
        console.error('⚠️ Detalle migración categorías:', err.message);
      }
    }

    // 2c. Migración Permitir NULL en category_id
    console.log('📜 Actualizando columnas category_id a INT NULL...');
    try {
      await connection.query('ALTER TABLE budget_expenses MODIFY COLUMN category_id INT NULL');
      await connection.query('ALTER TABLE extra_expenses MODIFY COLUMN category_id INT NULL');
      console.log('✅ Columnas category_id actualizadas a INT NULL.');
    } catch (err) {
      console.error('⚠️ Detalle migración category_id NULL:', err.message);
    }

    // 3. Recalcular Semanas (Domingo a Sábado)
    console.log('🗓️ Verificando alineación de semanas (Domingo a Sábado)...');
    const { calculateWeeksForMonth } = require('../utils/date-helpers');
    const [months] = await connection.query('SELECT m.id, m.month_number, y.year FROM months m JOIN years y ON m.year_id = y.id');
    for (const m of months) {
      const newWeeks = calculateWeeksForMonth(m.year, m.month_number);
      const [existingWeeks] = await connection.query('SELECT * FROM weeks WHERE month_id = ? ORDER BY week_number ASC', [m.id]);
      for (const w of newWeeks) {
        const match = existingWeeks.find(ex => ex.week_number === w.week_number);
        if (match) {
          await connection.query('UPDATE weeks SET start_date = ?, end_date = ? WHERE id = ?', [w.start_date, w.end_date, match.id]);
        } else {
          await connection.query('INSERT INTO weeks (month_id, week_number, start_date, end_date) VALUES (?, ?, ?, ?)', [m.id, w.week_number, w.start_date, w.end_date]);
        }
      }
    }
    console.log('✅ Semanas alineadas de Domingo a Sábado.');

    // 4. Re-alinear week_id de gastos (budget_expenses y extra_expenses) según las nuevas fechas de semanas
    console.log('💰 Re-alineando week_id de gastos según las nuevas fechas de semanas...');
    const [allWeeks] = await connection.query('SELECT * FROM weeks');
    const findWeekId = (monthId, dateStr) => {
      const match = allWeeks.find(w => w.month_id === monthId && w.start_date <= dateStr && w.end_date >= dateStr);
      return match ? match.id : null;
    };

    const [bExpenses] = await connection.query('SELECT id, month_id, date, week_id FROM budget_expenses');
    let countB = 0;
    for (const be of bExpenses) {
      if (be.date) {
        const newWeekId = findWeekId(be.month_id, be.date);
        if (newWeekId && newWeekId !== be.week_id) {
          await connection.query('UPDATE budget_expenses SET week_id = ? WHERE id = ?', [newWeekId, be.id]);
          countB++;
        }
      }
    }

    const [eExpenses] = await connection.query('SELECT id, month_id, date, week_id FROM extra_expenses');
    let countE = 0;
    for (const ee of eExpenses) {
      if (ee.date) {
        const newWeekId = findWeekId(ee.month_id, ee.date);
        if (newWeekId && newWeekId !== ee.week_id) {
          await connection.query('UPDATE extra_expenses SET week_id = ? WHERE id = ?', [newWeekId, ee.id]);
          countE++;
        }
      }
    }
    console.log(`✅ Gastos re-alineados correctamente (Budget: ${countB}, Extra: ${countE}).`);

    console.log('🎉 Migraciones adicionales completadas exitosamente.');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
  } finally {
    await connection.end();
  }
}

runNewMigrations();
