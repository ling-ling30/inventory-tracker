import React from 'react';

/**
 * InfoBlock — a labelled surface block used in detail views.
 * Shows a small uppercase label above the main content.
 */
interface InfoBlockProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const InfoBlock: React.FC<InfoBlockProps> = ({ label, children, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'var(--surface-secondary)',
      padding: '12px 14px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

/**
 * SpecGrid — renders a dict of key/value spec pairs in a responsive grid.
 */
interface SpecGridProps {
  specs: Record<string, any>;
}

export const SpecGrid: React.FC<SpecGridProps> = ({ specs }) => {
  const entries = Object.entries(specs).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
      }}
    >
      {entries.map(([k, v]) => (
        <div
          key={k}
          style={{
            background: 'var(--surface-secondary)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {k.replace(/_/g, ' ')}
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{String(v)}</div>
        </div>
      ))}
    </div>
  );
};
