import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Compass, Flag, Layers, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { IncidentReport } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmergencyCard } from '../components/domain/EmergencyButton';
import { ReportCard } from '../components/domain/ReportCard';
import { EmptyState, ErrorState, LoadingListSkeleton } from '../components/domain/EmptyState';

export const HomePage: React.FC = () => {
  const { t } = useI18n();
  const { zones, loading: appLoading, error: appError, refreshAll } = useApp();
  const navigate = useNavigate();

  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(true);
  const [reportsError, setReportsError] = useState<boolean>(false);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(false);
    try {
      const list = await api.getReports();
      setReports(list.slice(0, 3));
    } catch {
      setReportsError(true);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (appError) {
    return (
      <div className="px-4 py-6">
        <ErrorState onRetry={() => void refreshAll()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {/* Greeting & Primary Report Action */}
      <section aria-labelledby="home-hero-title">
        <p className="mb-2.5 text-[0.9375rem] font-medium text-[var(--text-secondary)]">
          {t('home.greeting')}
        </p>

        <Card
          className="border-transparent text-white shadow-[var(--shadow-elevated)]"
          style={{ background: 'var(--hero-gradient)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 id="home-hero-title" className="text-[1.375rem] font-extrabold leading-tight">
                {t('home.quickReportTitle')}
              </h1>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-white/90">
                {t('home.quickReportDesc')}
              </p>
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Flag className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <Button
            size="lg"
            fullWidth
            onClick={() => navigate('/report')}
            className="mt-4 bg-white text-[#0F5C66] hover:bg-white/90"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span>{t('home.quickReportCta')}</span>
          </Button>
        </Card>
      </section>

      {/* Emergency Official Numbers (19 & 177) */}
      <EmergencyCard />

      {/* Quick Link to Merged Map & Itineraries */}
      <Link
        to="/routes"
        className="flex min-h-[64px] items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--bg-subtle)]/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[1rem] font-bold text-[var(--text-primary)]">
                {t('routes.title')}
              </span>
              <Badge tone="primary">
                <Layers className="h-3 w-3" aria-hidden="true" />
                <span>{t('common.phase2Badge')}</span>
              </Badge>
            </div>
            <span className="block truncate text-[0.875rem] text-[var(--text-secondary)]">
              {t('heatmap.title')}
            </span>
          </div>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[var(--text-muted)] rtl:rotate-180"
          aria-hidden="true"
        />
      </Link>

      {/* Recent Reports Near You */}
      <section aria-labelledby="home-recent-title" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 id="home-recent-title" className="text-[1.125rem] font-bold text-[var(--text-primary)]">
              {t('home.recentReportsTitle')}
            </h2>
            <p className="text-[0.875rem] text-[var(--text-secondary)]">
              {t('home.recentReportsSubtitle')}
            </p>
          </div>
          <Link
            to="/routes"
            className="inline-flex min-h-[44px] shrink-0 items-center text-[0.875rem] font-bold text-[var(--primary)] hover:underline"
          >
            {t('home.viewMapLink')}
          </Link>
        </div>

        {appLoading || reportsLoading ? (
          <LoadingListSkeleton count={2} />
        ) : reportsError ? (
          <ErrorState onRetry={() => void loadReports()} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
            title={t('home.emptyReportsTitle')}
            description={t('home.emptyReportsDesc')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((rep) => (
              <ReportCard
                key={rep.id}
                report={rep}
                zone={zones.find((z) => z.id === rep.zone_id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
