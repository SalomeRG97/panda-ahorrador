-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Migración 002: Cambio obligatorio de contraseña
-- Agrega la columna must_change_password a la tabla users
-- --------------------------------------------------------

SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'must_change_password'
);

SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

