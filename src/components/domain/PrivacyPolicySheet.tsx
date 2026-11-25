import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';

interface PrivacyPolicySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacyPolicySheet: React.FC<PrivacyPolicySheetProps> = ({ open, onOpenChange }) => {
  const { t, tRaw } = useI18n();
  const sections = tRaw<Array<{ title: string; body: string }>>('privacy.sections');

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('privacy.sheetTitle')}
      description={t('privacy.lawReference')}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--primary-soft)] p-3.5 text-[var(--primary-soft-ink)]">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-[0.875rem] font-semibold leading-relaxed">
            {t('privacy.lawReference')}
          </p>
        </div>

        {sections.map((sec) => (
          <section
            key={sec.title}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5"
          >
            <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{sec.title}</h3>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
              {sec.body}
            </p>
          </section>
        ))}

        <Button variant="primary" size="lg" fullWidth onClick={() => onOpenChange(false)}>
          {t('common.close')}
        </Button>
      </div>
    </BottomSheet>
  );
};
