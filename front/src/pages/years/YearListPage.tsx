import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../../services/api.service';
import { useToast } from '../../context/ToastContext';
import { Year } from '../../types';
import { ModalPortal } from '../../components/common/ModalPortal';

const monthOptions = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const YearListPage: React.FC = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newStartMonth, setNewStartMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const { success, error, warning, confirm } = useToast();

  const loadYears = () => {
    ApiService.getYears()
      .then(setYears)
      .catch((err) => error(err.response?.data?.message || 'Error al cargar lista de años'));
  };

  useEffect(() => {
    loadYears();
  }, []);

  const getMonthName = (monthNum: number): string => {
    const opt = monthOptions.find((o) => o.value === monthNum);
    return opt ? opt.label : '';
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear || !newStartMonth) {
      warning('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await ApiService.createYear(newYear, newStartMonth);
      success('Año presupuestal creado exitosamente 🌸');
      setShowModal(false);
      loadYears();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al crear el año');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteYear = async (id: number, yearNum: number) => {
    const confirmed = await confirm(`¿Estás segura de eliminar el año ${yearNum}? Se borrarán todos sus gastos e ingresos.`);
    if (!confirmed) return;

    try {
      await ApiService.deleteYear(id);
      success(`Año ${yearNum} eliminado`);
      loadYears();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al eliminar el año');
    }
  };

  return (
    <div className="years-container animate-fade-in-up">
      <div className="header-actions">
        <div>
          <h1 className="chinese-title">Mis Años — 年份</h1>
          <p className="subtitle">Gestiona tus planes de seguimiento financiero por cada año.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-pastel btn-primary-pastel">
          <i className="fa-solid fa-plus"></i> Crear Nuevo Año
        </button>
      </div>

      {/* GRID DE AÑOS */}
      {years.length > 0 ? (
        <div className="years-grid">
          {years.map((y) => (
            <div key={y.id} className="year-card card-pastel">
              <div className="year-header">
                <span className="year-number">{y.year}</span>
                <span className="year-badge">🌸 {getMonthName(y.start_month)} - {getMonthName(y.end_month)}</span>
              </div>
              <p className="year-info">
                <i className="fa-solid fa-calendar-check"></i> Meses creados: {y.end_month - y.start_month + 1}
              </p>
              <div className="year-actions">
                <Link to={`/years/${y.id}`} className="btn-pastel btn-primary-pastel btn-sm">
                  <i className="fa-solid fa-chart-line"></i> Abrir Dashboard
                </Link>
                <button onClick={() => handleDeleteYear(y.id, y.year)} className="btn-pastel btn-delete-sm" title="Eliminar año">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-card card-pastel">
          <div className="empty-icon">🏮</div>
          <h3>Aún no has creado ningún año</h3>
          <p>Haz clic en "Crear Nuevo Año" para comenzar a planificar tus finanzas desde el mes que prefieras.</p>
          <button onClick={() => setShowModal(true)} className="btn-pastel btn-primary-pastel">
            <i className="fa-solid fa-plus"></i> Crear Año Ahora
          </button>
        </div>
      )}

      {/* MODAL CREAR AÑO */}
      {showModal && (
        <ModalPortal isOpen={showModal}>
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-card card-pastel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🌸 Crear Nuevo Año — 新增年份</h3>
                <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
              </div>
              <form onSubmit={handleSaveYear}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Año (ej: 2026):</label>
                    <input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(parseInt(e.target.value) || newYear)}
                      className="form-input"
                      min="2020"
                      max="2100"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mes de inicio:</label>
                    <select
                      value={newStartMonth}
                      onChange={(e) => setNewStartMonth(parseInt(e.target.value))}
                      className="form-input"
                    >
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <small className="help-text">Se crearán automáticamente los meses desde este mes hasta Diciembre.</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-pastel btn-secondary-pastel">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-pastel btn-primary-pastel" disabled={loading}>
                    <i className="fa-solid fa-check"></i> {loading ? 'Creando...' : 'Crear Año'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
        .years-container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
        .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 16px; }
        .years-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .year-card { display: flex; flex-direction: column; gap: 16px; }
        .year-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
        .year-number { font-family: 'Caveat', cursive; font-size: 3rem; font-weight: 700; color: #D4566A; line-height: 1; }
        .year-badge { background: #FFF0F4; border: 1px solid #F4A6C1; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #4A3F55; white-space: nowrap; }
        .year-info { color: #665275; font-size: 0.95rem; margin: 0; }
        .year-actions { display: flex; align-items: center; gap: 10px; margin-top: auto; }
        .btn-sm { padding: 10px 14px; font-size: 0.88rem; flex: 1; justify-content: center; white-space: nowrap; }
        .btn-delete-sm { background: #FFE5EC; color: #D4566A; border: 1px solid #F4A6C1; width: 42px; height: 42px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 1rem; transition: background 0.2s ease; }
        .btn-delete-sm:hover { background: #D4566A; color: white; }
        .empty-card { text-align: center; padding: 50px 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .empty-icon { font-size: 3.5rem; }
        .close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #888; }
        .form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .form-input { padding: 10px; border-radius: 10px; border: 1.5px solid #F4A6C1; font-family: 'Comfortaa', cursive; outline: none; }
        .help-text { font-size: 0.8rem; color: #888; }

        @media (max-width: 600px) {
          .years-container { margin: 16px auto; padding: 0 12px; }
          .header-actions { flex-direction: column; text-align: center; }
          .years-grid { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>
    </div>
  );
};
