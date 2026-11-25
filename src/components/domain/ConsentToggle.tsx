import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/cn';

interface ConsentToggleProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}

export const ConsentToggle: React.FC<ConsentToggleProps> = ({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  className,
}) => {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;

  return (
    <div
      className={cn(
        'flex min-h-[56px] items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5',
        className
      )}
    >
      <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[0.9375rem] font-semibold leading-snug text-[var(--text-primary)]">
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
            {description}
          </span>
        )}
      </label>

      <SwitchPrimitive.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[var(--border-strong)] transition-colors data-[state=checked]:bg-[var(--primary)]"
      >
        <SwitchPrimitive.Thumb
          className="pointer-events-none block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0 data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5"
        />
      </SwitchPrimitive.Root>
    </div>
  );
};
