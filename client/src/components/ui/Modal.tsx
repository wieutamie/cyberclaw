import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible label for the dialog (used when there's no visible <h3 id>). */
  ariaLabel?: string;
  /** id of the element that labels the dialog (its heading). */
  labelledBy?: string;
  /** Max-width utility class for the panel. Defaults to max-w-md. */
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * Accessible modal rendered through a portal into document.body.
 *
 * Portaling is essential here: the app's <main> lives inside a lower stacking
 * context (z-index:1) than the sticky header (z-50), so a modal rendered inline
 * would be trapped behind the header. Rendering into <body> escapes all local
 * stacking contexts and always paints on top.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  labelledBy,
  panelClassName = 'max-w-md',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    // Lock body scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    // Move focus into the dialog.
    const focusTimer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? panelRef.current)?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
      onMouseDown={(e) => {
        // Close only when the backdrop itself is clicked (not the panel).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`bg-surface border rounded-card p-6 w-full ${panelClassName} shadow-card flex flex-col gap-4 animate-in zoom-in-95 focus:outline-none`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};
