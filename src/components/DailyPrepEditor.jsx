import React, { useMemo } from 'react';
import { School, BookOpen, Users, StickyNote, User } from 'lucide-react';
import AppSelect from './AppSelect';
import CurriculumLessonPicker from './CurriculumLessonPicker';
import AttendanceStatusIcon from './AttendanceStatusIcon';
import {
  PREP_PERIOD_OPTIONS,
  periodSaveLabel,
  prepDateFieldLabel,
  curriculumSectionTitle,
  getPeriodRange,
} from '../utils/dailyPrepForm';
import {
  ATTENDANCE_STATUSES,
  attendanceSummaryText,
  applyAttendanceStatus,
  countByAttendanceStatus,
  isAttendancePresent,
} from '../utils/attendanceStatus';
import useAppTranslation from '../hooks/useAppTranslation';

/**
 * واجهة التحضير الموحّدة — نفس شكل صفحة رفع التحضير.
 */
export default function DailyPrepEditor({
  schoolOptions = [],
  broadSchoolPick = true,
  curriculumList = [],
  value,
  onChange,
  teacherName = '',
  studentsLoading = false,
  onSchoolChange,
}) {
  const { t } = useAppTranslation();
  const {
    schoolId = '',
    prepPeriod = 'weekly',
    prepDate = '',
    curriculumEntries = [],
    records = [],
    prepNotes = '',
  } = value || {};

  const activeSchool = useMemo(
    () => schoolOptions.find((o) => o.id === schoolId),
    [schoolOptions, schoolId]
  );

  const periodRange = useMemo(
    () => getPeriodRange(prepPeriod, prepDate ? new Date(prepDate) : new Date()),
    [prepPeriod, prepDate]
  );

  const statusCounts = useMemo(() => countByAttendanceStatus(records), [records]);
  const presentCount = (statusCounts.present || 0) + (statusCounts.late || 0);

  const patch = (partial) => onChange({ ...value, ...partial });

  const pickSchool = (sid) => {
    patch({ schoolId: sid });
    onSchoolChange?.(sid);
  };

  const handleTrackingChange = (studentId, field, fieldValue) => {
    patch({
      records: records.map((item) =>
        item.studentId === studentId ? { ...item, [field]: fieldValue } : item
      ),
    });
  };

  const handleStatusChange = (studentId, status) => {
    patch({
      records: records.map((item) =>
        item.studentId === studentId ? applyAttendanceStatus(item, status) : item
      ),
    });
  };

  const markAllPresent = () => {
    patch({
      records: records.map((item) => applyAttendanceStatus(item, 'present')),
    });
  };

  const markAllAbsent = () => {
    patch({
      records: records.map((item) => applyAttendanceStatus(item, 'absent')),
    });
  };

  return (
    <div className="daily-prep-page daily-prep-page--embedded">
      <section className="surface-card daily-prep-setup">
        <h3 className="daily-prep-section__title">
          <School size={18} /> إعداد التحضير
        </h3>

        {teacherName && (
          <div className="daily-prep-setup__teacher">
            <span className="app-label">
              <User size={14} /> المعلم
            </span>
            <p className="daily-prep-setup__teacher-name">{teacherName}</p>
          </div>
        )}

        <div className="daily-prep-setup__school">
          <label className="app-label" htmlFor="daily-prep-edit-school">
            {broadSchoolPick ? t('components.DailyPrepEditor.اختر_المدرسة', 'اختر المدرسة') : t('components.DailyPrepEditor.المدرسة', 'المدرسة')}
          </label>
          {schoolOptions.length === 0 ? (
            <p className="daily-prep-setup__hint">لا توجد مدارس متاحة.</p>
          ) : broadSchoolPick || schoolOptions.length > 5 ? (
            <AppSelect
              id="daily-prep-edit-school"
              searchable
              value={schoolId}
              onChange={(e) => pickSchool(e.target.value)}
            >
              {schoolOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  🏫 {o.name}
                </option>
              ))}
            </AppSelect>
          ) : (
            <div className="daily-prep-school-grid" role="listbox" aria-label={t('components.DailyPrepEditor.اختيار_المدرسة', 'اختيار المدرسة')}>
              {schoolOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={schoolId === o.id}
                  className={`daily-prep-school-card${schoolId === o.id ? ' daily-prep-school-card--active' : ''}`}
                  onClick={() => pickSchool(o.id)}
                >
                  <School size={22} className="daily-prep-school-card__icon" />
                  <span>{o.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="daily-prep-setup__period">
          <span className="app-label">نوع الفترة</span>
          <div className="prep-period-chips" role="group" aria-label={t('components.DailyPrepEditor.نوع_فترة_التحضير', 'نوع فترة التحضير')}>
            {PREP_PERIOD_OPTIONS.map((o) => {
              const Icon = o.Icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`prep-period-chip${prepPeriod === o.value ? ' prep-period-chip--active' : ''}`}
                  onClick={() => patch({ prepPeriod: o.value })}
                  title={o.hint}
                >
                  <Icon size={16} className="prep-period-chip__icon" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="daily-prep-setup__dates">
          <div>
            <label className="app-label">{prepDateFieldLabel(prepPeriod)}</label>
            <input
              type="date"
              className="app-input"
              value={prepDate}
              onChange={(e) => patch({ prepDate: e.target.value })}
            />
          </div>
          <div>
            <label className="app-label">الفترة المحسوبة</label>
            <input className="app-input prep-period-card__range" value={periodRange.label} readOnly />
          </div>
        </div>

        {schoolId && (
          <div className="daily-prep-summary-bar">
            <span>
              <strong>{activeSchool?.name}</strong>
              {' • '}
              تحضير {periodSaveLabel(prepPeriod)}
              {' • '}
              {periodRange.label}
            </span>
            {!studentsLoading && records.length > 0 && (
              <span className="daily-prep-summary-bar__present">
                {attendanceSummaryText(records)}
              </span>
            )}
          </div>
        )}
      </section>

      {schoolId && (
        <section className="surface-card daily-prep-curriculum">
          <h3 className="daily-prep-section__title">
            <BookOpen size={18} />
            {curriculumSectionTitle(prepPeriod)}
          </h3>
          <CurriculumLessonPicker
            curriculumList={curriculumList}
            entries={curriculumEntries}
            onChange={(entries) => patch({ curriculumEntries: entries })}
            reportDate={prepDate}
          />
        </section>
      )}

      {!schoolId ? (
        <div className="empty-state">اختر مدرسة لعرض سجل الحضور.</div>
      ) : studentsLoading ? (
        <div className="loading-spinner page-loading" />
      ) : records.length === 0 ? (
        <div className="empty-state">لا يوجد طلاب في هذه المدرسة.</div>
      ) : (
        <section className="surface-card daily-prep-attendance">
          <div className="daily-prep-attendance__head">
            <h3 className="daily-prep-section__title daily-prep-section__title--flush">
              <Users size={18} /> سجل الحضور ({records.length} طالب)
            </h3>
            <span className="daily-prep-attendance__count">
              حاضر/متأخر: {presentCount} / {records.length}
            </span>
            <div className="teacher-daily-bulk daily-prep-attendance__bulk">
              <button
                type="button"
                className="google-btn google-btn--filled google-btn--success"
                onClick={markAllPresent}
              >
                <Users size={16} /> تحضير الجميع
              </button>
              <button type="button" className="google-btn" onClick={markAllAbsent}>
                الكل غائب
              </button>
            </div>
          </div>

          <div className="md-table-scroll">
            <table className="md-table daily-prep-table">
              <thead>
                <tr>
                  <th>حالة الحضور</th>
                  <th>اسم الطالب</th>
                  <th>مقدار الحفظ</th>
                  <th>مقدار المراجعة</th>
                  <th>ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const present = isAttendancePresent(record);
                  const status = record.attendanceStatus || (present ? 'present' : 'absent');
                  return (
                    <tr
                      key={record.studentId}
                      className={`daily-prep-table__row daily-prep-table__row--${status}${present ? '' : ' md-table__row--absent'}`}
                    >
                      <td className="daily-prep-table__status-cell">
                        <div className="daily-prep-status-cell">
                          <AttendanceStatusIcon status={status} size={20} />
                          <AppSelect
                            value={status}
                            onChange={(e) => handleStatusChange(record.studentId, e.target.value)}
                            className={`daily-prep-status-select daily-prep-status-select--${status}`}
                            aria-label={`حالة ${record.name}`}
                          >
                            {ATTENDANCE_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </AppSelect>
                        </div>
                      </td>
                      <td className={`daily-prep-table__name${present ? '' : ' daily-prep-table__name--absent'}`}>
                        {record.name}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="app-input daily-prep-table__input daily-prep-table__input--mem"
                          placeholder={present ? t('components.DailyPrepEditor.مثال_صفحة_10', 'مثال: صفحة 10') : '—'}
                          value={record.memorization || ''}
                          onChange={(e) =>
                            handleTrackingChange(record.studentId, 'memorization', e.target.value)
                          }
                          disabled={!present}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="app-input daily-prep-table__input daily-prep-table__input--rev"
                          placeholder={present ? t('components.DailyPrepEditor.مثال_جزء_عم', 'مثال: جزء عم') : '—'}
                          value={record.review || ''}
                          onChange={(e) =>
                            handleTrackingChange(record.studentId, 'review', e.target.value)
                          }
                          disabled={!present}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="app-input daily-prep-table__input"
                          placeholder={t('components.DailyPrepEditor.ملاحظة_على_الطالب', 'ملاحظة على الطالب...')}
                          value={record.note || ''}
                          onChange={(e) => handleTrackingChange(record.studentId, 'note', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="daily-prep-session-notes">
            <label className="app-label daily-prep-session-notes__label" htmlFor="prep-edit-session-notes">
              <StickyNote size={16} /> ملاحظات عامة على التحضير
            </label>
            <textarea
              id="prep-edit-session-notes"
              className="app-input daily-prep-session-notes__input"
              rows={3}
              placeholder={t('components.DailyPrepEditor.اكتب_أي_ملاحظات_تريد_إرفاقها_مع_هذا_التحضير', 'اكتب أي ملاحظات تريد إرفاقها مع هذا التحضير...')}
              value={prepNotes}
              onChange={(e) => patch({ prepNotes: e.target.value })}
            />
          </div>
        </section>
      )}
    </div>
  );
}
