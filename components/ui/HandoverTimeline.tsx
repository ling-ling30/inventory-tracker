import React from 'react';

export interface HandoverEntry {
  id: string;
  date: string;
  from: string;
  to: string;
  notes?: string;
}

interface HandoverTimelineProps {
  history: HandoverEntry[];
}

export const HandoverTimeline: React.FC<HandoverTimelineProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
        No transfer history recorded yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {history.map((h, idx) => (
        <div
          key={h.id || idx}
          className="handover-log-card"
          style={{ borderLeft: '3px solid var(--apple-blue)' }}
        >
          <div className="handover-transfer-desc">
            <span className="handover-date">{h.date || 'Past'}</span>
            <span className="handover-arrow">→</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {h.from} → {h.to}
            </span>
          </div>
          {h.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.notes}</div>
          )}
        </div>
      ))}
    </div>
  );
};
