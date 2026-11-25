import type {
  ActiveTrip,
  IncidentReport,
  Language,
  ThemePreference,
  TrustedContact,
  UserSession,
  VoteChoice,
} from '../types';

const KEYS = {
  LANGUAGE: 'amin_language',
  THEME: 'amin_theme',
  SESSION: 'amin_session',
  CONTACTS: 'amin_contacts',
  CONTACTS_INIT: 'amin_contacts_initialized',
  ACTIVE_TRIP: 'amin_active_trip',
  USER_REPORTS: 'amin_user_reports',
  REPORT_VOTES: 'amin_report_votes',
} as const;

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

  isContactsInitialized(): boolean {
    return localStorage.getItem(KEYS.CONTACTS_INIT) === '1';
  },

  getContacts(): TrustedContact[] {
    return readJson<TrustedContact[]>(KEYS.CONTACTS, []);
  },

  setContacts(contacts: TrustedContact[]): void {
    localStorage.setItem(KEYS.CONTACTS_INIT, '1');
    writeJson(KEYS.CONTACTS, contacts);
  },

  getActiveTrip(): ActiveTrip | null {
    return readJson<ActiveTrip | null>(KEYS.ACTIVE_TRIP, null);
  },

  setActiveTrip(trip: ActiveTrip | null): void {
    if (!trip) {
      localStorage.removeItem(KEYS.ACTIVE_TRIP);
      return;
    }
    writeJson(KEYS.ACTIVE_TRIP, trip);
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
    localStorage.removeItem(KEYS.CONTACTS);
    localStorage.setItem(KEYS.CONTACTS_INIT, '1'); // Keep empty instead of re-seeding mock defaults
    localStorage.removeItem(KEYS.ACTIVE_TRIP);
    localStorage.removeItem(KEYS.USER_REPORTS);
    localStorage.removeItem(KEYS.REPORT_VOTES);
  },
};
