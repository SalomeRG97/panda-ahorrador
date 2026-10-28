import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EmailService } from '../../services/email.service';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  const passCriteria = {
    minLen: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&.#_\-]/.test(password),
  };

  const isPasswordValid = Object.values(passCriteria).every(Boolean);

  const strengthPercent = () => {
    const count = Object.values(passCriteria).filter(Boolean).length;
    return (count / 5) * 100;
  };

  const strengthClass = () => {
    const pct = strengthPercent();
    if (pct <= 40) return 'strength-weak';
    if (pct <= 80) return 'strength-medium';
    return 'strength-strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) {
      warning('Por favor completa todos los campos');
      return;
    }

    if (!isPasswordValid) {
      error('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    setLoading(true);

    try {
      await register({ name, username, email, password });
      success('¡Registro exitoso! Te hemos enviado un correo de bienvenida 🌸');
      await EmailService.sendVerificationEmail(email, name);
      navigate('/');
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in-up">
      <div className="auth-card card-pastel">
        <div className="auth-header">
          <img src="/logo.png" alt="Panda Logo" className="auth-logo" />
          <h1 className="chinese-title">新用户注册</h1>
          <h2>Crear una Cuenta</h2>
          <p className="auth-subtitle">Comienza a organizar tus finanzas con el Panda 🐼</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name"><i className="fa-solid fa-user"></i> Nombre Completo</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Salomé Pérez"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username"><i className="fa-solid fa-at"></i> Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. salome_p"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email"><i className="fa-solid fa-envelope"></i> Correo Electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password"><i className="fa-solid fa-lock"></i> Contraseña Segura</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              className="form-control"
            />

            {password.length > 0 && (
              <>
                <div className="strength-bar-wrapper">
                  <div className={`strength-bar ${strengthClass()}`} style={{ width: `${strengthPercent()}%` }}></div>
                </div>
                <ul className="strength-checklist">
                  <li className={passCriteria.minLen ? 'valid' : ''}>
                    <i className={`fa-solid ${passCriteria.minLen ? 'fa-check' : 'fa-xmark'}`}></i> Mínimo 8 caracteres
                  </li>
                  <li className={passCriteria.upper ? 'valid' : ''}>
                    <i className={`fa-solid ${passCriteria.upper ? 'fa-check' : 'fa-xmark'}`}></i> Una letra mayúscula
                  </li>
                  <li className={passCriteria.lower ? 'valid' : ''}>
                    <i className={`fa-solid ${passCriteria.lower ? 'fa-check' : 'fa-xmark'}`}></i> Una letra minúscula
                  </li>
                  <li className={passCriteria.number ? 'valid' : ''}>
                    <i className={`fa-solid ${passCriteria.number ? 'fa-check' : 'fa-xmark'}`}></i> Un número
                  </li>
                  <li className={passCriteria.special ? 'valid' : ''}>
                    <i className={`fa-solid ${passCriteria.special ? 'fa-check' : 'fa-xmark'}`}></i> Un carácter especial (@$!%*?&.#_-)
                  </li>
                </ul>
              </>
            )}
          </div>

          <button type="submit" className="btn-pastel btn-primary-pastel w-100" disabled={loading || !isPasswordValid}>
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Registrando...</>
            ) : (
              <><i className="fa-solid fa-user-plus"></i> Registrarme</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>¿Ya tienes cuenta? <Link to="/login" className="link-pastel">Inicia sesión</Link></p>
        </div>
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
          margin-bottom: 20px;
        }
        .auth-logo {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          box-shadow: 0 4px 15px rgba(212, 86, 106, 0.25);
          margin-bottom: 10px;
        }
        .chinese-title {
          font-size: 1.7rem;
          color: var(--accent-red);
          margin: 0;
        }
        h2 {
          font-size: 1.3rem;
          color: var(--text-dark);
          margin-top: 4px;
        }
        .auth-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-dark);
        }
        .form-control {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid #F4A6C1;
          background-color: #FFF0F4;
          font-family: var(--font-body);
          font-size: 0.9rem;
          transition: all 0.3s ease;
          outline: none;
        }
        .form-control:focus {
          border-color: var(--accent-red);
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(212, 86, 106, 0.15);
        }
        .w-100 {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
        }
        .strength-bar-wrapper {
          height: 6px;
          background: #E0E0E0;
          border-radius: 3px;
          margin-top: 6px;
          overflow: hidden;
        }
        .strength-bar {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
        }
        .strength-weak { background-color: #E53935; }
        .strength-medium { background-color: #FB8C00; }
        .strength-strong { background-color: #43A047; }

        .strength-checklist {
          list-style: none;
          padding: 0;
          margin: 8px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 0.75rem;
          color: #9E9E9E;
        }
        .strength-checklist li {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .strength-checklist li.valid {
          color: #2E7D32;
          font-weight: 600;
        }

        .auth-footer {
          text-align: center;
          margin-top: 18px;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .link-pastel {
          color: var(--accent-red);
          font-weight: 600;
          text-decoration: none;
        }
        .link-pastel:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
