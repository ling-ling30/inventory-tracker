import React from 'react';

const BackChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

interface PageHeaderProps {
  backLabel: string;
  onBack: () => void;
  title: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ backLabel, onBack, title, actions }) => (
  <div className="page-header-bar">
    <button className="back-btn" onClick={onBack}>
      <BackChevron />
      <span>{backLabel}</span>
    </button>
    <h2 className="page-title" style={{ fontSize: 18 }}>
      {title}
    </h2>
    {/* Spacer or action buttons on the right */}
    <div style={{ display: 'flex', gap: 8 }}>
      {actions ?? <div style={{ width: 50 }} />}
    </div>
  </div>
);
