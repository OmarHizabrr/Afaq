import React, { useMemo } from 'react';
import AppSelect from './AppSelect';
import AttendanceStatusIcon from './AttendanceStatusIcon';

import { getAttendanceStatuses, isAttendancePresent } from '../utils/attendanceStatus';
import useAppTranslation from '../hooks/useAppTranslation';

const DailyPrepStudentCard = ({ record, onStatusChange, onTrackingChange }) => {
  const { t } = useAppTranslation();
  const attendanceStatuses = useMemo(() => getAttendanceStatuses(t), [t]);
  const present = isAttendancePresent(record);
  const status = record.attendanceStatus || (present ? 'present' : 'absent');

  return (
    <article
      className={`daily-prep-student-card daily-prep-student-card--${status}${present ? '' : ' daily-prep-student-card--inactive'}`}
    >
      <header className="daily-prep-student-card__head">
        <div className="daily-prep-student-card__identity">
          <AttendanceStatusIcon status={status} size={22} />
          <span className="daily-prep-student-card__name">{record.name}</span>
        </div>
        <AppSelect
          value={status}
          onChange={(e) => onStatusChange(record.studentId, e.target.value)}
          className={`daily-prep-status-select daily-prep-status-select--${status} daily-prep-student-card__status`}
          aria-label={t('components.DailyPrepEditor.حالة_record_name', `حالة ${record.name}`)}
        >
          {attendanceStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </AppSelect>
      </header>

      <div className="daily-prep-student-card__fields">
        <label className="daily-prep-student-card__field">
          <span>{t('components.DailyPrepStudentCard.مقدار_الحفظ', 'مقدار الحفظ')}</span>
          <input
            type="text"
            className="app-input daily-prep-table__input daily-prep-table__input--mem"
            placeholder={present ? t('components.DailyPrepEditor.مثال_صفحة_10', 'مثال: صفحة 10') : '—'}
            value={record.memorization}
            onChange={(e) => onTrackingChange(record.studentId, 'memorization', e.target.value)}
            disabled={!present}
          />
        </label>
        <label className="daily-prep-student-card__field">
          <span>{t('components.DailyPrepStudentCard.مقدار_المراجعة', 'مقدار المراجعة')}</span>
          <input
            type="text"
            className="app-input daily-prep-table__input daily-prep-table__input--rev"
            placeholder={present ? t('components.DailyPrepEditor.مثال_جزء_عم', 'مثال: جزء عم') : '—'}
            value={record.review}
            onChange={(e) => onTrackingChange(record.studentId, 'review', e.target.value)}
            disabled={!present}
          />
        </label>
        <label className="daily-prep-student-card__field daily-prep-student-card__field--full">
          <span>{t('components.DailyPrepStudentCard.ملاحظة', 'ملاحظة')}</span>
          <input
            type="text"
            className="app-input daily-prep-table__input"
            placeholder={t('components.DailyPrepEditor.ملاحظة_على_الطالب', 'ملاحظة على الطالب...')}
            value={record.note || ''}
            onChange={(e) => onTrackingChange(record.studentId, 'note', e.target.value)}
          />
        </label>
      </div>
    </article>
  );
};

export default DailyPrepStudentCard;
