import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon,
      children,
      className = '',
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClass = `btn-${variant}`;
    const sizeClass = size === 'sm' ? 'btn-sm' : '';
    const classes = ['btn', variantClass, sizeClass, className].filter(Boolean).join(' ');

    return (
      <button ref={ref} className={classes} disabled={disabled} style={style} {...props}>
        {icon && <span className="btn-icon">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
