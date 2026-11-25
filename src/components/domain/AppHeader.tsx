import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, Shield } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useApp } from '../../context/AppContext';
import type { Language } from '../../types';
import { cn } from '../../lib/cn';

const LANG_ORDER: Language[] = ['fr', 'ar'];

export const AppHeader: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const { updateSession } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === '/settings';

  const handleSelectLang = (lang: Language) => {
    setLanguage(lang);
    void updateSession({ language: lang }).catch(() => {});
  };

  return (
    <header className="safe-pt sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
      <div className="flex min-h-[58px] items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] px-1 text-start cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary)] text-[var(--primary-ink)] shadow-xs">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-[1.125rem] font-extrabold tracking-tight text-[var(--text-primary)]">
            {t('app.name')}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <div
            role="group"
            aria-label={t('languages.switcherLabel')}
            className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-0.5"
          >
            {LANG_ORDER.map((code) => {
              const active = language === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelectLang(code)}
                  aria-pressed={active}
                  aria-label={t(`languages.${code}`)}
                  className={cn(
                    'min-h-[36px] min-w-[36px] rounded-full px-2 text-[0.8125rem] font-bold transition-colors cursor-pointer',
                    active
                      ? 'bg-[var(--primary)] text-[var(--primary-ink)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {t(`languages.short.${code}`)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate(isSettings ? '/' : '/settings')}
            aria-label={t('nav.settings')}
            aria-current={isSettings ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer',
              isSettings
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
            )}
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
