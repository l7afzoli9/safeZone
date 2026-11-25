import React from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'alert' | 'outline';
type Size = 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] shadow-sm',
  secondary:
    'bg-[var(--primary-soft)] text-[var(--primary-soft-ink)] hover:opacity-90',
  outline:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
  alert:
    'bg-[var(--alert)] text-[var(--alert-ink)] hover:bg-[var(--alert-hover)] shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  md: 'min-h-[44px] px-4 py-2.5 text-[0.9375rem]',
  lg: 'min-h-[50px] px-5 py-3 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition-all duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
