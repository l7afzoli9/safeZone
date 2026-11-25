import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, elevated, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4',
        elevated ? 'shadow-[var(--shadow-elevated)]' : 'shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
