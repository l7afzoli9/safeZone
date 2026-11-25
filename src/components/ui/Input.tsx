import React from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, hint, error, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[0.9375rem] font-semibold text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'min-h-[46px] w-full rounded-[var(--radius-md)] border bg-[var(--bg-surface)] px-3.5 py-2.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors',
            error
              ? 'border-[var(--alert)] focus-visible:outline-[var(--alert)]'
              : 'border-[var(--border-strong)]',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-[0.875rem] font-medium text-[var(--alert-soft-ink)]">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-[0.875rem] text-[var(--text-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, hint, error, className, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[0.9375rem] font-semibold text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'w-full rounded-[var(--radius-md)] border bg-[var(--bg-surface)] px-3.5 py-2.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors',
            error
              ? 'border-[var(--alert)] focus-visible:outline-[var(--alert)]'
              : 'border-[var(--border-strong)]',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-[0.875rem] font-medium text-[var(--alert-soft-ink)]">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-[0.875rem] text-[var(--text-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
