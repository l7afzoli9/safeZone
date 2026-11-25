import React from 'react';
import { cn } from '../../lib/cn';

type BadgeTone = 'neutral' | 'primary' | 'warning' | 'alert' | 'success';

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  primary: 'bg-[var(--primary-soft)] text-[var(--primary-soft-ink)] border-transparent',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning-ink)] border-[var(--warning-border)]',
  alert: 'bg-[var(--alert-soft)] text-[var(--alert-soft-ink)] border-[var(--alert-border)]',
  success: 'bg-[var(--success-soft)] text-[var(--success-ink)] border-[var(--success-border)]',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-medium leading-tight',
      toneStyles[tone],
      className
    )}
  >
    {children}
  </span>
);
