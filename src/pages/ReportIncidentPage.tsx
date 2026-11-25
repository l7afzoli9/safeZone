import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crosshair,
  Eye,
  MapPin,
  PackageX,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { api, RateLimitError } from '../services/api';
import { detectApproximateZone } from '../services/geo';
import type { IncidentType, TimeBucket } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { EmergencyBanner } from '../components/domain/EmergencyButton';
import { ConsentToggle } from '../components/domain/ConsentToggle';
import { ErrorState, LoadingListSkeleton } from '../components/domain/EmptyState';
import { cn } from '../lib/cn';

const INCIDENT_TYPES: Array<{
  id: IncidentType;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'theft', icon: PackageX },
  { id: 'harassment', icon: ShieldAlert },
  { id: 'suspicious_activity', icon: Eye },
  { id: 'other', icon: AlertCircle },
];

const TIME_BUCKETS: TimeBucket[] = ['morning', 'afternoon', 'evening', 'night'];
const MAX_NOTE_LENGTH = 200;

export const ReportIncidentPage: React.FC = () => {
  const { language, t, dir } = useI18n();
  const { zones, loading, error, refreshAll } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramAreaType = searchParams.get('areaType');
  const paramAreaId = searchParams.get('areaId');
  const paramZoneId = searchParams.get('zoneId');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [zoneId, setZoneId] = useState<string>(() => paramZoneId ?? '');
  const [preselectedStreetName, setPreselectedStreetName] = useState<string | null>(null);
  const [zoneQuery, setZoneQuery] = useState<string>('');

  useEffect(() => {
    if (paramZoneId && zones.some((z) => z.id === paramZoneId)) {
      setZoneId(paramZoneId);
    } else if (paramAreaType === 'neighborhood' && paramAreaId && zones.some((z) => z.id === paramAreaId)) {
      setZoneId(paramAreaId);
    }
  }, [paramZoneId, paramAreaType, paramAreaId, zones]);

  useEffect(() => {
    if (paramAreaType === 'street' && paramAreaId) {
      void api
        .getStreetsGeoJson()
        .then((geo) => {
          const match = geo.features.find((f) => f.properties.id === paramAreaId);
          if (match) {
            setPreselectedStreetName(
              language === 'ar' ? match.properties.name_ar : match.properties.name_fr
            );
            if (!zoneId && zones.some((z) => z.id === match.properties.neighborhood_id)) {
              setZoneId(match.properties.neighborhood_id);
            }
          }
        })
        .catch(() => {});
    } else {
      setPreselectedStreetName(null);
    }
  }, [paramAreaType, paramAreaId, language, zones, zoneId]);
  const [timeBucket, setTimeBucket] = useState<TimeBucket | null>(null);
  const [note, setNote] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [stepError, setStepError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const filteredZones = useMemo(() => {
    const q = zoneQuery.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) =>
        t(z.name_key).toLowerCase().includes(q) ||
        t(z.city_key).toLowerCase().includes(q) ||
        z.zone_code.toLowerCase().includes(q)
    );
  }, [zones, zoneQuery, t]);

  const handleDetectZone = async () => {
    setDetecting(true);
    try {
      const detected = await detectApproximateZone(zones);
      if (detected) {
        setZoneId(detected.id);
        setStepError(null);
        toast.success(t('report.zoneDetectedToast', { zone: t(detected.name_key) }));
      } else {
        toast.info(t('report.zoneDetectUnavailable'));
      }
    } finally {
      setDetecting(false);
    }
  };

  const handleNextFromStep1 = () => {
    if (!incidentType) {
      setStepError(t('report.requiredTypeError'));
      return;
    }
    setStepError(null);
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!zoneId) {
      setStepError(t('report.requiredZoneError'));
      return;
    }
    setStepError(null);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentType) {
      setStep(1);
      setStepError(t('report.requiredTypeError'));
      return;
    }
    if (!zoneId) {
      setStep(2);
      setStepError(t('report.requiredZoneError'));
      return;
    }
    if (!timeBucket) {
      setStepError(t('report.requiredTimeError'));
      return;
    }

    setStepError(null);
    setSubmitting(true);
    try {
      await api.submitReport({
        zone_id: zoneId,
        area_type:
          paramAreaType === 'street' || paramAreaType === 'neighborhood'
            ? paramAreaType
            : 'neighborhood',
        area_id: paramAreaId ?? zoneId,
        incident_type: incidentType,
        time_bucket: timeBucket,
        note,
        is_anonymous: isAnonymous,
      });
      await refreshAll();
      setStep(4);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setStepError(t('report.rateLimitError', { max: err.maxPerHour }));
      } else {
        setStepError(t('common.errorDesc'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setIncidentType(null);
    setZoneId('');
    setZoneQuery('');
    setTimeBucket(null);
    setNote('');
    setIsAnonymous(true);
    setStepError(null);
  };

  if (loading) {
    return (
      <div className="px-4 py-5">
        <LoadingListSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-5">
        <ErrorState onRetry={() => void refreshAll()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <EmergencyBanner />

      {step <= 3 && (
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
            {t('report.title')}
          </h1>
          <span className="text-[0.875rem] font-semibold text-[var(--text-secondary)]">
            {t('report.stepLabel', { current: step, total: 3 })}
          </span>
        </div>
      )}

      {step <= 3 && (
        <div className="grid grid-cols-3 gap-2" aria-hidden="true">
          {[1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={cn(
                'h-2 rounded-full transition-colors',
                idx <= step ? 'bg-[var(--primary)]' : 'bg-[var(--border-subtle)]'
              )}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: dir === 'rtl' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div>
              <h2 className="text-[1.125rem] font-bold text-[var(--text-primary)]">
                {t('report.step1Title')}
              </h2>
              <p className="mt-0.5 text-[0.9375rem] text-[var(--text-secondary)]">
                {t('report.step1Subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={t('report.step1Title')}>
              {INCIDENT_TYPES.map(({ id, icon: Icon }) => {
                const selected = incidentType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setIncidentType(id);
                      setStepError(null);
                    }}
                    className={cn(
                      'flex min-h-[68px] items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 text-start transition-colors cursor-pointer',
                      selected
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]/70'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/50'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        selected
                          ? 'bg-[var(--primary)] text-[var(--primary-ink)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[1rem] font-bold text-[var(--text-primary)]">
                        {t(`report.types.${id}`)}
                      </span>
                      <span className="mt-0.5 block text-[0.875rem] text-[var(--text-secondary)]">
                        {t(`report.typeDescriptions.${id}`)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {stepError && (
              <p role="alert" className="text-[0.875rem] font-semibold text-[var(--alert-soft-ink)]">
                {stepError}
              </p>
            )}

            <Button variant="primary" size="lg" fullWidth onClick={handleNextFromStep1}>
              <span>{t('common.next')}</span>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: dir === 'rtl' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div>
              <h2 className="text-[1.125rem] font-bold text-[var(--text-primary)]">
                {t('report.step2Title')}
              </h2>
              <p className="mt-0.5 text-[0.9375rem] text-[var(--text-secondary)]">
                {t('report.step2Subtitle')}
              </p>
            </div>

            {preselectedStreetName && (
              <Card className="border-[var(--primary)]/30 bg-[var(--primary-soft)] p-3 text-[0.875rem] font-semibold text-[var(--primary-soft-ink)]">
                {t('heatmap.preselectedStreetBanner', { name: preselectedStreetName })}
              </Card>
            )}

            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={detecting}
              onClick={() => void handleDetectZone()}
            >
              <Crosshair className="h-4 w-4" aria-hidden="true" />
              <span>{detecting ? t('report.detectingZone') : t('report.useApproxZoneBtn')}</span>
            </Button>

            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3.5 top-3.5 h-4 w-4 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <Input
                value={zoneQuery}
                onChange={(e) => setZoneQuery(e.target.value)}
                placeholder={t('report.zoneSearchPlaceholder')}
                aria-label={t('report.zoneSearchPlaceholder')}
                className="ps-10"
              />
            </div>

            {filteredZones.length === 0 ? (
              <Card className="py-6 text-center text-[0.9375rem] text-[var(--text-secondary)]">
                {t('report.noZonesMatch')}
              </Card>
            ) : (
              <div
                className="grid grid-cols-2 gap-2.5"
                role="radiogroup"
                aria-label={t('report.step2Title')}
              >
                {filteredZones.map((zone) => {
                  const selected = zoneId === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setZoneId(zone.id);
                        setStepError(null);
                      }}
                      className={cn(
                        'flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-[var(--radius-md)] border p-3 text-start transition-colors cursor-pointer',
                        selected
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/50'
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-bold leading-tight">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{t(zone.name_key)}</span>
                      </span>
                      <span className="text-[0.8125rem] opacity-80">{t(zone.city_key)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {stepError && (
              <p role="alert" className="text-[0.875rem] font-semibold text-[var(--alert-soft-ink)]">
                {stepError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                {t('common.back')}
              </Button>
              <Button variant="primary" size="lg" fullWidth onClick={handleNextFromStep2}>
                <span>{t('common.next')}</span>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.form
            key="step3"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: dir === 'rtl' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
            noValidate
          >
            <div>
              <h2 className="text-[1.125rem] font-bold text-[var(--text-primary)]">
                {t('report.step3Title')}
              </h2>
              <p className="mt-0.5 text-[0.9375rem] text-[var(--text-secondary)]">
                {t('report.step3Subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[0.9375rem] font-bold text-[var(--text-primary)]">
                <Clock className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                <span>{t('report.timeLabel')}</span>
              </span>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={t('report.timeLabel')}>
                {TIME_BUCKETS.map((bucket) => {
                  const selected = timeBucket === bucket;
                  return (
                    <button
                      key={bucket}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setTimeBucket(bucket);
                        setStepError(null);
                      }}
                      className={cn(
                        'flex min-h-[60px] flex-col items-start justify-center rounded-[var(--radius-md)] border px-3 py-2.5 text-start transition-colors cursor-pointer',
                        selected
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/50'
                      )}
                    >
                      <span className="font-bold">{t(`report.times.${bucket}`)}</span>
                      <span dir="ltr" className="tabular-nums text-[0.8125rem] opacity-80">
                        {t(`report.timeRanges.${bucket}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Textarea
                rows={3}
                maxLength={MAX_NOTE_LENGTH}
                label={`${t('report.noteLabel')} (${t('common.optional')})`}
                placeholder={t('report.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              />
              <span
                aria-live="polite"
                className="tabular-nums text-end text-[0.8125rem] text-[var(--text-muted)]"
              >
                {t('report.charCounter', { count: note.length, max: MAX_NOTE_LENGTH })}
              </span>
            </div>

            <ConsentToggle
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              label={t('report.anonymousLabel')}
              description={t('report.anonymousDesc')}
            />

            {stepError && (
              <p role="alert" className="text-[0.875rem] font-semibold text-[var(--alert-soft-ink)]">
                {stepError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                {t('common.back')}
              </Button>
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
                {t('report.submitBtn')}
              </Button>
            </div>
          </motion.form>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4 py-2"
          >
            <Card className="flex flex-col items-center gap-3 border-[var(--success-border)] bg-[var(--success-soft)]/50 py-7 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-ink)]">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="text-[1.25rem] font-extrabold text-[var(--text-primary)]">
                {t('report.successTitle')}
              </h1>
              <p className="max-w-[34ch] text-[0.9375rem] leading-relaxed text-[var(--text-secondary)]">
                {t('report.successBody')}
              </p>
              <p className="max-w-[34ch] text-[0.875rem] text-[var(--text-muted)]">
                {t('report.successRetention')}
              </p>
            </Card>

            <div className="flex flex-col gap-2.5">
              <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/')}>
                {t('report.doneBtn')}
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={resetFlow}>
                {t('report.anotherBtn')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
