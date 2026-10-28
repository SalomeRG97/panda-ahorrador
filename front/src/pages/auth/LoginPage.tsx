import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      warning('Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      success('¡Bienvenido de nuevo! 🌸');
      navigate(from, { replace: true });
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in-up">
      <div className="auth-card card-pastel">
        <div className="auth-header">
          <img src="/logo.png" alt="Panda Logo" className="auth-logo" />
          <h1 className="chinese-title">欢迎登录</h1>
          <h2>Iniciar Sesión</h2>
          <p className="auth-subtitle">El panda ahorrador te da la bienvenida 🌸</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
            <label htmlFor="password"><i className="fa-solid fa-lock"></i> Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="form-control"
            />
          </div>

          <button type="submit" className="btn-pastel btn-primary-pastel w-100" disabled={loading}>
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Entrando...</>
            ) : (
              <><i className="fa-solid fa-right-to-bracket"></i> Ingresar</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>¿No tienes una cuenta? <Link to="/register" className="link-pastel">Regístrate aquí</Link></p>
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
          max-width: 420px;
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
          font-size: 1.4rem;
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
          gap: 18px;
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
        .w-100 {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
        }
        .auth-footer {
          text-align: center;
          margin-top: 20px;
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
