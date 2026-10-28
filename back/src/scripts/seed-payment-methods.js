// Uso: node src/scripts/seed-payment-methods.js
// - Crea la tabla payment_methods si no existe
// - Agrega Visa, MasterCard, Débito Bancolombia y Addi al perfil de Salome Ruiz Gallego
// - Renombra el medio de pago "Ahorros" -> "Debito Bancolombia" en sus gastos existentes
const mysql = require('mysql2/promise');
require('dotenv').config();

const EMAIL = 'salomeruizgallego@gmail.com';
const METHODS = ['Visa', 'MasterCard', 'Debito Bancolombia', 'Addi'];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await conn.query(
      `CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_payment_method (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    const [users] = await conn.query('SELECT id, name FROM users WHERE email = ?', [EMAIL]);
    if (!users.length) {
      console.error(`❌ No existe usuario con correo ${EMAIL}`);
      return;
    }
    const userId = users[0].id;
    console.log(`👤 Usuario: ${users[0].name} (ID ${userId})`);

    for (const name of METHODS) {
      await conn.query('INSERT IGNORE INTO payment_methods (user_id, name) VALUES (?, ?)', [userId, name]);
    }
    console.log(`✅ Medios de pago: ${METHODS.join(', ')}`);

    for (const table of ['budget_expenses', 'extra_expenses']) {
      const [res] = await conn.query(
        `UPDATE ${table} e
         JOIN months m ON e.month_id = m.id
         JOIN years y ON m.year_id = y.id
         SET e.payment_method = 'Debito Bancolombia'
         WHERE y.user_id = ? AND LOWER(TRIM(e.payment_method)) = 'ahorros'`,
        [userId]
      );
      console.log(`🔁 ${table}: ${res.affectedRows} gastos "Ahorros" -> "Debito Bancolombia"`);
    }
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
