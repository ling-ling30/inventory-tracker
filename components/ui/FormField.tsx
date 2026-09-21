import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, required, hint, children }) => (
  <div className="form-row">
    <label>
      <span>{label}</span>
      {required && <span style={{ color: 'var(--red)' }}>*</span>}
      {hint && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>{hint}</span>}
    </label>
    {children}
  </div>
);

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, actions }) => (
  <div className="form-section">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="form-section-title" style={{ margin: 0 }}>{title}</div>
      {actions}
    </div>
    {children}
  </div>
);

interface FormActionsProps {
  onCancel: () => void;
  submitLabel?: string;
  danger?: boolean;
  dangerLabel?: string;
  onDanger?: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  submitLabel = 'Save',
  danger,
  dangerLabel = 'Delete',
  onDanger,
}) => (
  <div className="form-actions-bar">
    {danger && onDanger && (
      <button
        type="button"
        className="btn btn-ghost"
        style={{ color: 'var(--red)', marginRight: 'auto' }}
        onClick={onDanger}
      >
        {dangerLabel}
      </button>
    )}
    <button type="button" className="btn btn-ghost" onClick={onCancel}>
      Cancel
    </button>
    <button type="submit" className="btn btn-primary">
      {submitLabel}
    </button>
  </div>
);
