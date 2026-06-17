import React, { useMemo } from 'react';
import { School, BookOpen } from 'lucide-react';
import AppSelect from './AppSelect';
import StarRatingInput from './StarRatingInput';

export default function VisitReportEditor({
  schoolOptions = [],
  villageOptions = [],
  curriculumList = [],
  value,
  onChange,
}) {
  const {
    schoolId = '',
    villageId = '',
    subjectId = '',
    week = '',
    generalNotes = '',
    teacherRating = 0,
    villageRating = 0,
  } = value || {};

  const patch = (partial) => onChange({ ...value, ...partial });

  const handleSchoolChange = (nextSchoolId) => {
    const school = schoolOptions.find((s) => s.id === nextSchoolId);
    patch({
      schoolId: nextSchoolId,
      villageId: school?.villageId || villageId,
    });
  };

  const selectedSubject = useMemo(
    () => curriculumList.find((c) => c.id === subjectId),
    [curriculumList, subjectId]
  );

  const availableWeeks = selectedSubject?.weeks || [];

  return (
    <div className="visit-report-editor">
      <div className="visit-report-editor__section">
        <h3 className="visit-report-editor__title">
          <School size={18} /> بيانات الزيارة الميدانية
        </h3>
        <div className="visit-report-editor__grid">
          <label className="app-field">
            <span className="app-label">المدرسة</span>
            <AppSelect
              searchable
              className="app-select"
              value={schoolId}
              onChange={(e) => handleSchoolChange(e.target.value)}
            >
              <option value="">— اختر المدرسة —</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="app-field">
            <span className="app-label">القرية</span>
            <AppSelect
              searchable
              className="app-select"
              value={villageId}
              onChange={(e) => patch({ villageId: e.target.value })}
            >
              <option value="">— اختر القرية —</option>
              {villageOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="app-field">
            <span className="app-label">المادة</span>
            <AppSelect
              searchable
              className="app-select"
              value={subjectId}
              onChange={(e) => patch({ subjectId: e.target.value, week: '' })}
            >
              <option value="">— اختر المادة —</option>
              {curriculumList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="app-field">
            <span className="app-label">الدرس / الأسبوع</span>
            <AppSelect
              searchable
              className="app-select"
              value={week}
              onChange={(e) => patch({ week: e.target.value })}
              disabled={!subjectId}
            >
              <option value="">— اختر الدرس —</option>
              {availableWeeks.map((w) => (
                <option key={w.week} value={String(w.week)}>
                  أسبوع {w.week}: {w.lesson || '—'}
                </option>
              ))}
            </AppSelect>
          </label>
        </div>
      </div>

      <div className="visit-report-editor__section">
        <h3 className="visit-report-editor__title">
          <BookOpen size={18} /> التقييم والملاحظات
        </h3>
        <div className="report-edit-form__two-cols report-edit-form__two-cols--start">
          <StarRatingInput
            label="تقييم المعلم (من 5 نجوم)"
            value={teacherRating}
            onChange={(n) => patch({ teacherRating: n })}
          />
          <StarRatingInput
            label="تقييم القرية (من 5 نجوم)"
            value={villageRating}
            onChange={(n) => patch({ villageRating: n })}
          />
        </div>
        <label className="app-field">
          <span className="app-label">ملاحظات المشرف</span>
          <textarea
            className="app-textarea"
            rows={4}
            value={generalNotes}
            onChange={(e) => patch({ generalNotes: e.target.value })}
            placeholder="ملاحظات وتوجيهات عن الزيارة..."
          />
        </label>
      </div>
    </div>
  );
}
