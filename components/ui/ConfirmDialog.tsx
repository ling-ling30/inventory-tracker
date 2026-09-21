'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}) => {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const t = setTimeout(() => setRendered(false), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!rendered) return null;

  return (
    <div className="confirm-scrim" data-closing={closing} onClick={onCancel}>
      <div
        className="confirm-dialog"
        data-closing={closing}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="confirm-dialog-title" className="confirm-dialog-title">{title}</div>
        {description && <div className="confirm-dialog-desc">{description}</div>}
        <div className="confirm-dialog-actions">
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
