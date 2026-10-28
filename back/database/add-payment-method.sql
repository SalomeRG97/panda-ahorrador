-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Migración: Medio de Pago
-- Agrega columna payment_method a budget_expenses y extra_expenses
-- --------------------------------------------------------

ALTER TABLE budget_expenses ADD COLUMN payment_method VARCHAR(100) DEFAULT '' AFTER real_amount;
ALTER TABLE extra_expenses ADD COLUMN payment_method VARCHAR(100) DEFAULT '' AFTER amount;
