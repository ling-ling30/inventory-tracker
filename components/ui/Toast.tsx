'use client';

import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  const [rendered, setRendered] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (message) {
      setRendered(message);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const t = setTimeout(() => setRendered(null), 150);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (!rendered) return null;

  return (
    <div className="toast-container">
      <div className="toast-pill" data-closing={closing}>
        {rendered}
      </div>
    </div>
  );
};
