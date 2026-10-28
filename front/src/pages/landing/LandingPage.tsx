import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../../services/api.service';
import { Category, TodayShortcuts } from '../../types';

export const LandingPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [shortcuts, setShortcuts] = useState<TodayShortcuts | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  useEffect(() => {
    ApiService.getCategories()
      .then(setCategories)
      .catch((err) => console.error('Error al cargar categorías:', err));

    ApiService.getTodayShortcuts()
      .then(setShortcuts)
      .catch((err) => console.error('Error al cargar accesos directos de hoy:', err));
  }, []);

  const toggleManual = () => {
    setIsManualOpen((prev) => !prev);
  };

  return (
    <div className="landing-container animate-fade-in-up">
      {/* WIDGETS DE ACCESO DIRECTO (SEGÚN LA FECHA DE HOY) */}
      <section className="shortcuts-section">
        <div className="shortcuts-header">
          <span className="shortcuts-title">⚡ Accesos Directos de Hoy</span>
          <span className="shortcuts-date">🌸 {shortcuts?.todayStr || 'Hoy'}</span>
        </div>

        <div className="shortcuts-grid">
          {/* WIDGET 1: AÑO ACTUAL */}
          <div className="shortcut-card card-pastel">
            <div className="shortcut-icon-wrapper bg-icon-year">📅</div>
            <div className="shortcut-info">
              <span className="shortcut-tag">Año {shortcuts?.currentYearNum}</span>
              <h3 className="shortcut-name">
                {shortcuts?.year ? `Año ${shortcuts.year.year}` : `Año ${shortcuts?.currentYearNum || ''}`}
              </h3>
              <p className="shortcut-desc">Dashboard Anual</p>
            </div>
            {shortcuts?.year ? (
              <Link to={`/years/${shortcuts.year.id}`} className="btn-pastel btn-primary-pastel btn-shortcut">
                Ir al Año <i className="fa-solid fa-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/years" className="btn-pastel btn-secondary-pastel btn-shortcut">
                Crear Año <i className="fa-solid fa-plus"></i>
              </Link>
            )}
          </div>

          {/* WIDGET 2: MES ACTUAL */}
          <div className="shortcut-card card-pastel">
            <div className="shortcut-icon-wrapper bg-icon-month">📆</div>
            <div className="shortcut-info">
              <span className="shortcut-tag">Mes Actual</span>
              <h3 className="shortcut-name">
                {shortcuts?.month ? shortcuts.month.month_name : 'Ver Mes'}
              </h3>
              <p className="shortcut-desc">Agenda Mensual</p>
            </div>
            {shortcuts?.year && shortcuts?.month ? (
              <Link to={`/years/${shortcuts.year.id}/months/${shortcuts.month.id}`} className="btn-pastel btn-primary-pastel btn-shortcut">
                Ir al Mes <i className="fa-solid fa-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/years" className="btn-pastel btn-secondary-pastel btn-shortcut">
                Ver Meses <i className="fa-solid fa-calendar"></i>
              </Link>
            )}
          </div>

          {/* WIDGET 3: SEMANA ACTUAL */}
          <div className="shortcut-card card-pastel">
            <div className="shortcut-icon-wrapper bg-icon-week">⏱️</div>
            <div className="shortcut-info">
              <span className="shortcut-tag">Semana Actual</span>
              <h3 className="shortcut-name">
                {shortcuts?.week ? `Semana ${shortcuts.week.week_number}` : 'Semana Actual'}
              </h3>
              <p className="shortcut-desc">
                {shortcuts?.week
                  ? `${shortcuts.week.start_date.substring(5, 10).replace('-', '/')} - ${shortcuts.week.end_date.substring(5, 10).replace('-', '/')}`
                  : 'Seguimiento Semanal'}
              </p>
            </div>
            {shortcuts?.year && shortcuts?.month && shortcuts?.week ? (
              <Link
                to={`/years/${shortcuts.year.id}/months/${shortcuts.month.id}/weeks/${shortcuts.week.id}`}
                className="btn-pastel btn-primary-pastel btn-shortcut"
              >
                Ir a Semana <i className="fa-solid fa-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/years" className="btn-pastel btn-secondary-pastel btn-shortcut">
                Ver Semana <i className="fa-solid fa-list-check"></i>
              </Link>
            )}
          </div>

          {/* WIDGET 4: RETO ACTUAL */}
          <div className="shortcut-card card-pastel">
            <div className="shortcut-icon-wrapper bg-icon-reto">🎯</div>
            <div className="shortcut-info">
              <span className="shortcut-tag">Reto Actual</span>
              <h3 className="shortcut-name">
                {shortcuts?.challenge ? `${shortcuts.challenge.icon} ${shortcuts.challenge.title}` : 'Reto del Mes'}
              </h3>
              <p className="shortcut-desc">Desafío de Ahorro</p>
            </div>
            {shortcuts?.year && shortcuts?.month ? (
              <Link
                to={`/years/${shortcuts.year.id}/months/${shortcuts.month.id}?tab=challenge`}
                className="btn-pastel btn-primary-pastel btn-shortcut"
              >
                Ir al Reto <i className="fa-solid fa-bullseye"></i>
              </Link>
            ) : (
              <Link to="/years" className="btn-pastel btn-secondary-pastel btn-shortcut">
                Ver Retos <i className="fa-solid fa-trophy"></i>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* HERO SECTION */}
      <section className="hero-card card-pastel">
        <div className="hero-content">
          <div className="hero-badge">
            <span>🌸 欢迎 - Bienvenido 🌸</span>
          </div>
          <h1 className="hero-title">
            <span className="chinese-title">熊猫理财</span>
            <span className="subtitle">El panda ahorrador</span>
          </h1>
          <p className="hero-description">
            Un espacio cálido, intuitivo y con armonía oriental para el seguimiento de tus finanzas anuales, 
            mes a mes, con retos interactivos y visuales diseñados en tonalidades pasteles.
          </p>
          <div className="hero-actions">
            <Link to="/years" className="btn-pastel btn-primary-pastel">
              <i className="fa-solid fa-calendar-plus"></i> Comenzar seguimiento
            </Link>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="/logo.png" alt="Panda Ahorrador Logo" className="hero-panda-img" />
        </div>
      </section>

      {/* CÓMO FUNCIONA (DESPLEGABLE TIPO MANUAL) */}
      <section className="manual-section">
        <button onClick={toggleManual} className="manual-toggle-btn card-pastel">
          <div className="manual-toggle-title">
            <span className="manual-icon">📖</span>
            <div>
              <h2>Manual de Uso — ¿Cómo funciona?</h2>
              <p className="manual-subtitle">Haz clic para desplegar o colapsar el manual interactivo de la app</p>
            </div>
          </div>
          <span className="manual-badge">
            {isManualOpen ? 'Ocultar Manual ▲' : 'Desplegar Manual ▼'}
          </span>
        </button>

        {isManualOpen && (
          <div className="manual-content card-pastel">
            {/* PASOS DE CÓMO FUNCIONA */}
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📅</div>
                <h3>1. Crea tu Año</h3>
                <p>Selecciona tu año de inicio y el mes de arranque (ej: Agosto). La app generará automáticamente tus meses hasta diciembre.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📆</div>
                <h3>2. Calendario & Presupuesto</h3>
                <p>Planifica tus gastos en el calendario mensual con etiquetas coloreadas por categoría. Cada gasto cuenta con un popup interactivo.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>3. Seguimiento Semanal & Gráficos</h3>
                <p>Monitorea el valor real gastado en cada semana, analiza gráficos por categoría y lleva el control exacto de tus ingresos y ahorros.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>4. Retos Interactivos</h3>
                <p>Supera cada mes un reto interactivo aleatorio (ej: "No gastos hormiga", "Cocina en casa") coloreando tus días de cumplimiento.</p>
              </div>
            </div>

            {/* CATEGORÍAS & COLORES PASTEL DENTRO DEL MANUAL */}
            <div className="categories-section" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px dashed #F4A6C1' }}>
              <div className="chinese-title-wrapper" style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h2>Categorías & Colores Pasteles</h2>
              </div>
              <p className="categories-subtitle">Cada categoría tiene un color único que te acompañará en calendarios, listas y gráficos:</p>

              <div className="categories-grid">
                {categories.map((cat) => (
                  <div key={cat.id} className="category-card" style={{ backgroundColor: cat.color }}>
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-name">{cat.name}</span>
                  </div>
                ))}
              </div>

              {/* NOTA EDITAR CATEGORÍAS EN CONFIGURACIÓN */}
              <div className="settings-notice-card card-pastel">
                <div className="notice-icon">⚙️</div>
                <div className="notice-text">
                  <strong>¿Quieres modificar o crear más categorías?</strong>
                  <p>Puedes editar los nombres, colores e iconos de tus categorías en cualquier momento desde la sección de <strong>Configuración</strong>.</p>
                </div>
                <Link to="/settings" className="btn-pastel btn-secondary-pastel btn-settings">
                  <i className="fa-solid fa-gear"></i> Ir a Configuración
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .landing-container {
          max-width: 1100px;
          margin: 20px auto;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        /* WIDGETS ACCESO DIRECTO */
        .shortcuts-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .shortcuts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px 12px;
        }
        .shortcuts-title {
          font-family: 'Comfortaa', cursive;
          font-size: clamp(1rem, 4vw, 1.15rem);
          font-weight: 700;
          color: #D4566A;
          margin: 0;
        }
        .shortcuts-date {
          font-size: 0.85rem;
          font-weight: 600;
          color: #665275;
          background: #FFF0F4;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid #F4A6C1;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 16px;
        }
        .shortcut-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
          border: 2px solid #F4A6C1;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          background: #FFFFFF;
        }
        .shortcut-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(212, 86, 106, 0.15);
        }
        .shortcut-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .bg-icon-year { background: #FFE5EC; }
        .bg-icon-month { background: #EAF6F0; }
        .bg-icon-week { background: #FFF9EB; }
        .bg-icon-reto { background: #F0F4FF; }

        .shortcut-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .shortcut-tag {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #D4566A;
        }
        .shortcut-name {
          margin: 0;
          font-size: 1.1rem;
          color: #4A3F55;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .shortcut-desc {
          margin: 0;
          font-size: 0.8rem;
          color: #8C7B99;
        }
        .btn-shortcut {
          margin-top: 4px;
          width: 100%;
          text-align: center;
          justify-content: center;
          font-size: 0.82rem;
          padding: 8px 12px;
        }

        /* HERO CARD */
        .hero-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          background: linear-gradient(135deg, #FFFFFF 0%, #FFF0F4 100%);
          border: 2px solid #F4A6C1;
          padding: 36px;
        }
        .hero-content { flex: 1; }
        .hero-badge {
          display: inline-block;
          background: #FFE5EC;
          color: #D4566A;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .hero-title { display: flex; flex-direction: column; margin-bottom: 16px; }
        .chinese-title { font-size: 3.2rem; color: #D4566A; line-height: 1; }
        .subtitle { font-size: 1.6rem; color: #4A3F55; }
        .hero-description { font-size: 1rem; color: #665275; margin-bottom: 24px; }
        .hero-panda-img {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          box-shadow: 0 10px 25px rgba(212, 86, 106, 0.2);
          object-fit: cover;
        }

        /* MANUAL SECCIÓN */
        .manual-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .manual-toggle-btn {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: #FFF0F4;
          border: 2px solid #F4A6C1;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .manual-toggle-btn:hover {
          background: #FFE5EC;
          transform: translateY(-2px);
        }
        .manual-toggle-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .manual-icon { font-size: 2.2rem; }
        .manual-toggle-title h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #D4566A;
          font-family: 'Comfortaa', cursive;
        }
        .manual-subtitle {
          margin: 2px 0 0 0;
          font-size: 0.85rem;
          color: #665275;
        }
        .manual-badge {
          background: #D4566A;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .manual-content {
          padding: 24px;
          background: #FFFFFF;
          border: 2px solid #F4A6C1;
          animation: fadeIn 0.3s ease;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .feature-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #FFF9FA;
          border-radius: 16px;
          border: 1px dashed #F4A6C1;
        }
        .feature-icon { font-size: 2.2rem; }

        /* CATEGORÍAS */
        .categories-subtitle { text-align: center; color: #665275; margin-bottom: 20px; }
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .category-card {
          padding: 16px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #333;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          transition: transform 0.2s ease;
        }
        .category-card:hover { transform: scale(1.05); }
        .category-icon { font-size: 1.8rem; }

        /* NOTA CONFIGURACIÓN */
        .settings-notice-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #FFF0F4;
          border: 1.5px solid #F4A6C1;
          margin-top: 10px;
        }
        .notice-icon { font-size: 2rem; }
        .notice-text { flex: 1; color: #4A3F55; font-size: 0.9rem; }
        .notice-text strong { color: #D4566A; }
        .notice-text p { margin: 4px 0 0 0; color: #665275; }
        .btn-settings { white-space: nowrap; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .hero-card { flex-direction: column; text-align: center; }
          .manual-toggle-btn { flex-direction: column; gap: 12px; text-align: center; }
          .manual-toggle-title { flex-direction: column; text-align: center; }
          .settings-notice-card { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
};
