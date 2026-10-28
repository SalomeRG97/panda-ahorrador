-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Migración: Categorías personalizadas
-- Agrega soporte para categorías por usuario (Copy-on-Write)
-- --------------------------------------------------------

-- 1. Agregar columna user_id a categories (NULL = global/semilla)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'user_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE categories ADD COLUMN user_id INT DEFAULT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Eliminar la restricción UNIQUE actual de name (si existe)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME = 'name');

SET @sql2 = IF(@idx_exists > 0, 
    'ALTER TABLE categories DROP INDEX name',
    'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. Agregar clave única compuesta (name + user_id) para permitir 
--    que diferentes usuarios tengan categorías con el mismo nombre
-- Nota: MySQL trata NULL como distinto en índices UNIQUE, así que
-- las categorías globales (user_id = NULL) y personales coexisten bien.
ALTER TABLE categories ADD UNIQUE KEY uq_cat_name_user (name, user_id);
