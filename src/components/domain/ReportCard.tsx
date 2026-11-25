import React from 'react';
import { AlertCircle, Clock, Eye, ShieldAlert, PackageX } from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';
import type { IncidentReport, IncidentType, Zone } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ZoneBadge } from './ZoneBadge';

const typeIcons: Record<IncidentType, React.ComponentType<{ className?: string }>> = {
  theft: PackageX,
  harassment: ShieldAlert,
  suspicious_activity: Eye,
  other: AlertCircle,
};

interface ReportCardProps {
  report: IncidentReport;
  zone?: Zone;
  className?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  zone,
  className,
}) => {
  const { t, formatRelativeTime } = useI18n();
  const Icon = typeIcons[report.incident_type] ?? AlertCircle;
  const noteText = report.note_key ? t(report.note_key) : report.note;

  return (
    <Card className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-ink)]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[1rem] font-bold leading-snug text-[var(--text-primary)]">
              {t(`report.types.${report.incident_type}`)}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.8125rem] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`report.times.${report.time_bucket}`)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatRelativeTime(report.created_at)}</span>
            </div>
          </div>
        </div>
        {report.is_anonymous && (
          <Badge tone="neutral" className="shrink-0">
            {t('common.anonymousBadge')}
          </Badge>
        )}
      </div>

      {zone && <ZoneBadge zone={zone} />}

      {noteText && (
        <p className="text-[0.9375rem] leading-relaxed text-[var(--text-secondary)]">
          {noteText}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
        <Badge tone="warning">{t('common.unverifiedLabel')}</Badge>
      </div>
    </Card>
  );
};
