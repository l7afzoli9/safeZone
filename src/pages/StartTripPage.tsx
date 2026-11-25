import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Navigation, ShieldAlert, Users } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/cn';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { toast } from '../components/ui/Toast';
import { ContactChip } from '../components/domain/ContactChip';
import { EmptyState, LoadingListSkeleton } from '../components/domain/EmptyState';

const PRESET_DURATIONS = [15, 30, 60] as const;

export const StartTripPage: React.FC = () => {
  const { t, formatNumber } = useI18n();
  const {
    session,
    contacts,
    zones,
    activeTrip,
    loading,
    updateSession,
    startTrip,
  } = useApp();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<number | 'custom'>(30);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [durationError, setDurationError] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);

  useEffect(() => {
    if (activeTrip) {
      navigate('/trip/active', { replace: true });
    }
  }, [activeTrip, navigate]);

  useEffect(() => {
    if (zones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  useEffect(() => {
    if (contacts.length > 0 && selectedContactIds.length === 0) {
      setSelectedContactIds([contacts[0].id]);
    }
  }, [contacts, selectedContactIds.length]);

  const resolvedDuration = (): number => {
    if (preset !== 'custom') return preset;
    const parsed = Number.parseInt(customMinutes, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toggleContact = (id: string) => {
    setContactsError(null);
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleReviewStart = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = resolvedDuration();
    let valid = true;

    if (!Number.isFinite(mins) || mins < 5 || mins > 240) {
      setDurationError(t('startTrip.customErrorRange'));
      valid = false;
    } else {
      setDurationError(null);
    }

    if (selectedContactIds.length === 0) {
      setContactsError(t('startTrip.contactsRequiredError'));
      valid = false;
    } else {
      setContactsError(null);
    }

    if (!valid) return;
    setConfirmOpen(true);
  };

  const handleConfirmStart = async () => {
    setStarting(true);
    try {
      await startTrip({
        duration_minutes: resolvedDuration(),
        contact_ids: selectedContactIds,
        note,
        coarse_zone_id: selectedZoneId || zones[0]?.id || 'z_cas_maarif',
      });
      setConfirmOpen(false);
      toast.success(t('startTrip.startedToast'));
      navigate('/trip/active', { replace: true });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-5">
        <LoadingListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
          {t('startTrip.title')}
        </h1>
        <p className="mt-1 text-[0.9375rem] text-[var(--text-secondary)]">
          {t('startTrip.subtitle')}
        </p>
      </div>

      {session && !session.location_consent && (
        <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-[var(--warning-ink)]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-[0.875rem] font-semibold">{t('startTrip.consentBanner')}</p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                void updateSession({
                  location_consent: true,
                  consent_updated_at: new Date().toISOString(),
                })
              }
              className="shrink-0 border-[var(--warning-border)] bg-[var(--bg-surface)] text-[0.8125rem]"
            >
              {t('startTrip.enableConsentBtn')}
            </Button>
          </div>
        </Card>
      )}

      <form onSubmit={handleReviewStart} className="flex flex-col gap-5" noValidate>
        {/* Duration selector */}
        <section className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-[0.9375rem] font-bold text-[var(--text-primary)]">
            <Clock className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            <span>{t('startTrip.durationLabel')}</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_DURATIONS.map((mins) => {
              const active = preset === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setPreset(mins);
                    setDurationError(null);
                  }}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-[48px] flex-col items-center justify-center rounded-[var(--radius-md)] border px-2 py-2 text-center font-bold transition-colors cursor-pointer',
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  )}
                >
                  <span className="tabular-nums text-[1.0625rem] leading-tight">
                    {formatNumber(mins)}
                  </span>
                  <span className="text-[0.75rem] font-medium opacity-85">
                    {t('common.minutesShort')}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setPreset('custom');
                setDurationError(null);
              }}
              aria-pressed={preset === 'custom'}
              className={cn(
                'flex min-h-[48px] items-center justify-center rounded-[var(--radius-md)] border px-2 py-2 text-[0.875rem] font-bold transition-colors cursor-pointer',
                preset === 'custom'
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              )}
            >
              <span>{t('startTrip.customChip')}</span>
            </button>
          </div>

          {preset === 'custom' && (
            <Input
              type="number"
              inputMode="numeric"
              min={5}
              max={240}
              label={t('startTrip.customLabel')}
              placeholder={t('startTrip.customPlaceholder')}
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                setDurationError(null);
              }}
              error={durationError}
            />
          )}
          {preset !== 'custom' && durationError && (
            <p role="alert" className="text-[0.875rem] font-medium text-[var(--alert-soft-ink)]">
              {durationError}
            </p>
          )}
        </section>

        {/* Approximate starting zone */}
        <section className="flex flex-col gap-1.5">
          <label
            htmlFor="trip-zone-select"
            className="flex items-center gap-2 text-[0.9375rem] font-bold text-[var(--text-primary)]"
          >
            <MapPin className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            <span>{t('startTrip.zoneLabel')}</span>
          </label>
          <select
            id="trip-zone-select"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="min-h-[46px] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-base text-[var(--text-primary)]"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {t(z.name_key)} — {t(z.city_key)}
              </option>
            ))}
          </select>
          <p className="text-[0.875rem] text-[var(--text-muted)]">{t('startTrip.zoneHelper')}</p>
        </section>

        {/* Trusted Contacts Multi-select */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[0.9375rem] font-bold text-[var(--text-primary)]">
              <Users className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              <span>{t('startTrip.contactsLabel')}</span>
            </label>
            <button
              type="button"
              onClick={() => navigate('/contacts')}
              className="min-h-[44px] px-2 text-[0.875rem] font-bold text-[var(--primary)] hover:underline cursor-pointer"
            >
              {t('startTrip.manageContactsCta')}
            </button>
          </div>
          <p className="text-[0.875rem] text-[var(--text-secondary)]">
            {t('startTrip.contactsHint')}
          </p>

          {contacts.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" aria-hidden="true" />}
              title={t('startTrip.contactsEmpty')}
              description={t('contacts.emptyDesc')}
              actionLabel={t('startTrip.manageContactsCta')}
              onAction={() => navigate('/contacts')}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {contacts.map((c) => (
                <ContactChip
                  key={c.id}
                  contact={c}
                  selected={selectedContactIds.includes(c.id)}
                  onToggleSelect={toggleContact}
                />
              ))}
            </div>
          )}

          {contactsError && (
            <p role="alert" className="text-[0.875rem] font-medium text-[var(--alert-soft-ink)]">
              {contactsError}
            </p>
          )}
        </section>

        {/* Optional Trip Note */}
        <Textarea
          rows={2}
          maxLength={140}
          label={`${t('startTrip.noteLabel')} (${t('common.optional')})`}
          placeholder={t('startTrip.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={contacts.length === 0}
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          <span>{t('startTrip.startCta')}</span>
        </Button>
      </form>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('startTrip.confirmTitle')}
        description={t('startTrip.confirmDesc')}
        confirmLabel={t('startTrip.confirmStartBtn')}
        cancelLabel={t('common.cancel')}
        loading={starting}
        onConfirm={handleConfirmStart}
      >
        <Card className="bg-[var(--bg-subtle)]/70 p-3.5 text-[0.9375rem]">
          <ul className="flex flex-col gap-1.5 text-[var(--text-primary)]">
            <li className="font-semibold">
              {t('startTrip.confirmSummaryDuration', { minutes: resolvedDuration() })}
            </li>
            <li>
              {t('startTrip.confirmSummaryContacts', { count: selectedContactIds.length })}
            </li>
            <li className="text-[0.875rem] text-[var(--text-secondary)]">
              {t('startTrip.confirmSummaryPrivacy')}
            </li>
          </ul>
        </Card>
      </ConfirmModal>
    </div>
  );
};
