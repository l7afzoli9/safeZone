import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Compass,
  Flag,
  Home,
  Map,
  Menu,
  Navigation,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/cn';
import { BottomSheet } from '../ui/BottomSheet';

export const BottomNav: React.FC = () => {
  const { t } = useI18n();
  const { activeTrip } = useApp();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const primaryTabs = [
    { to: '/', label: t('nav.home'), icon: Home, end: true },
    { to: '/zones', label: t('nav.zones'), icon: Map, end: false },
    { to: '/routes', label: t('nav.routes'), icon: Compass, end: false },
    { to: '/settings', label: t('nav.settings'), icon: Settings, end: false },
  ];

  const secondaryItems = [
    {
      to: '/map',
      label: t('heatmap.title'),
      icon: Map,
      highlight: false,
    },
    {
      to: activeTrip ? '/trip/active' : '/trip/new',
      label: activeTrip ? t('nav.activeTrip') : t('home.shareTripCta'),
      icon: Navigation,
      highlight: Boolean(activeTrip),
    },
    {
      to: '/contacts',
      label: t('nav.contacts'),
      icon: Users,
    },
    {
      to: '/report',
      label: t('nav.report'),
      icon: Flag,
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
        <div className="grid grid-cols-5 items-stretch px-1 py-1">
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
          {secondaryItems.map(({ to, label, icon: Icon, highlight }) => (
            <button
              key={to}
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                navigate(to);
              }}
              className={cn(
                'flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-start text-base font-semibold transition-colors cursor-pointer',
                highlight
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              )}
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
