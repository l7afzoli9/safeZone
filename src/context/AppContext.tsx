import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../services/api';
import type {
  ActiveTrip,
  CreateTripInput,
  TrustedContact,
  UserSession,
  Zone,
} from '../types';

interface AppContextValue {
  session: UserSession | null;
  contacts: TrustedContact[];
  zones: Zone[];
  minDisplayThreshold: number;
  activeTrip: ActiveTrip | null;
  remainingSeconds: number;
  tripExpiredNotice: boolean;
  loading: boolean;
  error: boolean;
  refreshAll: () => Promise<void>;
  updateSession: (patch: Partial<UserSession>) => Promise<UserSession>;
  saveContact: (input: {
    id?: string;
    name: string;
    phone: string;
    relation_key: string;
  }) => Promise<TrustedContact[]>;
  deleteContact: (id: string) => Promise<TrustedContact[]>;
  startTrip: (input: CreateTripInput) => Promise<ActiveTrip>;
  pauseTrip: () => Promise<void>;
  resumeTrip: () => Promise<void>;
  triggerTripAlert: () => Promise<void>;
  endTrip: () => Promise<void>;
  dismissTripExpiredNotice: () => void;
  deleteAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [minDisplayThreshold, setMinDisplayThreshold] = useState<number>(5);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [tripExpiredNotice, setTripExpiredNotice] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const computeRemaining = useCallback((trip: ActiveTrip | null): number => {
    if (!trip) return 0;
    if (trip.status === 'paused' && trip.remaining_seconds_on_pause !== null) {
      return trip.remaining_seconds_on_pause;
    }
    return Math.max(0, Math.floor((new Date(trip.ends_at).getTime() - Date.now()) / 1000));
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [sess, cnts, zonesData, trip] = await Promise.all([
        api.getSession(),
        api.getContacts(),
        api.getZones(),
        api.getActiveTrip(),
      ]);
      setSession(sess);
      setContacts(cnts);
      setZones(zonesData.zones);
      setMinDisplayThreshold(zonesData.min_display_threshold);

      if (trip && trip.status !== 'paused' && new Date(trip.ends_at).getTime() <= Date.now()) {
        await api.endTrip();
        setActiveTrip(null);
        setRemainingSeconds(0);
        setTripExpiredNotice(true);
      } else {
        setActiveTrip(trip);
        setRemainingSeconds(computeRemaining(trip));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [computeRemaining]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!activeTrip) {
      setRemainingSeconds(0);
      return;
    }
    if (activeTrip.status === 'paused') {
      setRemainingSeconds(activeTrip.remaining_seconds_on_pause ?? 0);
      return;
    }

    const tick = () => {
      const secs = Math.max(
        0,
        Math.floor((new Date(activeTrip.ends_at).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(secs);
      if (secs <= 0) {
        void api.endTrip().then(() => {
          setActiveTrip(null);
          setTripExpiredNotice(true);
        });
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeTrip]);

  const updateSession = useCallback(async (patch: Partial<UserSession>) => {
    const updated = await api.updateSession(patch);
    setSession(updated);
    return updated;
  }, []);

  const saveContact = useCallback(
    async (input: { id?: string; name: string; phone: string; relation_key: string }) => {
      const next = await api.saveContact(input);
      setContacts(next);
      return next;
    },
    []
  );

  const deleteContact = useCallback(async (id: string) => {
    const next = await api.deleteContact(id);
    setContacts(next);
    return next;
  }, []);

  const startTrip = useCallback(async (input: CreateTripInput) => {
    const created = await api.startTrip(input);
    setTripExpiredNotice(false);
    setActiveTrip(created);
    setRemainingSeconds(input.duration_minutes * 60);
    return created;
  }, []);

  const pauseTrip = useCallback(async () => {
    if (!activeTrip) return;
    const updated = await api.pauseTrip(activeTrip);
    setActiveTrip(updated);
    setRemainingSeconds(updated.remaining_seconds_on_pause ?? 0);
  }, [activeTrip]);

  const resumeTrip = useCallback(async () => {
    if (!activeTrip) return;
    const updated = await api.resumeTrip(activeTrip);
    setActiveTrip(updated);
    setRemainingSeconds(computeRemaining(updated));
  }, [activeTrip, computeRemaining]);

  const triggerTripAlert = useCallback(async () => {
    if (!activeTrip) return;
    const updated = await api.triggerTripAlert(activeTrip);
    setActiveTrip(updated);
  }, [activeTrip]);

  const endTrip = useCallback(async () => {
    await api.endTrip();
    setActiveTrip(null);
    setRemainingSeconds(0);
    setTripExpiredNotice(false);
  }, []);

  const dismissTripExpiredNotice = useCallback(() => {
    setTripExpiredNotice(false);
  }, []);

  const deleteAllData = useCallback(async () => {
    const cleanSession = await api.deleteMyData();
    const zonesData = await api.getZones();
    setSession(cleanSession);
    setContacts([]);
    setActiveTrip(null);
    setRemainingSeconds(0);
    setTripExpiredNotice(false);
    setZones(zonesData.zones);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      contacts,
      zones,
      minDisplayThreshold,
      activeTrip,
      remainingSeconds,
      tripExpiredNotice,
      loading,
      error,
      refreshAll,
      updateSession,
      saveContact,
      deleteContact,
      startTrip,
      pauseTrip,
      resumeTrip,
      triggerTripAlert,
      endTrip,
      dismissTripExpiredNotice,
      deleteAllData,
    }),
    [
      session,
      contacts,
      zones,
      minDisplayThreshold,
      activeTrip,
      remainingSeconds,
      tripExpiredNotice,
      loading,
      error,
      refreshAll,
      updateSession,
      saveContact,
      deleteContact,
      startTrip,
      pauseTrip,
      resumeTrip,
      triggerTripAlert,
      endTrip,
      dismissTripExpiredNotice,
      deleteAllData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
