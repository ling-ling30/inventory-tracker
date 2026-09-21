import React from 'react';

export interface SegmentOption {
  key: string;
  label: string;
  count?: number;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  active: string;
  onChange: (key: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  active,
  onChange,
}) => (
  <nav className="segmented-control">
    {options.map((opt) => (
      <button
        key={opt.key}
        className={`segment-btn ${active === opt.key ? 'active' : ''}`}
        onClick={() => onChange(opt.key)}
      >
        <span>{opt.label}</span>
        {opt.count !== undefined && (
          <span className="segment-count">{opt.count}</span>
        )}
      </button>
    ))}
  </nav>
);
