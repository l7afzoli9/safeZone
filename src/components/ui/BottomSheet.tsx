import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}) => {
  const { t, dir } = useI18n();

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" />
        <Drawer.Content
          dir={dir}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-[var(--radius-sheet)] border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-elevated)] outline-none',
            className
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-[var(--border-strong)]/60" />
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pb-3 pt-4">
            <div className="min-w-0 flex-1 text-start">
              <Drawer.Title className="text-[1.125rem] font-bold leading-snug text-[var(--text-primary)]">
                {title}
              </Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-1 text-[0.9375rem] text-[var(--text-secondary)]">
                  {description}
                </Drawer.Description>
              ) : (
                <Drawer.Description className="sr-only">{title}</Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('common.close')}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
