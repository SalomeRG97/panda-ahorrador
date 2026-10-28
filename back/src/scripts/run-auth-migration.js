const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function runAuthMigration() {
  console.log('🔄 Conectando a MySQL para migración de autenticación...');
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

    // 1. Ejecutar SQL de migración
    const sqlPath = path.join(__dirname, '../../database/auth-migration.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📜 Ejecutando auth-migration.sql...');
    await connection.query(sqlContent);
    console.log('✅ Tablas de autenticación creadas correctamente.');

    // 2. Verificar si ya existe un admin
    const [existingAdmin] = await connection.query(
      "SELECT id FROM users WHERE email = 'admin@pandaahorrador.com'"
    );

    if (existingAdmin.length === 0) {
      // 3. Crear usuario admin con bcrypt
      const adminPassword = 'Admin123!';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

      const [adminRole] = await connection.query("SELECT id FROM roles WHERE name = 'admin'");
      const adminRoleId = adminRole[0].id;

      await connection.query(
        `INSERT INTO users (email, username, password_hash, name, role_id, is_active) 
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        ['admin@pandaahorrador.com', 'admin', passwordHash, 'Administrador', adminRoleId]
      );

      const [newAdmin] = await connection.query(
        "SELECT id FROM users WHERE email = 'admin@pandaahorrador.com'"
      );
      const adminId = newAdmin[0].id;

      console.log(`🐼 Usuario admin creado (ID: ${adminId}) - email: admin@pandaahorrador.com / pass: Admin123!`);

      // 4. Asignar datos existentes al admin
      const [existingYears] = await connection.query('SELECT id FROM years WHERE user_id IS NULL');
      if (existingYears.length > 0) {
        await connection.query('UPDATE years SET user_id = ? WHERE user_id IS NULL', [adminId]);
        console.log(`📊 ${existingYears.length} año(s) existente(s) asignado(s) al admin.`);
      }
    } else {
      console.log('ℹ️ El usuario admin ya existe, omitiendo creación.');
    }

    // 5. Agregar FK si no existe
    const [fkCheck] = await connection.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'years' 
      AND COLUMN_NAME = 'user_id' 
      AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (fkCheck[0].cnt === 0) {
      try {
        await connection.query(
          'ALTER TABLE years ADD CONSTRAINT fk_years_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
        );
        console.log('🔗 Foreign key years.user_id -> users.id creada.');
      } catch (fkError) {
        console.log('⚠️ No se pudo crear FK (puede que haya datos huérfanos):', fkError.message);
      }
    }

    console.log('🎉 Migración de autenticación completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await connection.end();
  }
}

runAuthMigration();
