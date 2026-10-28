-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Auth Migration
-- Agrega tablas de autenticación y columna user_id a years
-- --------------------------------------------------------

-- 1. Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

-- Seed de roles
INSERT INTO roles (name) VALUES ('admin'), ('regular'), ('viewer')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2. Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL DEFAULT 2,
    avatar_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. Tabla de compartir datos (Regular -> Viewer)
CREATE TABLE IF NOT EXISTS user_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    viewer_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_share (owner_id, viewer_id)
);

-- 4. Agregar columna user_id a years (si no existe)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'years' AND COLUMN_NAME = 'user_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE years ADD COLUMN user_id INT DEFAULT NULL, ADD INDEX idx_years_user_id (user_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Crear usuario admin inicial (contraseña: Admin123!)
-- El hash se genera con bcrypt en el script de migración JS
-- Aquí solo preparamos la estructura

-- 6. Agregar FK de years.user_id -> users.id (se hace después de crear el admin)
