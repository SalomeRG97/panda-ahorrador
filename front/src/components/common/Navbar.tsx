import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../config/environment';
import { NotificationsModal, APP_NEWS_UPDATES } from './NotificationsModal';
import { ApiService } from '../../services/api.service';
import { PendingBudgetExpense } from '../../types';

export const Navbar: React.FC = () => {
  const { currentUser, isAuthenticated, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState<PendingBudgetExpense[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const loadPendingExpenses = () => {
    if (!isAuthenticated) return;
    setLoadingPending(true);
    ApiService.getPendingBudgetExpenses()
      .then((data) => setPendingExpenses(data || []))
      .catch((err) => console.error('Error al cargar gastos pendientes:', err))
      .finally(() => setLoadingPending(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPendingExpenses();
      const interval = setInterval(loadPendingExpenses, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const getUnreadNewsCount = (): number => {
    try {
      const stored = localStorage.getItem('panda_read_news_ids_v1');
      const readIds: string[] = stored ? JSON.parse(stored) : [];
      return APP_NEWS_UPDATES.filter((n) => !readIds.includes(n.id)).length;
    } catch {
      return 0;
    }
  };

  const unreadNewsCount = getUnreadNewsCount();
  const pendingCount = pendingExpenses.length;
  const totalBadgeCount = pendingCount + unreadNewsCount;

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Logo y Marca */}
        <Link to="/" className="brand-link" onClick={closeMobileMenu}>
          <img src="/logo.png" alt="Panda Logo" className="brand-logo" />
          <div className="brand-title">
            <span className="chinese-name">熊猫理财</span>
            <span className="spanish-name">El panda ahorrador</span>
          </div>
        </Link>

        {/* Acciones para Móvil */}
        <div className="mobile-header-actions">
          {isAuthenticated && (
            <button
              className="btn-notif-trigger mobile-notif"
              onClick={() => setNotifModalOpen(true)}
              title="Centro de Notificaciones"
              aria-label="Notificaciones"
            >
              <i className="fa-solid fa-bell"></i>
              {totalBadgeCount > 0 && (
                <span className="notif-counter-badge">
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              )}
            </button>
          )}

          {/* Botón Menú Móvil / Hamburguesa */}
          {isAuthenticated && (
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menú"
            >
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          )}
        </div>

        {/* Menú de Navegación Escritorio y Móvil */}
        {isAuthenticated ? (
          <div className={`nav-content-wrapper ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <nav className="nav-menu">
              <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <i className="fa-solid fa-house"></i> <span>Inicio</span>
              </NavLink>
              <NavLink to="/years" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <i className="fa-solid fa-calendar-days"></i> <span>Mis Años</span>
              </NavLink>

              {hasRole('regular', 'admin') && (
                <NavLink to="/share" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <i className="fa-solid fa-share-nodes"></i> <span>Compartir</span>
                </NavLink>
              )}

              {hasRole('admin') && (
                <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <i className="fa-solid fa-user-gear"></i> <span>Usuarios</span>
                </NavLink>
              )}
            </nav>

            {/* Perfil del usuario autenticado */}
            <div className="user-profile-menu">
              {/* Botón Notificaciones Desktop */}
              <button
                className="btn-notif-trigger desktop-notif"
                onClick={() => setNotifModalOpen(true)}
                title="Centro de Notificaciones"
                aria-label="Notificaciones"
              >
                <i className="fa-solid fa-bell"></i>
                {totalBadgeCount > 0 && (
                  <span className="notif-counter-badge">
                    {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                  </span>
                )}
              </button>

              <Link to="/settings" className="user-info-link" title="Ir a Configuración" onClick={closeMobileMenu}>
                <img src={getAvatarUrl(currentUser?.avatarUrl)} alt="User Avatar" className="user-avatar-img" />
                <div className="user-details">
                  <span className="user-display-name">{currentUser?.name}</span>
                  <span className={`user-role-badge badge-${currentUser?.role}`}>
                    {currentUser?.role?.toUpperCase()}
                  </span>
                </div>
              </Link>

              <NavLink to="/settings" className={({ isActive }) => `nav-item icon-only ${isActive ? 'active' : ''}`} title="Configuración" onClick={closeMobileMenu}>
                <i className="fa-solid fa-gear"></i>
                <span className="mobile-only-text">Configuración</span>
              </NavLink>

              <button onClick={handleLogout} className="btn-logout" title="Cerrar Sesión">
                <i className="fa-solid fa-right-from-bracket"></i>
                <span className="mobile-only-text">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="nav-item">
              <i className="fa-solid fa-right-to-bracket"></i> <span className="nav-text">Ingresar</span>
            </Link>
            <Link to="/register" className="btn-pastel btn-primary-pastel btn-sm">
              <i className="fa-solid fa-user-plus"></i> <span className="nav-text">Registrarse</span>
            </Link>
          </div>
        )}
      </div>

      <style>{`
        .navbar-header {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          border-bottom: 2px solid #F4A6C1;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 15px rgba(212, 86, 106, 0.08);
        }
        .navbar-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          position: relative;
        }
        .brand-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(212, 86, 106, 0.2);
          object-fit: cover;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }
        .brand-link:hover .brand-logo {
          transform: rotate(10deg) scale(1.08);
        }
        .brand-title {
          display: flex;
          flex-direction: column;
        }
        .chinese-name {
          font-family: 'Caveat', cursive;
          font-size: 1.6rem;
          font-weight: 700;
          color: #D4566A;
          line-height: 1;
        }
        .spanish-name {
          font-family: 'Comfortaa', cursive;
          font-size: 0.78rem;
          color: #4A3F55;
          font-weight: 600;
        }
        .nav-content-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-menu {
          display: flex;
          gap: 6px;
        }
        .nav-item {
          text-decoration: none;
          font-family: 'Comfortaa', cursive;
          font-weight: 600;
          color: #4A3F55;
          padding: 8px 12px;
          border-radius: 12px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
        }
        .nav-item:hover, .nav-item.active {
          background-color: #FFF0F4;
          color: #D4566A;
        }
        .icon-only {
          padding: 8px 10px;
        }
        .mobile-only-text {
          display: none;
        }
        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #FFF0F4;
          padding: 4px 8px 4px 4px;
          border-radius: 24px;
          border: 1px solid rgba(244, 166, 193, 0.5);
        }
        .user-info-link {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }
        .user-avatar-img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #D4566A;
        }
        .user-details {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .user-display-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-dark);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-role-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 8px;
          width: fit-content;
        }
        .badge-admin { background-color: #FFE5A0; color: #7A5200; }
        .badge-regular { background-color: #F4A6C1; color: white; }
        .badge-viewer { background-color: #A8D8EA; color: #1E4E63; }
        .btn-logout {
          background: none;
          border: none;
          color: #D4566A;
          font-size: 1rem;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-logout:hover {
          background-color: rgba(212, 86, 106, 0.15);
        }
        .auth-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-sm {
          padding: 6px 14px;
          font-size: 0.85rem;
        }
        .mobile-toggle-btn {
          display: none;
          background: #FFF0F4;
          border: 1.5px solid #F4A6C1;
          color: #D4566A;
          font-size: 1.2rem;
          padding: 8px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        /* RESPONSIVE TABLETS & CELULARES */
        @media (max-width: 768px) {
          .mobile-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .nav-content-wrapper {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #FFFFFF;
            border-bottom: 2px solid #F4A6C1;
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
            gap: 16px;
            box-shadow: 0 10px 25px rgba(212, 86, 106, 0.15);
            display: none;
          }
          .nav-content-wrapper.mobile-open {
            display: flex;
            animation: slideDown 0.25s ease-out forwards;
          }
          .nav-menu {
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .nav-item {
            padding: 12px 16px;
            font-size: 1rem;
            border-radius: 14px;
          }
          .user-profile-menu {
            flex-direction: column;
            align-items: stretch;
            border-radius: 16px;
            padding: 12px;
            gap: 10px;
          }
          .user-info-link {
            padding: 6px;
          }
          .user-details {
            display: flex;
          }
          .mobile-only-text {
            display: inline;
            font-size: 0.95rem;
            font-weight: 600;
          }
          .btn-logout {
            justify-content: center;
            padding: 10px;
            background-color: #FFE5EC;
            border-radius: 12px;
          }
          .desktop-notif { display: none !important; }
          .mobile-notif { display: flex !important; }
        }

        .mobile-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-notif-trigger {
          position: relative;
          background: #FFF0F4;
          border: 1.5px solid #F4A6C1;
          color: #D4566A;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }

        .btn-notif-trigger:hover {
          background: #D4566A;
          color: #FFFFFF;
          border-color: #D4566A;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(212, 86, 106, 0.25);
        }

        .btn-notif-trigger:hover i {
          animation: ringBell 0.4s ease;
        }

        .mobile-notif {
          display: none;
        }

        .desktop-notif {
          display: flex;
        }

        .notif-counter-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #D4566A;
          color: #FFFFFF;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 10px;
          border: 2px solid #FFFFFF;
          min-width: 18px;
          text-align: center;
          line-height: 1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        @keyframes ringBell {
          0% { transform: rotate(0); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          60% { transform: rotate(10deg); }
          80% { transform: rotate(-5deg); }
          100% { transform: rotate(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* MODAL / DRAWER DE NOTIFICACIONES */}
      <NotificationsModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        pendingExpenses={pendingExpenses}
        loadingPending={loadingPending}
        onRefreshPending={loadPendingExpenses}
      />
    </header>
  );
};
