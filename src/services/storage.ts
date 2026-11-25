import type {
  IncidentReport,
  Language,
  ThemePreference,
  UserSession,
  VoteChoice,
} from '../types';

const KEYS = {
  LANGUAGE: 'amin_language',
  THEME: 'amin_theme',
  SESSION: 'amin_session',
  USER_REPORTS: 'amin_user_reports',
  REPORT_VOTES: 'amin_report_votes',
} as const;

const LEGACY_KEYS = [
  'amin_contacts',
  'amin_contacts_initialized',
  'amin_active_trip',
] as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or private browsing guard
  }
}

export const storage = {
  cleanupLegacyData(): void {
    try {
      for (const legacyKey of LEGACY_KEYS) {
        localStorage.removeItem(legacyKey);
      }
    } catch {
      // Ignore storage access errors
    }
  },

  getLanguage(): Language {
    const val = localStorage.getItem(KEYS.LANGUAGE);
    if (val === 'ar' || val === 'fr') return val;
    if (val === 'ary') return 'ar';
    return 'fr';
  },

  setLanguage(lang: Language): void {
    localStorage.setItem(KEYS.LANGUAGE, lang);
  },

  getTheme(): ThemePreference {
    const val = localStorage.getItem(KEYS.THEME);
    if (val === 'system' || val === 'light' || val === 'dark') return val;
    return 'system';
  },

  setTheme(theme: ThemePreference): void {
    localStorage.setItem(KEYS.THEME, theme);
  },

  getSession(): UserSession | null {
    return readJson<UserSession | null>(KEYS.SESSION, null);
  },

  setSession(session: UserSession): void {
    writeJson(KEYS.SESSION, session);
    this.setLanguage(session.language);
    this.setTheme(session.theme);
  },

  getUserReports(): IncidentReport[] {
    return readJson<IncidentReport[]>(KEYS.USER_REPORTS, []);
  },

  setUserReports(reports: IncidentReport[]): void {
    writeJson(KEYS.USER_REPORTS, reports);
  },

  getReportVotes(): Record<string, VoteChoice> {
    return readJson<Record<string, VoteChoice>>(KEYS.REPORT_VOTES, {});
  },

  setReportVotes(votes: Record<string, VoteChoice>): void {
    writeJson(KEYS.REPORT_VOTES, votes);
  },

  clearAllUserData(): void {
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem(KEYS.USER_REPORTS);
    localStorage.removeItem(KEYS.REPORT_VOTES);
    this.cleanupLegacyData();
  },
};
