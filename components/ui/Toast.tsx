'use client';

import React, { useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error';

interface ToastState {
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toast: ToastState | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const [rendered, setRendered] = useState<ToastState | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (toast) {
      setRendered(toast);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const t = setTimeout(() => setRendered(null), 150);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!rendered) return null;

  return (
    <div className="toast-container">
      <div className={`toast-pill toast-${rendered.variant}`} data-closing={closing} role="status">
        {rendered.message}
      </div>
    </div>
  );
};
