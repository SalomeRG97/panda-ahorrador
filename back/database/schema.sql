-- --------------------------------------------------------
-- 熊猫理财 El panda ahorrador - Schema MySQL CleverCloud
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(10) NOT NULL,
    icon VARCHAR(30) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS years (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL UNIQUE,
    start_month INT NOT NULL DEFAULT 1,
    end_month INT NOT NULL DEFAULT 12,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS months (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year_id INT NOT NULL,
    month_number INT NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE,
    UNIQUE KEY uq_year_month (year_id, month_number)
);

CREATE TABLE IF NOT EXISTS incomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL,
    date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL UNIQUE,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weeks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL,
    week_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
    UNIQUE KEY uq_month_week (month_id, week_number)
);

CREATE TABLE IF NOT EXISTS budget_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL,
    week_id INT,
    category_id INT NOT NULL,
    date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    budget_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    real_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS extra_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL,
    week_id INT,
    category_id INT NOT NULL,
    date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT '🐼'
);

CREATE TABLE IF NOT EXISTS month_challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL UNIQUE,
    challenge_id INT NOT NULL,
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS challenge_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month_challenge_id INT NOT NULL,
    day INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (month_challenge_id) REFERENCES month_challenges(id) ON DELETE CASCADE,
    UNIQUE KEY uq_challenge_day (month_challenge_id, day)
);

-- SEEDS: Categorías iniciales
INSERT INTO categories (name, color, icon) VALUES
('Hogar', '#F4A6C1', '🏠'),
('Alimentación', '#F7C59F', '🍽️'),
('Personal', '#C3AED6', '👤'),
('Entretenimiento', '#A8E6CF', '🎭'),
('Financiero', '#FFE5A0', '💰'),
('Transporte', '#A8D8EA', '🚗'),
('Mascotas', '#F8B4B4', '🐾'),
('Varios', '#B5EAD7', '📦')
ON DUPLICATE KEY UPDATE color=VALUES(color), icon=VALUES(icon);

-- SEEDS: Repertorio de 15 Retos Mensuales
INSERT INTO challenges (title, description, icon) VALUES
('🐜 No gastos hormiga', 'Evita realizar compras pequeñas e innecesarias (cafés de calle, snacks, golosinas, impusos).', '☕'),
('🍱 Cocina en casa', 'Prepara todas tus comidas en casa y evita pedir domicilios o comer en restaurantes.', '👩‍🍳'),
('🛍️ Semana sin compras', 'Dedica semanas enteras del mes a cero compras de artículos no esenciales.', '🚫'),
('💰 Alcancía digital', 'Redondea tus gastos cotidianos al siguiente mil y destina esa diferencia al ahorro.', '🪙'),
('📝 Registro perfecto', 'Registra absolutamente cada centavo gastado en el día sin olvidar ninguno.', '📜'),
('🚶 Transporte ecológico', 'Usa caminata, bicicleta o transporte público en lugar de taxis o auto.', '🚴'),
('🎭 Entretenimiento gratis', 'Disfruta solo de eventos, paseos y pasatiempos gratuitos este mes.', '🌸'),
('💡 Ahorro energético', 'Desconecta aparatos sin uso y optimiza el consumo de servicios públicos en casa.', '💡'),
('🏷️ Cazadora de ofertas', 'Realiza tus compras necesarias utilizando cupones, promociones y ofertas.', '🛒'),
('📵 Sin compras online', 'No navegues en plataformas de e-commerce ni compres nada por internet.', '📱'),
('🥗 Menú semanal estratégico', 'Planifica el menú semanal completo antes de ir al supermercado y cíñete a la lista.', '📋'),
('💪 Regla 50/30/20', 'Distribuye estrictamente tus ingresos: 50% necesidades, 30% gustos, 20% ahorro.', '⚖️'),
('🌿 Minimalismo consciente', 'Dona o vende un objeto personal antes de considerar comprar uno nuevo.', '🪴'),
('🍵 Ritual de té en casa', 'Sustituye salidas a cafeterías por reconfortantes momentos de té o café casero.', '🍵'),
('📦 Aprovecha lo que tienes', 'Utiliza todos los víveres de la despensa y cosméticos guardados antes de reponer.', '🏺')
ON DUPLICATE KEY UPDATE description=VALUES(description);
