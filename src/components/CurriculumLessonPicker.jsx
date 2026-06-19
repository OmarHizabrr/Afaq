import React, { useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, BookOpen } from 'lucide-react';
import AppSelect from './AppSelect';
import {
  TOTAL_WEEKS,
  buildCurriculumEntry,
  getExpectedWeekForDate,
  summarizeCurriculumProgress,
} from '../utils/curriculumProgress';
import useAppTranslation from '../hooks/useAppTranslation';

const statusIcon = (status) => {
  if (status === 'ahead') return <TrendingUp size={14} color="var(--success-color)" />;
  if (status === 'behind') return <TrendingDown size={14} color="var(--danger-color)" />;
  if (status === 'on_track') return <Minus size={14} color="var(--md-primary)" />;
  return null;
};

const statusClass = (status) => {
  if (status === 'ahead') return 'curriculum-picker__badge--ahead';
  if (status === 'behind') return 'curriculum-picker__badge--behind';
  if (status === 'on_track') return 'curriculum-picker__badge--track';
  return 'curriculum-picker__badge--unknown';
};

const CurriculumLessonPicker = ({ curriculumList = [], entries = [], onChange, reportDate }) => {
  const { t } = useAppTranslation();
  const expectedWeek = useMemo(() => getExpectedWeekForDate(reportDate ? new Date(reportDate) : new Date()), [reportDate]);
  const progressSummary = useMemo(
    () => summarizeCurriculumProgress(entries, reportDate ? new Date(reportDate) : new Date()),
    [entries, reportDate]
  );

  const usedSubjectIds = new Set(entries.map((e) => e.subjectId));
  const availableSubjects = curriculumList.filter((c) => !usedSubjectIds.has(c.id));

  const addSubject = (subjectId) => {
    if (!subjectId) return;
    const subj = curriculumList.find((c) => c.id === subjectId);
    if (!subj) return;
    onChange([...entries, buildCurriculumEntry(subj, [])]);
  };

  const removeSubject = (subjectId) => {
    onChange(entries.filter((e) => e.subjectId !== subjectId));
  };

  const toggleWeek = (subjectId, weekNum) => {
    onChange(
      entries.map((entry) => {
        if (entry.subjectId !== subjectId) return entry;
        const subj = curriculumList.find((c) => c.id === subjectId);
        const current = entry.selectedWeeks || [];
        const next = current.includes(weekNum)
          ? current.filter((w) => w !== weekNum)
          : [...current, weekNum].sort((a, b) => a - b);
        return buildCurriculumEntry(subj || { id: subjectId, name: entry.subjectName }, next);
      })
    );
  };

  return (
    <div className="curriculum-picker">
      <div className="curriculum-picker__head">
        <div>
          <h4 className="curriculum-picker__title">
            <BookOpen size={18} /> مواد التقرير من المناهج
          </h4>
          <p className="curriculum-picker__sub">
            الأسبوع المتوقع حسب الخطة: <strong>{expectedWeek}</strong> من {TOTAL_WEEKS}
          </p>
        </div>
        {availableSubjects.length > 0 && (
          <div className="curriculum-picker__add">
            <AppSelect
              searchable
              value=""
              onChange={(e) => {
                addSubject(e.target.value);
                e.target.value = '';
              }}
              className="curriculum-picker__add-select"
            >
              <option value="">{t('components.CurriculumLessonPicker.إضافة_مادة_من_المنهج', '+ إضافة مادة من المنهج')}</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </AppSelect>
            <div className="curriculum-picker__quick-add">
              {availableSubjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="curriculum-picker__quick-chip"
                  onClick={() => addSubject(s.id)}
                >
                  <Plus size={12} /> {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {progressSummary.length > 0 && (
        <div className="curriculum-picker__summary">
          {progressSummary.map((p) => (
            <div key={p.subjectId} className={`curriculum-picker__badge ${statusClass(p.status)}`}>
              {statusIcon(p.status)}
              <span className="curriculum-picker__badge-name">{p.subjectName}</span>
              <span className="curriculum-picker__badge-detail">
                {p.reportedWeek ? `أسبوع ${p.reportedWeek}` : t('components.CurriculumLessonPicker.لم_يُحدد', 'لم يُحدد')} / متوقع {p.expectedWeek}
              </span>
              <span className="curriculum-picker__badge-label">{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="curriculum-picker__empty">{t('components.CurriculumLessonPicker.اختر_مادة_واحدة_أو_أكثر_من_المناهج_لتحديد_الدروس_الأسبو', 'اختر مادة واحدة أو أكثر من المناهج لتحديد الدروس الأسبوعية.')}</p>
      ) : (
        entries.map((entry) => {
          const subj = curriculumList.find((c) => c.id === entry.subjectId);
          const weeks = subj?.weeks || [];
          const weekMap = Object.fromEntries(weeks.map((w) => [Number(w.week), w.lesson || '']));
          return (
            <div key={entry.subjectId} className="curriculum-picker__subject">
              <div className="curriculum-picker__subject-head">
                <h5>{entry.subjectName}</h5>
                <button type="button" className="icon-btn" title={t('components.CurriculumLessonPicker.إزالة_المادة', 'إزالة المادة')} onClick={() => removeSubject(entry.subjectId)}>
                  <Trash2 size={16} color="var(--danger-color)" />
                </button>
              </div>
              <div className="curriculum-picker__weeks">
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((weekNum) => {
                  const selected = (entry.selectedWeeks || []).includes(weekNum);
                  const isExpected = weekNum === expectedWeek;
                  const lesson = weekMap[weekNum] || '';
                  return (
                    <button
                      key={weekNum}
                      type="button"
                      className={`curriculum-picker__week ${selected ? 'curriculum-picker__week--selected' : ''} ${isExpected ? 'curriculum-picker__week--expected' : ''}`}
                      onClick={() => toggleWeek(entry.subjectId, weekNum)}
                      title={lesson || `أسبوع ${weekNum}`}
                    >
                      <span className="curriculum-picker__week-num">{weekNum}</span>
                      {lesson && <span className="curriculum-picker__week-lesson">{lesson}</span>}
                    </button>
                  );
                })}
              </div>
              {(entry.selectedWeeks || []).length > 0 && (
                <div className="curriculum-picker__selected-list">
                  {(entry.lessons || []).map((l) => (
                    <span key={l.week} className="curriculum-picker__chip">
                      أسبوع {l.week}: {l.lesson || '—'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default CurriculumLessonPicker;
