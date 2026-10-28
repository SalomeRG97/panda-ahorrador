import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ModalPortal } from '../components/common/ModalPortal';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ConfirmOptions {
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ToastContextType {
  toasts: Toast[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  removeToast: (id: number) => void;
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  // Modal Confirm State
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTexts, setConfirmTexts] = useState({ confirm: 'Confirmar', cancel: 'Cancelar' });
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration: number) => {
    const id = ++counterRef.current;
    const toast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((message: string, duration = 4000) => {
    addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message: string, duration = 6000) => {
    addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration = 5000) => {
    addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message: string, duration = 4000) => {
    addToast(message, 'info', duration);
  }, [addToast]);

  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    setConfirmMessage(opts.message);
    setConfirmTexts({
      confirm: opts.confirmText || 'Confirmar',
      cancel: opts.cancelText || 'Cancelar',
    });
    setConfirmVisible(true);

    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
    });
  }, []);

  const handleResolveConfirm = (result: boolean) => {
    setConfirmVisible(false);
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, success, error, warning, info, removeToast, confirm }}>
      {children}

      {/* TOASTS FLOATING CONTAINER */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && <i className="fa-solid fa-circle-check"></i>}
              {toast.type === 'error' && <i className="fa-solid fa-circle-xmark"></i>}
              {toast.type === 'warning' && <i className="fa-solid fa-triangle-exclamation"></i>}
              {toast.type === 'info' && <i className="fa-solid fa-circle-info"></i>}
            </div>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* CONFIRM DIALOG MODAL */}
      {confirmVisible && (
        <ModalPortal isOpen={confirmVisible}>
          <div className="modal-overlay confirm-overlay" onClick={() => handleResolveConfirm(false)}>
            <div className="modal-card card-pastel confirm-card" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">🐼</div>
              <p className="confirm-message">{confirmMessage}</p>
              <div className="confirm-actions">
                <button type="button" className="btn-pastel btn-secondary-pastel" onClick={() => handleResolveConfirm(false)}>
                  {confirmTexts.cancel}
                </button>
                <button type="button" className="btn-pastel btn-primary-pastel" onClick={() => handleResolveConfirm(true)}>
                  {confirmTexts.confirm}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};
