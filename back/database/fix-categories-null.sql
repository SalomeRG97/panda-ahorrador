-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Migración: Permitir NULL en category_id
-- Permite que los gastos queden <Sin Categorizar> cuando su categoría es eliminada
-- --------------------------------------------------------

ALTER TABLE budget_expenses MODIFY COLUMN category_id INT NULL;
ALTER TABLE extra_expenses MODIFY COLUMN category_id INT NULL;
