import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/auth.service';
import { EmailService } from '../../services/email.service';
import { SharedOwner, SharedViewer } from '../../types';

import { getAvatarUrl } from '../../config/environment';

export const ShareManagementPage: React.FC = () => {
  const { currentUser, hasRole } = useAuth();
  const { success, error, confirm } = useToast();

  const [viewerEmail, setViewerEmail] = useState('');
  const [myViewers, setMyViewers] = useState<SharedViewer[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedOwner[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMyViewers = () => {
    AuthService.getSharedViewers()
      .then(setMyViewers)
      .catch((err) => error(err.response?.data?.message || 'Error al cargar observadores'));
  };

  const loadSharedWithMe = () => {
    AuthService.getSharedOwners()
      .then(setSharedWithMe)
      .catch((err) => error(err.response?.data?.message || 'Error al cargar accesos'));
  };

  useEffect(() => {
    if (hasRole('regular', 'admin')) {
      loadMyViewers();
    }
    if (hasRole('viewer')) {
      loadSharedWithMe();
    }
  }, []);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerEmail) return;

    setLoading(true);
    try {
      await AuthService.addViewerByEmail(viewerEmail);
      success('Acceso compartido exitosamente 🤝');

      const ownerName = currentUser?.name || 'Un usuario';
      await EmailService.sendViewerInvitation(viewerEmail, ownerName);

      setViewerEmail('');
      loadMyViewers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al compartir acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (viewerId: number) => {
    const confirmed = await confirm('¿Deseas revocar el acceso a este observador?');
    if (!confirmed) return;

    try {
      await AuthService.removeViewer(viewerId);
      success('Acceso revocado');
      loadMyViewers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al revocar acceso');
    }
  };

  return (
    <div className="share-container animate-fade-in-up">
      <div className="header-section">
        <h1 className="chinese-title">共享支出</h1>
        <h2>Compartir Información de Gastos</h2>
        <p className="subtitle">Permite que observadores (Viewers) tengan acceso en modo solo lectura a tus finanzas 🤝</p>
      </div>

      {/* SI ES REGULAR O ADMIN: COMPARTIR CON OTROS */}
      {hasRole('regular', 'admin') && (
        <>
          <div className="card-pastel share-card">
            <h3><i className="fa-solid fa-user-plus"></i> Invitar Observador (Viewer)</h3>
            <form onSubmit={handleShare} className="share-form">
              <div className="form-group">
                <label htmlFor="viewerEmail">Correo del usuario Viewer</label>
                <div className="input-with-button" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    id="viewerEmail"
                    value={viewerEmail}
                    onChange={(e) => setViewerEmail(e.target.value)}
                    placeholder="observador@correo.com"
                    required
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn-pastel btn-primary-pastel" disabled={loading}>
                    <i className="fa-solid fa-share-nodes"></i> Compartir
                  </button>
                </div>
                <span className="form-hint" style={{ fontSize: '0.8rem', color: '#888', marginTop: '6px', display: 'block' }}>
                  El usuario debe tener una cuenta registrada con el rol <strong>Viewer</strong>.
                </span>
              </div>
            </form>
          </div>

          <div className="card-pastel viewers-card">
            <h3><i className="fa-solid fa-users"></i> Personas con acceso a tus datos ({myViewers.length})</h3>
            {myViewers.length === 0 ? (
              <p className="empty-state">No has compartido tus datos con nadie aún.</p>
            ) : (
              <ul className="viewers-list">
                {myViewers.map((v) => (
                  <li key={v.id} className="viewer-item">
                    <div className="viewer-info">
                      <img src={getAvatarUrl(v.viewer_avatar)} alt="Avatar" className="avatar-small" />
                      <div>
                        <span className="name">{v.viewer_name}</span>
                        <span className="email">{v.viewer_email}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveShare(v.viewer_id)} className="btn-pastel btn-secondary-pastel btn-sm">
                      <i className="fa-solid fa-user-minus"></i> Revocar Acceso
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* SI ES VIEWER: MOSTRAR QUIÉNES LE COMPARTIERON */}
      {hasRole('viewer') && (
        <div className="card-pastel shared-with-me-card">
          <h3><i className="fa-solid fa-eye"></i> Datos compartidos contigo ({sharedWithMe.length})</h3>
          {sharedWithMe.length === 0 ? (
            <p className="empty-state">
              Nadie te ha compartido acceso aún. Pídele a un usuario Regular que te agregue por tu correo.
            </p>
          ) : (
            <ul className="viewers-list">
              {sharedWithMe.map((o) => (
                <li key={o.id} className="viewer-item">
                  <div className="viewer-info">
                    <img src={getAvatarUrl(o.owner_avatar)} alt="Avatar" className="avatar-small" />
                    <div>
                      <span className="name">{o.owner_name}</span>
                      <span className="email">{o.owner_email}</span>
                    </div>
                  </div>
                  <span className="badge-concept-ahorro badge-category">Acceso Solo Lectura</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .share-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        .header-section {
          text-align: center;
          margin-bottom: 24px;
        }
        .chinese-title {
          font-size: 2rem;
          color: var(--accent-red);
          margin: 0;
        }
        h2 {
          font-size: 1.5rem;
          color: var(--text-dark);
        }
        .subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .share-card, .viewers-card, .shared-with-me-card {
          padding: 24px;
          margin-bottom: 20px;
        }
        .share-card h3, .viewers-card h3, .shared-with-me-card h3 {
          font-size: 1.2rem;
          margin-bottom: 16px;
          color: var(--text-dark);
          border-bottom: 2px solid #FFF0F4;
          padding-bottom: 10px;
        }
        .form-control {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid #F4A6C1;
          background-color: #FFF0F4;
          font-family: var(--font-body);
          font-size: 0.9rem;
          outline: none;
        }
        .empty-state {
          text-align: center;
          padding: 1.5rem;
          color: #94a3b8;
          background: #f8fafc;
          border-radius: 10px;
          font-size: 0.9rem;
        }
        .viewers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          list-style: none;
          padding: 0;
        }
        .viewer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #FFF9FA;
          border-radius: 14px;
          border: 1px solid #F4A6C1;
        }
        .viewer-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar-small {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #F4A6C1;
        }
        .viewer-info div {
          display: flex;
          flex-direction: column;
        }
        .name {
          font-weight: 700;
          color: #4A3F55;
          font-size: 0.95rem;
        }
        .email {
          font-size: 0.8rem;
          color: #8C7B99;
        }
        @media (max-width: 600px) {
          .input-with-button { flex-direction: column; }
          .viewer-item { flex-direction: column; align-items: flex-start; gap: 10px; }
          .viewer-item button { align-self: flex-end; }
        }
      `}</style>
    </div>
  );
};
