import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  isOpen: boolean;
  children: React.ReactNode;
}

let activeModalsCount = 0;
let originalOverflow = '';

/**
 * Renderiza el modal directamente en document.body mediante un Portal de React.
 * Esto evita que transformaciones CSS, filtros (backdrop-filter) o headers sticky
 * de componentes padres interfieran con el posicionamiento 'position: fixed'.
 * Además bloquea el scroll del fondo mientras cualquier modal está abierto
 * para evitar que la página se desplace al interactuar en pantallas móviles.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ isOpen, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalsCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeModalsCount++;

    return () => {
      activeModalsCount = Math.max(0, activeModalsCount - 1);
      if (activeModalsCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(<>{children}</>, document.body);
};
