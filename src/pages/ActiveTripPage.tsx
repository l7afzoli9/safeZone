import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  MapPin,
  Navigation,
  Pause,
  Play,
  Radio,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { toast } from '../components/ui/Toast';
import { EmergencyCallButton } from '../components/domain/EmergencyButton';
import { EmptyState, LoadingListSkeleton } from '../components/domain/EmptyState';
import { cn } from '../lib/cn';

export const ActiveTripPage: React.FC = () => {
  const { t, formatTimer } = useI18n();
  const {
    activeTrip,
    remainingSeconds,
    tripExpiredNotice,
    zones,
    contacts,
    loading,
    pauseTrip,
    resumeTrip,
    triggerTripAlert,
    endTrip,
    dismissTripExpiredNotice,
  } = useApp();
  const navigate = useNavigate();

  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [alertConfirmOpen, setAlertConfirmOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="px-4 py-5">
        <LoadingListSkeleton count={2} />
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={<Navigation className="h-6 w-6" aria-hidden="true" />}
          title={tripExpiredNotice ? t('activeTrip.expiredTitle') : t('activeTrip.noActiveTitle')}
          description={
            tripExpiredNotice ? t('activeTrip.expiredDesc') : t('activeTrip.noActiveDesc')
          }
          actionLabel={t('activeTrip.startNewCta')}
          onAction={() => {
            dismissTripExpiredNotice();
            navigate('/trip/new');
          }}
        />
      </div>
    );
  }

  const isPaused = activeTrip.status === 'paused';
  const isAlerted = activeTrip.status === 'alerted';
  const currentZone = zones.find((z) => z.id === activeTrip.coarse_zone_id);
  const followingContacts = contacts.filter((c) => activeTrip.contact_ids.includes(c.id));

  const handleTogglePause = async () => {
    if (isPaused) {
      await resumeTrip();
      setAnnouncement(t('activeTrip.resumedAnnouncement'));
    } else {
      await pauseTrip();
      setAnnouncement(t('activeTrip.pausedAnnouncement'));
    }
  };

  const handleEndTrip = async () => {
    setBusy(true);
    try {
      await endTrip();
      setEndConfirmOpen(false);
      toast.success(t('activeTrip.endedToast'));
      navigate('/', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmAlert = async () => {
    setBusy(true);
    try {
      await triggerTripAlert();
      setAlertConfirmOpen(false);
      setAnnouncement(t('activeTrip.alertSentTitle'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
        {t('activeTrip.title')}
      </h1>

      {/* Live Status & Timer Card */}
      <Card
        elevated
        className={cn(
          'flex flex-col gap-4 border-2',
          isAlerted
            ? 'border-[var(--alert)] bg-[var(--alert-soft)]/50'
            : isPaused
              ? 'border-[var(--warning-border)] bg-[var(--bg-surface)]'
              : 'border-[var(--primary)]/40 bg-[var(--bg-surface)]'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5 items-center justify-center">
              {!isPaused && (
                <motion.span
                  aria-hidden="true"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.65, 0, 0.65] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className={cn(
                    'absolute inset-0 rounded-full',
                    isAlerted ? 'bg-[var(--alert)]' : 'bg-[var(--primary)]'
                  )}
                />
              )}
              <span
                className={cn(
                  'relative h-3 w-3 rounded-full',
                  isAlerted
                    ? 'bg-[var(--alert)]'
                    : isPaused
                      ? 'bg-[var(--warning-ink)]'
                      : 'bg-[var(--primary)]'
                )}
              />
            </span>
            <span className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
              {isAlerted
                ? t('activeTrip.statusAlerted')
                : isPaused
                  ? t('activeTrip.statusPaused')
                  : t('activeTrip.statusOn')}
            </span>
          </div>

          <Badge tone={isAlerted ? 'alert' : isPaused ? 'warning' : 'primary'}>
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('activeTrip.contactsFollowing', { count: activeTrip.contact_ids.length })}</span>
          </Badge>
        </div>

        <div className="rounded-[var(--radius-md)] bg-[var(--bg-subtle)]/80 px-4 py-4 text-center">
          <p className="text-[0.875rem] font-medium text-[var(--text-secondary)]">
            {t('activeTrip.remainingLabel')}
          </p>
          <p
            dir="ltr"
            className="tabular-nums mt-1 text-[2.25rem] font-extrabold tracking-tight text-[var(--text-primary)]"
          >
            {formatTimer(remainingSeconds)}
          </p>
        </div>

        {currentZone && (
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-[0.875rem] text-[var(--text-secondary)]">
              <MapPin className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              {t('activeTrip.currentZoneLabel')}
            </span>
            <span className="font-bold text-[var(--text-primary)]">
              {t(currentZone.name_key)} · {t(currentZone.city_key)}
            </span>
          </div>
        )}

        {activeTrip.note && (
          <p className="rounded-[var(--radius-md)] bg-[var(--bg-subtle)]/60 px-3.5 py-2 text-[0.9375rem] text-[var(--text-secondary)]">
            {activeTrip.note}
          </p>
        )}

        {followingContacts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Users className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
            {followingContacts.map((c) => (
              <Badge key={c.id} tone="neutral">
                {c.name}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Alert Sent Confirmation Panel */}
      {isAlerted && (
        <Card className="border-[var(--alert-border)] bg-[var(--alert-soft)]">
          <div className="flex items-start gap-2.5 text-[var(--alert-soft-ink)]">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-[1rem] font-bold">{t('activeTrip.alertSentTitle')}</h2>
              <p className="mt-1 text-[0.875rem] leading-relaxed">
                {t('activeTrip.alertSentDesc')}
              </p>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-2">
            <EmergencyCallButton service="police" compact />
            <EmergencyCallButton service="gendarmerie" compact />
          </div>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {!isAlerted && (
          <Button variant="outline" size="lg" fullWidth onClick={() => void handleTogglePause()}>
            {isPaused ? (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>{t('activeTrip.resumeBtn')}</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" aria-hidden="true" />
                <span>{t('activeTrip.pauseBtn')}</span>
              </>
            )}
          </Button>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => setEndConfirmOpen(true)}
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <span>{t('activeTrip.endBtn')}</span>
        </Button>

        {!isAlerted && (
          <Button
            variant="alert"
            size="lg"
            fullWidth
            onClick={() => setAlertConfirmOpen(true)}
          >
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            <span>{t('activeTrip.alertBtn')}</span>
          </Button>
        )}
      </div>

      {/* End Trip Confirmation Sheet */}
      <ConfirmModal
        open={endConfirmOpen}
        onOpenChange={setEndConfirmOpen}
        title={t('activeTrip.endConfirmTitle')}
        description={t('activeTrip.endConfirmDesc')}
        confirmLabel={t('activeTrip.endConfirmBtn')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onConfirm={handleEndTrip}
      />

      {/* Alert Contacts Gated Confirmation Sheet */}
      <ConfirmModal
        open={alertConfirmOpen}
        onOpenChange={setAlertConfirmOpen}
        title={t('activeTrip.alertConfirmTitle')}
        description={t('activeTrip.alertConfirmDesc', { count: activeTrip.contact_ids.length })}
        confirmLabel={t('activeTrip.alertConfirmBtn')}
        cancelLabel={t('common.cancel')}
        confirmVariant="alert"
        loading={busy}
        onConfirm={handleConfirmAlert}
      />
    </div>
  );
};
