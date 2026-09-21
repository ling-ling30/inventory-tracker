import React from 'react';

// StatusPill - colored status indicator
type Status = 'In Use' | 'Available' | 'In Storage' | 'Needs Repair' | string;

function getStatusClass(status: Status) {
  if (status === 'In Use') return 'status-assigned';
  if (status === 'Available') return 'status-available';
  if (status === 'In Storage') return 'status-storage';
  if (status === 'Needs Repair') return 'status-repair';
  return 'status-storage';
}

export const StatusPill: React.FC<{ status: Status; className?: string }> = ({ status, className = '' }) => (
  <span className={`status-pill ${getStatusClass(status)} ${className}`}>{status}</span>
);

// TagCode - monospace asset tag display
export const TagCode: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({
  children,
  onClick,
  className = '',
}) => (
  <span
    className={`tag-code ${className}`}
    style={onClick ? { cursor: 'pointer' } : undefined}
    onClick={onClick}
  >
    {children}
  </span>
);

// FieldBadge - small label badge used in category fields list
export const FieldBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="dropdown-option-badge">{children}</span>
);
