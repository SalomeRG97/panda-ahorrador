-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Migración: Fix Unique Key on years
-- Reemplaza el índice único global de 'year' por una clave única compuesta (user_id, year)
-- --------------------------------------------------------

SET @idx_year = (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'years' AND COLUMN_NAME = 'year' AND NON_UNIQUE = 0 AND INDEX_NAME != 'uq_user_year' LIMIT 1);

SET @sql_drop = IF(@idx_year IS NOT NULL, 
    CONCAT('ALTER TABLE years DROP INDEX `', @idx_year, '`'), 
    'SELECT 1');
PREPARE stmt_drop FROM @sql_drop;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

SET @uq_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'years' AND INDEX_NAME = 'uq_user_year');

SET @sql_add = IF(@uq_exists = 0, 
    'ALTER TABLE years ADD UNIQUE KEY uq_user_year (user_id, year)', 
    'SELECT 1');
PREPARE stmt_add FROM @sql_add;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;
