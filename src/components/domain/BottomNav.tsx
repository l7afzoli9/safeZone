import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Compass,
  Flag,
  Home,
  Menu,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';
import { BottomSheet } from '../ui/BottomSheet';

export const BottomNav: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const primaryTabs = [
    { to: '/', label: t('nav.home'), icon: Home, end: true },
    { to: '/routes', label: t('nav.routes'), icon: Compass, end: false },
    { to: '/report', label: t('nav.reportShort'), icon: Flag, end: false },
  ];

  const secondaryItems = [
    {
      to: '/settings',
      label: t('nav.settings'),
      icon: Settings,
    },
    {
      to: '/onboarding',
      label: t('settings.replayOnboardingBtn'),
      icon: ShieldCheck,
    },
  ];

  return (
    <>
      <nav
        aria-label={t('app.name')}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md"
      >
        <div className="grid grid-cols-4 items-stretch px-1.5 py-1">
          {primaryTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 py-1 text-[0.75rem] font-semibold transition-colors',
                  isActive
                    ? 'text-[var(--primary)] bg-[var(--primary-soft)]/70'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--text-primary)]'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate leading-tight">{label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label={t('nav.openMenu')}
            className={cn(
              'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 py-1 text-[0.75rem] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--text-primary)] cursor-pointer',
              drawerOpen && 'bg-[var(--primary-soft)]/70 text-[var(--primary)]'
            )}
          >
            <Menu className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate leading-tight">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      <BottomSheet
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={t('nav.secondaryTitle')}
        description={t('nav.secondarySubtitle')}
      >
        <div className="flex flex-col gap-2">
          {secondaryItems.map(({ to, label, icon: Icon }) => (
            <button
              key={to}
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                navigate(to);
              }}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-start text-base font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
};
