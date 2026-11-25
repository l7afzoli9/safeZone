import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import arDict from './ar.json';
import frDict from './fr.json';
import type { Language } from '../types';
import { storage } from '../services/storage';

type Dict = typeof frDict;

const DICTS: Record<Language, Dict> = {
  fr: frDict,
  ar: arDict,
};

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function getIntlLocale(lang: Language): string {
  return lang === 'fr' ? 'fr-MA' : 'ar-MA';
}

export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'fr' ? 'ltr' : 'rtl';
}

interface I18nContextValue {
  language: Language;
  dir: 'rtl' | 'ltr';
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tRaw: <T = unknown>(key: string) => T;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatTimer: (totalSeconds: number) => string;
  formatDateTime: (isoOrDate: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (isoDate: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => storage.getLanguage());

  const dir = getDirection(language);
  const intlLocale = getIntlLocale(language);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', dir);
    const titleVal = getNestedValue(DICTS[language], 'app.pageTitle');
    if (typeof titleVal === 'string') {
      document.title = titleVal;
    }
  }, [language, dir]);

  const setLanguage = useCallback((next: Language) => {
    toast.dismiss();
    storage.setLanguage(next);
    setLanguageState(next);
  }, []);

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(intlLocale, options).format(value);
    },
    [intlLocale]
  );

  const formatTimer = useCallback(
    (totalSeconds: number) => {
      const clamped = Math.max(0, Math.floor(totalSeconds));
      const mins = Math.floor(clamped / 60);
      const secs = clamped % 60;
      const fmt = new Intl.NumberFormat(intlLocale, { minimumIntegerDigits: 2, useGrouping: false });
      return `${fmt.format(mins)}:${fmt.format(secs)}`;
    },
    [intlLocale]
  );

  const formatDateTime = useCallback(
    (isoOrDate: string | Date, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
      if (Number.isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(
        intlLocale,
        options ?? {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      ).format(d);
    },
    [intlLocale]
  );

  const formatRelativeTime = useCallback(
    (isoDate: string) => {
      const d = new Date(isoDate);
      if (Number.isNaN(d.getTime())) return '';
      const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });
      const abs = Math.abs(diffSec);
      if (abs < 60) {
        const justNow = getNestedValue(DICTS[language], 'common.justNow');
        return typeof justNow === 'string' ? justNow : rtf.format(0, 'minute');
      }
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
      return rtf.format(Math.round(diffSec / 86400), 'day');
    },
    [intlLocale, language]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const raw = getNestedValue(DICTS[language], key) ?? getNestedValue(DICTS.fr, key);
      if (typeof raw !== 'string') return key;
      if (!params) return raw;
      return raw.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
        const val = params[token];
        if (val === undefined || val === null) return '';
        if (typeof val === 'number') {
          return new Intl.NumberFormat(intlLocale).format(val);
        }
        return String(val);
      });
    },
    [language, intlLocale]
  );

  const tRaw = useCallback(
    <T = unknown,>(key: string): T => {
      const raw = getNestedValue(DICTS[language], key) ?? getNestedValue(DICTS.fr, key);
      return raw as T;
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      dir,
      setLanguage,
      t,
      tRaw,
      formatNumber,
      formatTimer,
      formatDateTime,
      formatRelativeTime,
    }),
    [language, dir, setLanguage, t, tRaw, formatNumber, formatTimer, formatDateTime, formatRelativeTime]
  );

  return React.createElement(I18nContext.Provider, { value }, children);
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
