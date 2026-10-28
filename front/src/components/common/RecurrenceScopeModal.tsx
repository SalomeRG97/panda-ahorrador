import React, { useState, useEffect } from 'react';
import { RecurrenceScope } from '../../types';
import { ModalPortal } from './ModalPortal';

interface Props {
  isOpen: boolean;
  action: 'edit' | 'delete';
  concept?: string;
  date?: string;
  onSelectScope: (scope: RecurrenceScope) => void;
  onCancel: () => void;
}

export const RecurrenceScopeModal: React.FC<Props> = ({
  isOpen,
  action,
  concept,
  date,
  onSelectScope,
  onCancel,
}) => {
  const [selectedScope, setSelectedScope] = useState<RecurrenceScope>('single');

  // Cada vez que se abre el modal, restablecer la selección por defecto a 'single' (como en Google Calendar)
  useEffect(() => {
    if (isOpen) {
      setSelectedScope('single');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDelete = action === 'delete';

  const handleConfirm = () => {
    onSelectScope(selectedScope);
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="google-modal-overlay" onClick={onCancel}>
        <div
          className="google-modal-card card-pastel"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rec-modal-title"
        >
        {/* TÍTULO ESTILO GOOGLE CALENDAR */}
        <h3 id="rec-modal-title" className="google-modal-title">
          {isDelete ? 'Eliminar gasto periódico' : 'Editar gasto periódico'}
        </h3>

        {/* DETALLE OPCIONAL DEL GASTO */}
        {concept && (
          <p className="google-modal-subtitle">
            {concept} {date ? `• ${date}` : ''}
          </p>
        )}

        {/* GRUPO DE OPCIONES DE RADIO (EXACTO A GOOGLE CALENDAR) */}
        <div className="google-radio-group" role="radiogroup">
          {/* OPCIÓN 1: ESTE GASTO */}
          <label
            className={`google-radio-row ${selectedScope === 'single' ? 'selected' : ''}`}
            onClick={() => setSelectedScope('single')}
          >
            <div className="google-radio-circle">
              {selectedScope === 'single' && <div className="google-radio-dot"></div>}
            </div>
            <span className="google-radio-label">Este gasto</span>
          </label>

          {/* OPCIÓN 2: ESTE GASTO Y LOS POSTERIORES */}
          <label
            className={`google-radio-row ${selectedScope === 'future' ? 'selected' : ''}`}
            onClick={() => setSelectedScope('future')}
          >
            <div className="google-radio-circle">
              {selectedScope === 'future' && <div className="google-radio-dot"></div>}
            </div>
            <span className="google-radio-label">Este gasto y los posteriores</span>
          </label>

          {/* OPCIÓN 3: TODOS LOS GASTOS */}
          <label
            className={`google-radio-row ${selectedScope === 'all' ? 'selected' : ''}`}
            onClick={() => setSelectedScope('all')}
          >
            <div className="google-radio-circle">
              {selectedScope === 'all' && <div className="google-radio-dot"></div>}
            </div>
            <span className="google-radio-label">Todos los gastos</span>
          </label>
        </div>

        {/* BOTONES DE ACCIÓN: CANCELAR Y ACEPTAR */}
        <div className="google-modal-actions">
          <button
            type="button"
            className="google-btn-text"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="google-btn-primary"
            onClick={handleConfirm}
          >
            Aceptar
          </button>
        </div>
      </div>

      <style>{`
        .google-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          background: rgba(30, 20, 35, 0.45);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          padding: 14px;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
          animation: gFadeIn 0.18s ease-out;
        }
        @keyframes gFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .google-modal-card {
          margin: auto;
          width: 100%;
          max-width: 380px;
          max-height: calc(100dvh - 28px);
          background: #FFFFFF;
          border-radius: 28px;
          box-shadow: 0 14px 38px rgba(74, 63, 85, 0.2), 0 4px 12px rgba(244, 166, 193, 0.3);
          border: 1.5px solid rgba(244, 166, 193, 0.7);
          padding: 24px 26px 20px 26px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          box-sizing: border-box;
          animation: gCardSlide 0.22s cubic-bezier(0.18, 0.9, 0.32, 1);
        }
        @keyframes gCardSlide {
          from { transform: translateY(14px) scale(0.96); }
          to { transform: translateY(0) scale(1); }
        }
        .google-modal-title {
          margin: 0 0 4px 0;
          font-family: 'Comfortaa', cursive, system-ui, -apple-system, sans-serif;
          font-size: 1.28rem;
          font-weight: 700;
          color: #2D2535;
          line-height: 1.3;
        }
        .google-modal-subtitle {
          margin: 0 0 14px 0;
          font-size: 0.82rem;
          color: #8C7B99;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .google-radio-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 12px 0 16px 0;
        }
        .google-radio-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease;
        }
        .google-radio-row:hover {
          background: #FFF0F4;
        }
        .google-radio-row.selected {
          background: rgba(255, 240, 244, 0.65);
        }
        .google-radio-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #8C7B99;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: border-color 0.18s ease;
        }
        .google-radio-row.selected .google-radio-circle {
          border-color: #D4566A;
        }
        .google-radio-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #D4566A;
          animation: gDotPop 0.15s ease-out;
        }
        @keyframes gDotPop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .google-radio-label {
          font-family: 'Comfortaa', cursive, system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          color: #3C3345;
          font-weight: 600;
        }
        .google-radio-row.selected .google-radio-label {
          color: #2D2535;
          font-weight: 700;
        }
        .google-modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }
        .google-btn-text {
          background: transparent;
          border: none;
          color: #D4566A;
          font-family: 'Comfortaa', cursive, system-ui, sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.18s ease;
        }
        .google-btn-text:hover {
          background: #FFF0F4;
        }
        .google-btn-primary {
          background: #D4566A;
          border: none;
          color: #FFFFFF;
          font-family: 'Comfortaa', cursive, system-ui, sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          padding: 8px 22px;
          border-radius: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(212, 86, 106, 0.3);
          transition: all 0.18s ease;
        }
        .google-btn-primary:hover {
          background: #C04257;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(212, 86, 106, 0.4);
        }
        .google-btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
      </div>
    </ModalPortal>
  );
};
