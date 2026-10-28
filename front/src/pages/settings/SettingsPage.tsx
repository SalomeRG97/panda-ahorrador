import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Category } from '../../types';
import { getAvatarUrl } from '../../config/environment';
import { ModalPortal } from '../../components/common/ModalPortal';

export const SettingsPage: React.FC = () => {
  const { currentUser, reloadProfile } = useAuth();
  const { success, error, warning, confirm } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'paymentMethods'>('profile');

  // Datos Perfil
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');

  // Contraseñas
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Categorías
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: '', color: '#F4A6C1', icon: '📦' });

  // Medios de pago
  const [paymentMethods, setPaymentMethods] = useState<{ id: number; name: string }[]>([]);
  const [showPmModal, setShowPmModal] = useState(false);
  const [editingPmId, setEditingPmId] = useState<number | null>(null);
  const [pmName, setPmName] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setUsername(currentUser.username);
      setEmail(currentUser.email);
    }
    loadCategories();
    loadPaymentMethods();
  }, [currentUser]);

  const loadPaymentMethods = () => {
    ApiService.getPaymentMethods().then(setPaymentMethods).catch(console.error);
  };

  const openPmModal = () => {
    setEditingPmId(null);
    setPmName('');
    setShowPmModal(true);
  };

  const editPaymentMethod = (pm: { id: number; name: string }) => {
    setEditingPmId(pm.id);
    setPmName(pm.name);
    setShowPmModal(true);
  };

  const savePaymentMethod = async () => {
    const trimmed = pmName.trim();
    if (!trimmed) {
      warning('Escribe el nombre del medio de pago');
      return;
    }
    try {
      if (editingPmId) {
        await ApiService.updatePaymentMethod(editingPmId, trimmed);
        success('Medio de pago actualizado (y sus gastos también) 💳');
      } else {
        await ApiService.createPaymentMethod(trimmed);
        success('Medio de pago creado 💳');
      }
      setShowPmModal(false);
      loadPaymentMethods();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar medio de pago');
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    const confirmed = await confirm('¿Eliminar este medio de pago de la lista? (Los gastos que ya lo usan no cambian)');
    if (!confirmed) return;
    try {
      await ApiService.deletePaymentMethod(id);
      success('Medio de pago eliminado');
      loadPaymentMethods();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al eliminar medio de pago');
    }
  };

  const loadCategories = () => {
    ApiService.getCategories().then(setCategories).catch(console.error);
  };

  const getRoleIcon = (role?: string): string => {
    switch (role) {
      case 'admin':
        return 'fa-shield-halved';
      case 'regular':
        return 'fa-user-pen';
      case 'viewer':
        return 'fa-eye';
      default:
        return 'fa-user';
    }
  };

  const passCriteria = {
    minLen: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[@$!%*?&.#_\-]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passCriteria).every(Boolean);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      await AuthService.updateProfile({ name, username, email });
      await reloadProfile();
      success('Perfil actualizado correctamente ✨');
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      warning('Las contraseñas nuevas no coinciden');
      return;
    }

    if (!isPasswordValid) {
      error('La nueva contraseña no cumple con los requisitos de seguridad');
      return;
    }

    setLoadingPassword(true);
    try {
      await AuthService.changePassword(oldPassword, newPassword);
      success('Contraseña actualizada con éxito 🔐');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      await AuthService.uploadAvatar(file);
      await reloadProfile();
      success('Foto de perfil actualizada 🖼️');
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al subir la imagen');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Categorías CRUD
  const openCatModal = () => {
    setEditingCatId(null);
    setCatForm({ name: '', color: '#F4A6C1', icon: '📦' });
    setShowCatModal(true);
  };

  const editCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, color: cat.color, icon: cat.icon });
    setShowCatModal(true);
  };

  const saveCategory = async () => {
    if (!catForm.name || !catForm.color || !catForm.icon) {
      warning('Por favor completa todos los campos de la categoría');
      return;
    }

    try {
      if (editingCatId) {
        await ApiService.updateCategory(editingCatId, catForm);
        success('Categoría actualizada 🌸');
      } else {
        await ApiService.createCategory(catForm);
        success('Categoría personal creada ✨');
      }
      setShowCatModal(false);
      loadCategories();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar categoría');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const confirmed = await confirm('¿Deseas eliminar esta categoría? (Los gastos asociados quedarán como <Sin Categorizar>)');
    if (!confirmed) return;

    try {
      await ApiService.deleteCategory(id);
      success('Categoría eliminada');
      loadCategories();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al eliminar categoría');
    }
  };

  return (
    <div className="settings-container animate-fade-in-up">
      <div className="header-section">
        <h1 className="chinese-title">个人设置</h1>
        <h2>Configuración de Cuenta & Categorías</h2>
        <p className="subtitle">Gestiona tu perfil, seguridad y personaliza tus categorías del Panda Ahorrador 🌸</p>
      </div>

      {/* PESTAÑAS DE CONFIGURACIÓN */}
      <div className="settings-tabs">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <i className="fa-solid fa-user-gear"></i> Perfil & Seguridad
        </button>
        <button className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
          <i className="fa-solid fa-tags"></i> Categorías Personalizadas
        </button>
        <button className={`tab-btn ${activeTab === 'paymentMethods' ? 'active' : ''}`} onClick={() => setActiveTab('paymentMethods')}>
          <i className="fa-solid fa-credit-card"></i> Medios de Pago
        </button>
      </div>

      {/* TAB 1: PERFIL & SEGURIDAD */}
      {activeTab === 'profile' && (
        <div className="settings-grid">
          {/* 1. FOTO DE PERFIL / AVATAR */}
          <div className="card-pastel avatar-card">
            <h3><i className="fa-solid fa-camera"></i> Foto de Perfil</h3>
            <div className="avatar-wrapper">
              <img src={getAvatarUrl(currentUser?.avatarUrl)} alt="Avatar" className="profile-avatar" />
              <div className="avatar-badge">
                <i className={`fa-solid ${getRoleIcon(currentUser?.role)}`}></i> {currentUser?.role?.toUpperCase()}
              </div>
            </div>

            <div className="avatar-upload-actions">
              <label htmlFor="avatarInput" className="btn-pastel btn-secondary-pastel btn-sm">
                <i className="fa-solid fa-upload"></i> Cambiar Foto
              </label>
              <input
                type="file"
                id="avatarInput"
                onChange={handleFileSelected}
                accept="image/*"
                style={{ display: 'none' }}
              />
              {uploadingAvatar && (
                <span className="upload-status">
                  <i className="fa-solid fa-spinner fa-spin"></i> Subiendo...
                </span>
              )}
            </div>
          </div>

          {/* 2. DATOS DE PERFIL */}
          <div className="card-pastel profile-card">
            <h3><i className="fa-solid fa-user-pen"></i> Datos Personales</h3>
            <form onSubmit={handleUpdateProfile} className="settings-form">
              <div className="form-group">
                <label htmlFor="name">Nombre Completo</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">Nombre de Usuario</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <button type="submit" className="btn-pastel btn-primary-pastel" disabled={loadingProfile}>
                {loadingProfile ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Guardando...</>
                ) : (
                  <><i className="fa-solid fa-floppy-disk"></i> Guardar Cambios</>
                )}
              </button>
            </form>
          </div>

          {/* 3. CAMBIO DE CONTRASEÑA */}
          <div className="card-pastel password-card" style={{ gridColumn: '1 / -1' }}>
            <h3><i className="fa-solid fa-key"></i> Seguridad</h3>
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="form-group">
                <label htmlFor="oldPassword">Contraseña Actual</label>
                <input
                  type="password"
                  id="oldPassword"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nueva Contraseña Segura</label>
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
                      <i className={`fa-solid ${passCriteria.upper ? 'fa-check' : 'fa-xmark'}`}></i> Una mayúscula
                    </li>
                    <li className={passCriteria.lower ? 'valid' : ''}>
                      <i className={`fa-solid ${passCriteria.lower ? 'fa-check' : 'fa-xmark'}`}></i> Una minúscula
                    </li>
                    <li className={passCriteria.number ? 'valid' : ''}>
                      <i className={`fa-solid ${passCriteria.number ? 'fa-check' : 'fa-xmark'}`}></i> Un número
                    </li>
                    <li className={passCriteria.special ? 'valid' : ''}>
                      <i className={`fa-solid ${passCriteria.special ? 'fa-check' : 'fa-xmark'}`}></i> Un carácter especial
                    </li>
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="form-control"
                />
              </div>

              <button
                type="submit"
                className="btn-pastel btn-secondary-pastel"
                disabled={loadingPassword || (newPassword.length > 0 && !isPasswordValid)}
              >
                {loadingPassword ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Actualizando...</>
                ) : (
                  <><i className="fa-solid fa-lock"></i> Actualizar Contraseña</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: GESTIÓN DE CATEGORÍAS PERSONALIZADAS */}
      {activeTab === 'categories' && (
        <div className="card-pastel category-section">
          <div className="category-header">
            <div>
              <h3>Mis Categorías</h3>
              <p className="subtitle">Personaliza colores, nombres e iconos de tus categorías o crea tus propias categorías adicionales.</p>
            </div>
            <button onClick={openCatModal} className="btn-pastel btn-primary-pastel">
              <i className="fa-solid fa-plus"></i> Nueva Categoría
            </button>
          </div>

          <div className="categories-grid">
            {categories.map((cat) => (
              <div key={cat.id} className="category-card card-pastel" style={{ borderLeft: `6px solid ${cat.color}` }}>
                <div className="cat-card-top">
                  <span className="cat-icon-badge">{cat.icon}</span>
                  <div className="cat-info">
                    <h4>{cat.name}</h4>
                    <span className={`cat-badge ${cat.isGlobal ? 'global' : ''}`}>
                      {cat.isGlobal ? 'Predeterminada' : 'Personal'}
                    </span>
                  </div>
                </div>
                <div className="cat-card-actions">
                  <button onClick={() => editCategory(cat)} className="btn-pastel btn-secondary-pastel btn-xs">
                    <i className="fa-solid fa-pen"></i> Editar
                  </button>
                  {cat.isGlobal ? (
                    <button
                      className="btn-icon-danger btn-xs"
                      disabled
                      style={{ opacity: 0.4, cursor: 'not-allowed' }}
                      title="Las categorías predeterminadas del sistema no se pueden eliminar"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="btn-icon-danger btn-xs"
                      title="Eliminar categoría personal"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MEDIOS DE PAGO */}
      {activeTab === 'paymentMethods' && (
        <div className="card-pastel category-section">
          <div className="category-header">
            <div>
              <h3>Mis Medios de Pago</h3>
              <p className="subtitle">
                Estos aparecerán en la lista desplegable al registrar gastos. Si cambias un nombre, se actualiza en todos tus gastos.
              </p>
            </div>
            <button onClick={openPmModal} className="btn-pastel btn-primary-pastel">
              <i className="fa-solid fa-plus"></i> Nuevo Medio de Pago
            </button>
          </div>

          <div className="categories-grid">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="category-card card-pastel" style={{ borderLeft: '6px solid #A8D8EA' }}>
                <div className="cat-card-top">
                  <span className="cat-icon-badge">💳</span>
                  <div className="cat-info">
                    <h4>{pm.name}</h4>
                  </div>
                </div>
                <div className="cat-card-actions">
                  <button onClick={() => editPaymentMethod(pm)} className="btn-pastel btn-secondary-pastel btn-xs">
                    <i className="fa-solid fa-pen"></i> Editar
                  </button>
                  <button onClick={() => handleDeletePaymentMethod(pm.id)} className="btn-icon-danger btn-xs" title="Eliminar">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
            <div className="category-card card-pastel" style={{ borderLeft: '6px solid #FFE5A0', opacity: 0.85 }}>
              <div className="cat-card-top">
                <span className="cat-icon-badge">💰</span>
                <div className="cat-info">
                  <h4>Retiro de Ahorros</h4>
                  <span className="cat-badge global">Del sistema</span>
                </div>
              </div>
              <p className="subtitle" style={{ margin: 0 }}>Siempre disponible: descuenta el gasto de tus ahorros.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MEDIO DE PAGO */}
      {showPmModal && (
        <ModalPortal isOpen={showPmModal}>
          <div className="modal-overlay" onClick={() => setShowPmModal(false)}>
            <div className="modal-card card-pastel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingPmId ? '💳 Editar Medio de Pago' : '💳 Nuevo Medio de Pago'}</h3>
                <button onClick={() => setShowPmModal(false)} className="close-btn">&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    value={pmName}
                    maxLength={50}
                    onChange={(e) => setPmName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePaymentMethod()}
                    placeholder="Ej: Visa, Efectivo, Nequi"
                    className="form-control"
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowPmModal(false)} className="btn-pastel btn-secondary-pastel">
                  Cancelar
                </button>
                <button onClick={savePaymentMethod} className="btn-pastel btn-primary-pastel">
                  <i className="fa-solid fa-check"></i> Guardar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CREAR/EDITAR CATEGORÍA */}
      {showCatModal && (
        <ModalPortal isOpen={showCatModal}>
          <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
            <div className="modal-card card-pastel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingCatId ? '🌸 Editar Categoría' : '🌸 Crear Categoría Personal'}</h3>
                <button onClick={() => setShowCatModal(false)} className="close-btn">&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre de la Categoría:</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    placeholder="Ej: Suscripciones, Educación"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Icono / Emoji:</label>
                  <div className="emoji-picker-row">
                    <input
                      type="text"
                      value={catForm.icon}
                      onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                      maxLength={4}
                      placeholder="Ej: 📺"
                      className="form-control emoji-input"
                    />
                    <div className="emoji-shortcuts">
                      {['📺', '📚', '🎮', '✈️', '💊', '🛍️', '☕', '🏋️'].map((emoji) => (
                        <span key={emoji} onClick={() => setCatForm({ ...catForm, icon: emoji })}>
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Color representativo:</label>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={catForm.color}
                      onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                      className="color-picker-input"
                    />
                    <input
                      type="text"
                      value={catForm.color}
                      onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                      className="form-control hex-input"
                      placeholder="#F4A6C1"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowCatModal(false)} className="btn-pastel btn-secondary-pastel">
                  Cancelar
                </button>
                <button onClick={saveCategory} className="btn-pastel btn-primary-pastel">
                  <i className="fa-solid fa-check"></i> Guardar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
        .settings-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        .header-section {
          text-align: center;
          margin-bottom: 20px;
        }
        .chinese-title {
          font-size: 2rem;
          color: var(--accent-red);
          margin: 0;
        }
        h2 {
          font-size: 1.5rem;
          color: var(--text-dark);
          margin-top: 2px;
        }
        .subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        
        .settings-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          justify-content: center;
        }
        .tab-btn {
          padding: 10px 20px;
          border-radius: 12px;
          border: 1.5px solid #F4A6C1;
          background: #FFF0F4;
          color: #665275;
          font-family: var(--font-body);
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
        }
        .tab-btn.active, .tab-btn:hover {
          background: var(--accent-red);
          color: white;
          border-color: var(--accent-red);
          box-shadow: 0 4px 14px rgba(212, 86, 106, 0.25);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
        }
        .avatar-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          height: fit-content;
        }
        .avatar-card h3 {
          font-size: 1.1rem;
          margin-bottom: 16px;
        }
        .avatar-wrapper {
          position: relative;
          margin-bottom: 16px;
        }
        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #F4A6C1;
          box-shadow: 0 6px 20px rgba(212, 86, 106, 0.2);
        }
        .avatar-badge {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent-red);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .avatar-upload-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .btn-sm { padding: 8px 16px; font-size: 0.85rem; }
        .upload-status { font-size: 0.8rem; color: var(--accent-red); }
        
        .profile-card, .password-card { padding: 24px; }
        .profile-card h3, .password-card h3 {
          font-size: 1.2rem;
          margin-bottom: 18px;
          color: var(--text-dark);
          border-bottom: 2px solid #FFF0F4;
          padding-bottom: 10px;
        }
        .settings-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-dark); }
        .form-control {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid #F4A6C1;
          background-color: #FFF0F4;
          font-family: var(--font-body);
          font-size: 0.9rem;
          outline: none;
          transition: all 0.3s ease;
        }
        .form-control:focus {
          border-color: var(--accent-red);
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(212, 86, 106, 0.15);
        }

        .strength-checklist {
          list-style: none;
          padding: 0;
          margin: 6px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.75rem;
          color: #9E9E9E;
        }
        .strength-checklist li { display: flex; align-items: center; gap: 6px; }
        .strength-checklist li.valid { color: #2E7D32; font-weight: 600; }

        .category-section { padding: 24px; }
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .category-card {
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          background: #FFFFFF;
        }
        .cat-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cat-icon-badge {
          font-size: 1.8rem;
          line-height: 1;
        }
        .cat-info h4 { margin: 0; font-size: 1rem; color: #4A3F55; }
        .cat-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 10px;
          background: #FFE5EC;
          color: #D4566A;
          font-weight: 600;
        }
        .cat-badge.global {
          background: #E8F5E9;
          color: #2E7D32;
        }
        .cat-card-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          align-items: center;
        }
        .btn-xs { padding: 4px 10px; font-size: 0.75rem; }
        .btn-icon-danger { background: none; border: none; color: #D4566A; cursor: pointer; }

        .emoji-picker-row { display: flex; flex-direction: column; gap: 8px; }
        .emoji-shortcuts { display: flex; gap: 8px; font-size: 1.3rem; cursor: pointer; }
        .emoji-shortcuts span:hover { transform: scale(1.2); transition: transform 0.2s; }
        .color-picker-row { display: flex; align-items: center; gap: 10px; }
        .color-picker-input { width: 44px; height: 44px; border: none; border-radius: 8px; cursor: pointer; }
        .hex-input { width: 120px; }

        .close-btn { background: none; border: none; font-size: 1.6rem; cursor: pointer; color: #888; }

        @media (max-width: 768px) {
          .settings-container { padding: 16px 12px; }
          .settings-grid { grid-template-columns: 1fr; }
          .settings-tabs { flex-wrap: wrap; }
          .tab-btn { flex: 1; min-width: 140px; justify-content: center; font-size: 0.85rem; padding: 8px 12px; }
          .categories-grid { grid-template-columns: 1fr; }
          .category-header { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
};
