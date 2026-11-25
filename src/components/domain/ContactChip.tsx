import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn, getInitials } from '../../lib/cn';
import { formatMoroccanPhoneDisplay } from '../../lib/validation';
import type { TrustedContact } from '../../types';
import { Badge } from '../ui/Badge';

interface ContactChipProps {
  contact: TrustedContact;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit?: (contact: TrustedContact) => void;
  onDelete?: (contact: TrustedContact) => void;
  className?: string;
}

export const ContactChip: React.FC<ContactChipProps> = ({
  contact,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  className,
}) => {
  const { t } = useI18n();
  const initials = getInitials(contact.name);
  const relationLabel = t(contact.relation_key);
  const phoneDisplay = formatMoroccanPhoneDisplay(contact.phone);

  if (onToggleSelect) {
    return (
      <label
        className={cn(
          'flex min-h-[60px] cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 transition-colors',
          selected
            ? 'border-[var(--primary)] bg-[var(--primary-soft)]/60'
            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/50',
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-bold',
              selected
                ? 'bg-[var(--primary)] text-[var(--primary-ink)]'
                : 'bg-[var(--bg-subtle)] text-[var(--primary-soft-ink)]'
            )}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-semibold text-[var(--text-primary)]">
                {contact.name}
              </span>
              <Badge tone="neutral">{relationLabel}</Badge>
            </div>
            <p dir="ltr" className="tabular-nums text-start text-[0.875rem] text-[var(--text-secondary)]">
              {phoneDisplay}
            </p>
          </div>
        </div>

        <CheckboxPrimitive.Root
          checked={Boolean(selected)}
          onCheckedChange={() => onToggleSelect(contact.id)}
          aria-label={contact.name}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-[var(--border-strong)] bg-[var(--bg-surface)] data-[state=checked]:border-[var(--primary)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-ink)]"
        >
          <CheckboxPrimitive.Indicator>
            <Check className="h-4 w-4" strokeWidth={2.75} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
      </label>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-[64px] items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[0.9375rem] font-bold text-[var(--primary-soft-ink)]"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-bold text-[var(--text-primary)]">
              {contact.name}
            </span>
            <Badge tone="neutral">{relationLabel}</Badge>
          </div>
          <p dir="ltr" className="tabular-nums text-start text-[0.875rem] text-[var(--text-secondary)]">
            {phoneDisplay}
          </p>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(contact)}
              aria-label={t('contacts.editAria', { name: contact.name })}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(contact)}
              aria-label={t('contacts.deleteAria', { name: contact.name })}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--alert-soft-ink)] hover:bg-[var(--alert-soft)] cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
