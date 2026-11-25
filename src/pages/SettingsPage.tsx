import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Globe,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Language, ThemePreference } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { toast } from '../components/ui/Toast';
import { ConsentToggle } from '../components/domain/ConsentToggle';
import { PrivacyPolicySheet } from '../components/domain/PrivacyPolicySheet';
import { cn } from '../lib/cn';

const LANGUAGES: Language[] = ['fr', 'ar'];
const THEMES: Array<{
  value: ThemePreference;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { session, updateSession, deleteAllData } = useApp();
  const navigate = useNavigate();

  const [policyOpen, setPolicyOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    void updateSession({ language: next }).catch(() => {});
  };

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next);
    void updateSession({ theme: next }).catch(() => {});
  };

  const handleExport = async () => {
    const payload = await api.exportMyData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amin-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t('settings.exportSuccessToast'));
  };

  const handleDeleteAll = async () => {
    setBusy(true);
    try {
      await deleteAllData();
      setDeleteConfirmOpen(false);
      toast.success(t('settings.deletedToast'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
        {t('settings.title')}
      </h1>

      {/* Language Selector */}
      <section className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-[1rem] font-bold text-[var(--text-primary)]">
          <Globe className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <span>{t('settings.languageSection')}</span>
        </h2>
        <Card className="grid grid-cols-1 gap-2 p-2.5">
          {LANGUAGES.map((code) => {
            const active = language === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageChange(code)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[46px] items-center justify-between rounded-[var(--radius-md)] px-3.5 py-2 text-start font-semibold transition-colors cursor-pointer',
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-ink)]'
                    : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <span>{t(`languages.${code}`)}</span>
                <span className="text-[0.8125rem] opacity-85">
                  {t(`languages.short.${code}`)}
                </span>
              </button>
            );
          })}
        </Card>
      </section>

      {/* Theme Toggle */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[1rem] font-bold text-[var(--text-primary)]">
          {t('settings.themeSection')}
        </h2>
        <Card className="grid grid-cols-3 gap-2 p-2">
          {THEMES.map(({ value, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[0.875rem] font-semibold transition-colors cursor-pointer',
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-ink)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{t(`themes.${value}`)}</span>
              </button>
            );
          })}
        </Card>
      </section>

      {/* Notification Preferences */}
      {session && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[1rem] font-bold text-[var(--text-primary)]">
            {t('settings.notificationsSection')}
          </h2>
          <div className="flex flex-col gap-2.5">
            <ConsentToggle
              checked={session.notifications.trip_reminders}
              onCheckedChange={(checked) =>
                void updateSession({
                  notifications: { ...session.notifications, trip_reminders: checked },
                })
              }
              label={t('settings.notifTrip')}
              description={t('settings.notifTripDesc')}
            />
            <ConsentToggle
              checked={session.notifications.contact_alerts}
              onCheckedChange={(checked) =>
                void updateSession({
                  notifications: { ...session.notifications, contact_alerts: checked },
                })
              }
              label={t('settings.notifAlert')}
              description={t('settings.notifAlertDesc')}
            />
            <ConsentToggle
              checked={session.notifications.zone_updates}
              onCheckedChange={(checked) =>
                void updateSession({
                  notifications: { ...session.notifications, zone_updates: checked },
                })
              }
              label={t('settings.notifZones')}
              description={t('settings.notifZonesDesc')}
            />
          </div>
        </section>
      )}

      {/* Privacy & Consent */}
      {session && (
        <section className="flex flex-col gap-2.5">
          <h2 className="flex items-center gap-2 text-[1rem] font-bold text-[var(--text-primary)]">
            <ShieldCheck className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            <span>{t('settings.privacySection')}</span>
          </h2>
          <ConsentToggle
            checked={session.location_consent}
            onCheckedChange={(checked) =>
              void updateSession({
                location_consent: checked,
                consent_updated_at: new Date().toISOString(),
              })
            }
            label={t('settings.locationConsentLabel')}
            description={t('settings.locationConsentDesc')}
          />

          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="md" fullWidth onClick={() => setPolicyOpen(true)}>
              {t('settings.viewPolicyBtn')}
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={() => navigate('/onboarding')}>
              {t('settings.replayOnboardingBtn')}
            </Button>
          </div>
        </section>
      )}

      {/* Data Export & Delete */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[1rem] font-bold text-[var(--text-primary)]">
          {t('settings.dataSection')}
        </h2>
        <Card className="flex flex-col gap-3">
          <div>
            <Button variant="secondary" size="lg" fullWidth onClick={() => void handleExport()}>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{t('settings.exportBtn')}</span>
            </Button>
            <p className="mt-1.5 text-[0.875rem] text-[var(--text-secondary)]">
              {t('settings.exportDesc')}
            </p>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3">
            <Button
              variant="alert"
              size="lg"
              fullWidth
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>{t('settings.deleteBtn')}</span>
            </Button>
            <p className="mt-1.5 text-[0.875rem] text-[var(--text-secondary)]">
              {t('settings.deleteDesc')}
            </p>
          </div>
        </Card>
      </section>

      <p className="pb-2 text-center text-[0.8125rem] text-[var(--text-muted)]">
        {t('settings.appVersion')}
      </p>

      <PrivacyPolicySheet open={policyOpen} onOpenChange={setPolicyOpen} />

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('settings.deleteConfirmTitle')}
        description={t('settings.deleteConfirmDesc')}
        confirmLabel={t('settings.deleteConfirmBtn')}
        cancelLabel={t('common.cancel')}
        confirmVariant="alert"
        loading={busy}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
};
