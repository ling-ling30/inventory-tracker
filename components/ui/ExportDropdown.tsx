'use client';

import React, { useRef, useEffect, useState } from 'react';

const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface ExportOption {
  label: string;
  badge: string;
  description: string;
  onClick: () => void;
  separator?: boolean;
}

interface ExportDropdownProps {
  options: ExportOption[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  options,
  isOpen,
  onToggle,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const t = setTimeout(() => setRendered(false), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={onToggle}
        title="Export to Excel spreadsheet"
      >
        <FileIcon />
        Export Excel
        <ChevronIcon />
      </button>

      {rendered && (
        <div className="apple-dropdown-menu" data-closing={closing}>
          <div className="dropdown-header-label">Export Spreadsheet (.csv)</div>
          {options.map((opt, i) => (
            <React.Fragment key={i}>
              {opt.separator && <div className="dropdown-separator" />}
              <button className="dropdown-option" onClick={opt.onClick}>
                <div className="dropdown-option-title">
                  <span>{opt.label}</span>
                  <span className="dropdown-option-badge">{opt.badge}</span>
                </div>
                <div className="dropdown-option-desc">{opt.description}</div>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
