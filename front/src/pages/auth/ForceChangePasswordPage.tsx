import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/auth.service';

export const ForceChangePasswordPage: React.FC = () => {
  const { currentUser, isAuthenticated, updateUser, logout } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser.mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  const passCriteria = {
    minLen: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[@$!%*?&.#_\-]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passCriteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      warning('Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      warning('Las contraseñas nuevas no coinciden');
      return;
    }

    if (!isPasswordValid) {
      error('La nueva contraseña no cumple con los requisitos de seguridad');
      return;
    }

    setLoading(true);
    try {
      await AuthService.changePassword(oldPassword, newPassword);
      updateUser({ ...currentUser, mustChangePassword: false });
      success('Contraseña actualizada correctamente. ¡Bienvenido! 🌸');
      navigate('/', { replace: true });
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAndLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="auth-container animate-fade-in-up">
      <div className="auth-card card-pastel">
        <div className="auth-header">
          <img src="/logo.png" alt="Panda Logo" className="auth-logo" />
          <h1 className="chinese-title">修改密码</h1>
          <h2>Cambio de Contraseña Obligatorio</h2>
          <p className="auth-subtitle">
            Por seguridad, debes establecer una nueva contraseña personal antes de usar tu cuenta 🔐
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="oldPassword">
              <i className="fa-solid fa-key"></i> Contraseña Temporal / Actual
            </label>
            <input
              type="password"
              id="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Ingresa tu contraseña temporal"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">
              <i className="fa-solid fa-lock"></i> Nueva Contraseña Segura
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              className="form-control"
            />

            {newPassword.length > 0 && (
              <ul className="strength-checklist">
                <li className={passCriteria.minLen ? 'valid' : ''}>
                  <i className={`fa-solid ${passCriteria.minLen ? 'fa-check' : 'fa-xmark'}`}></i> Mínimo 8 caracteres
                </li>
                <li className={passCriteria.upper ? 'valid' : ''}>
                  <i className={`fa-solid ${passCriteria.upper ? 'fa-check' : 'fa-xmark'}`}></i> Al menos una mayúscula
                </li>
                <li className={passCriteria.lower ? 'valid' : ''}>
                  <i className={`fa-solid ${passCriteria.lower ? 'fa-check' : 'fa-xmark'}`}></i> Al menos una minúscula
                </li>
                <li className={passCriteria.number ? 'valid' : ''}>
                  <i className={`fa-solid ${passCriteria.number ? 'fa-check' : 'fa-xmark'}`}></i> Al menos un número
                </li>
                <li className={passCriteria.special ? 'valid' : ''}>
                  <i className={`fa-solid ${passCriteria.special ? 'fa-check' : 'fa-xmark'}`}></i> Al menos un carácter especial (@$!%*?&.#_-)
                </li>
              </ul>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <i className="fa-solid fa-check-double"></i> Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              required
              className="form-control"
            />
          </div>

          <button
            type="submit"
            className="btn-pastel btn-primary-pastel w-100"
            disabled={loading || (newPassword.length > 0 && !isPasswordValid)}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Guardando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-shield-halved"></i> Guardar Nueva Contraseña
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancelAndLogout}
            className="btn-pastel btn-secondary-pastel w-100"
            disabled={loading}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
          </button>
        </form>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 120px);
          padding: 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 32px 28px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .auth-logo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          box-shadow: 0 4px 15px rgba(212, 86, 106, 0.25);
          margin-bottom: 12px;
        }
        .chinese-title {
          font-size: 1.8rem;
          color: var(--accent-red);
          margin: 0;
        }
        h2 {
          font-size: 1.35rem;
          color: var(--text-dark);
          margin-top: 4px;
        }
        .auth-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-dark);
        }
        .form-control {
          padding: 12px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid #F4A6C1;
          background-color: #FFF0F4;
          font-family: var(--font-body);
          font-size: 0.95rem;
          transition: all 0.3s ease;
          outline: none;
        }
        .form-control:focus {
          border-color: var(--accent-red);
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(212, 86, 106, 0.15);
        }
        .strength-checklist {
          list-style: none;
          padding: 0;
          margin: 4px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 0.78rem;
          color: #C62828;
        }
        .strength-checklist li.valid {
          color: #2E7D32;
        }
        .w-100 {
          width: 100%;
          padding: 12px;
        }
      `}</style>
    </div>
  );
};

