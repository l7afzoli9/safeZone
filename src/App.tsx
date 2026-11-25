import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useI18n } from './i18n';
import { AppProvider, useApp } from './context/AppContext';
import { AppToaster } from './components/ui/Toast';
import { AppHeader } from './components/domain/AppHeader';
import { BottomNav } from './components/domain/BottomNav';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { StartTripPage } from './pages/StartTripPage';
import { ActiveTripPage } from './pages/ActiveTripPage';
import { ContactsPage } from './pages/ContactsPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { ZoneSafetyPage } from './pages/ZoneSafetyPage';
import { HeatMapScreen } from './pages/HeatMapScreen';
import { RouteHintsPage } from './pages/RouteHintsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingListSkeleton } from './components/domain/EmptyState';

const AppShellRoutes: React.FC = () => {
  const { t, dir } = useI18n();
  const { session, loading } = useApp();
  const location = useLocation();
  const isOnboardingRoute = location.pathname === '/onboarding';

  if (loading && !session) {
    return (
      <div className="app-shell" dir={dir}>
        <AppHeader />
        <main id="main-content" className="flex-1 px-4 py-6">
          <LoadingListSkeleton count={3} />
        </main>
      </div>
    );
  }

  if (session && !session.onboarding_completed && !isOnboardingRoute && location.pathname === '/') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="app-shell" dir={dir}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-2 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-[var(--primary-ink)]"
      >
        {t('app.skipToContent')}
      </a>

      <AppHeader />

      <main
        id="main-content"
        className={isOnboardingRoute ? 'flex flex-1 flex-col' : 'safe-pb flex-1'}
      >
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/trip/new" element={<StartTripPage />} />
          <Route path="/trip/active" element={<ActiveTripPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/report" element={<ReportIncidentPage />} />
          <Route path="/zones" element={<ZoneSafetyPage />} />
          <Route path="/map" element={<HeatMapScreen />} />
          <Route path="/routes" element={<RouteHintsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isOnboardingRoute && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <I18nProvider>
          <AppProvider>
            <BrowserRouter>
              <AppToaster />
              <AppShellRoutes />
            </BrowserRouter>
          </AppProvider>
        </I18nProvider>
      </ThemeProvider>
    </MotionConfig>
  );
};

export default App;
