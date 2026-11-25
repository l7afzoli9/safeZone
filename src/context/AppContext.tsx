import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { UserSession, Zone } from '../types';

interface AppContextValue {
  session: UserSession | null;
  zones: Zone[];
  minDisplayThreshold: number;
  loading: boolean;
  error: boolean;
  refreshAll: () => Promise<void>;
  updateSession: (patch: Partial<UserSession>) => Promise<UserSession>;
  deleteAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [minDisplayThreshold, setMinDisplayThreshold] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      storage.cleanupLegacyData();
      const [sess, zonesData] = await Promise.all([
        api.getSession(),
        api.getZones(),
      ]);
      setSession(sess);
      setZones(zonesData.zones);
      setMinDisplayThreshold(zonesData.min_display_threshold);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const updateSession = useCallback(async (patch: Partial<UserSession>) => {
    const updated = await api.updateSession(patch);
    setSession(updated);
    return updated;
  }, []);

  const deleteAllData = useCallback(async () => {
    const cleanSession = await api.deleteMyData();
    const zonesData = await api.getZones();
    setSession(cleanSession);
    setZones(zonesData.zones);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      zones,
      minDisplayThreshold,
      loading,
      error,
      refreshAll,
      updateSession,
      deleteAllData,
    }),
    [
      session,
      zones,
      minDisplayThreshold,
      loading,
      error,
      refreshAll,
      updateSession,
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
