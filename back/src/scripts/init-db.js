const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
  console.log('🔄 Conectando a CleverCloud MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('✅ Conexión establecida exitosamente.');
    const sqlPath = path.join(__dirname, '../../database/schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📜 Ejecutando script schema.sql...');
    await connection.query(sqlContent);
    console.log('🎉 Base de datos inicializada correctamente con tablas y semillas (categorías y 15 retos).');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  } finally {
    await connection.end();
  }
}

initDB();
