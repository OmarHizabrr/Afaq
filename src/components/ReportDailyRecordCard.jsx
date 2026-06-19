import React from 'react';
import AttendanceStatusIcon from './AttendanceStatusIcon';
import { attendanceStatusLabel, isAttendancePresent } from '../utils/attendanceStatus';
import useAppTranslation from '../hooks/useAppTranslation';

const ReportDailyRecordCard = ({ record }) => {
  const { t } = useAppTranslation();
  const present = isAttendancePresent(record);
  const status = record.attendanceStatus || (present ? 'present' : 'absent');
  const label = attendanceStatusLabel(record);

  return (
    <article className={`report-daily-record-card report-daily-record-card--${status}`}>
      <header className="report-daily-record-card__head">
        <span className="report-daily-record-card__name">{record.name}</span>
        <span className={`daily-prep-status-badge daily-prep-status-badge--${status}`}>
          <AttendanceStatusIcon status={status} size={16} className="daily-prep-status-badge__icon" />
          {label}
        </span>
      </header>
      <dl className="report-daily-record-card__fields">
        <div>
          <dt>{t('components.ReportDailyRecordCard.الحفظ', 'الحفظ')}</dt>
          <dd>{record.memorization || '—'}</dd>
        </div>
        <div>
          <dt>{t('components.ReportDailyRecordCard.المراجعة', 'المراجعة')}</dt>
          <dd>{record.review || '—'}</dd>
        </div>
        {record.note ? (
          <div className="report-daily-record-card__note">
            <dt>{t('components.ReportDailyRecordCard.ملاحظة', 'ملاحظة')}</dt>
            <dd>{record.note}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
};

export default ReportDailyRecordCard;
