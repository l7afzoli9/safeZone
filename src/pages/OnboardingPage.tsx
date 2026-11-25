import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, EyeOff, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConsentToggle } from '../components/domain/ConsentToggle';
import { PrivacyPolicySheet } from '../components/domain/PrivacyPolicySheet';
import { cn } from '../lib/cn';

const TOTAL_STEPS = 4; // 3 slides + 1 consent step

export const OnboardingPage: React.FC = () => {
  const { t, tRaw, dir } = useI18n();
  const { session, updateSession } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(0);
  const [locationConsent, setLocationConsent] = useState<boolean>(
    session?.location_consent ?? false
  );
  const [policyOpen, setPolicyOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const notList = tRaw<string[]>('onboarding.slide3.notList');

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateSession({
        onboarding_completed: true,
        location_consent: locationConsent,
        consent_updated_at: new Date().toISOString(),
      });
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const slideIcons = [Navigation, MapPin, EyeOff, ShieldCheck];
  const ActiveIcon = slideIcons[step] ?? ShieldCheck;

  return (
    <div className="flex flex-1 flex-col justify-between gap-5 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.875rem] font-semibold text-[var(--text-secondary)]">
          {t('onboarding.stepIndicator', { current: step + 1, total: TOTAL_STEPS })}
        </span>
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] px-2.5 text-[0.9375rem] font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] cursor-pointer"
          >
            {t('onboarding.skipToConsent')}
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'h-2 rounded-full transition-all duration-200',
              idx === step
                ? 'w-8 bg-[var(--primary)]'
                : idx < step
                  ? 'w-4 bg-[var(--primary)]/50'
                  : 'w-4 bg-[var(--border-subtle)]'
            )}
          />
        ))}
      </div>

      <div className="flex-1 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: dir === 'rtl' ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 'rtl' ? 14 : -14 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]">
              <ActiveIcon className="h-7 w-7" aria-hidden="true" />
            </div>

            {step === 0 && (
              <>
                <h1 className="text-[1.5rem] font-extrabold leading-tight text-[var(--text-primary)]">
                  {t('onboarding.slide1.title')}
                </h1>
                <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                  {t('onboarding.slide1.body')}
                </p>
                <Card className="border-[var(--primary)]/20 bg-[var(--primary-soft)]/70">
                  <p className="text-[0.9375rem] font-semibold text-[var(--primary-soft-ink)]">
                    {t('onboarding.slide1.highlight')}
                  </p>
                </Card>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-[1.5rem] font-extrabold leading-tight text-[var(--text-primary)]">
                  {t('onboarding.slide2.title')}
                </h1>
                <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                  {t('onboarding.slide2.body')}
                </p>
                <Card className="border-[var(--primary)]/20 bg-[var(--primary-soft)]/70">
                  <p className="text-[0.9375rem] font-semibold text-[var(--primary-soft-ink)]">
                    {t('onboarding.slide2.highlight')}
                  </p>
                </Card>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-[1.5rem] font-extrabold leading-tight text-[var(--text-primary)]">
                  {t('onboarding.slide3.title')}
                </h1>
                <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                  {t('onboarding.slide3.body')}
                </p>
                <Card>
                  <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
                    {t('onboarding.slide3.notTitle')}
                  </h2>
                  <ul className="mt-2.5 flex flex-col gap-2">
                    {notList.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-[0.9375rem] text-[var(--text-secondary)]"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="text-[1.5rem] font-extrabold leading-tight text-[var(--text-primary)]">
                  {t('onboarding.consent.title')}
                </h1>
                <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                  {t('onboarding.consent.summary')}
                </p>

                <ConsentToggle
                  checked={locationConsent}
                  onCheckedChange={setLocationConsent}
                  label={t('onboarding.consent.toggleLabel')}
                  description={t('onboarding.consent.toggleDesc')}
                />

                {!locationConsent && (
                  <p className="text-[0.875rem] text-[var(--text-muted)]">
                    {t('onboarding.consent.withoutLocationNote')}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setPolicyOpen(true)}
                  className="inline-flex min-h-[44px] w-fit items-center gap-1.5 text-[0.9375rem] font-semibold text-[var(--primary)] underline underline-offset-4 cursor-pointer"
                >
                  <span>{t('onboarding.consent.privacyLink')}</span>
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="shrink-0"
          >
            {t('common.back')}
          </Button>
        )}

        {step < 3 ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setStep((s) => Math.min(3, s + 1))}
          >
            <span>{t('common.next')}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={saving}
            onClick={() => void handleFinish()}
          >
            {t('onboarding.consent.startBtn')}
          </Button>
        )}
      </div>

      <PrivacyPolicySheet open={policyOpen} onOpenChange={setPolicyOpen} />
    </div>
  );
};
