import React, { useMemo } from 'react';
import { School, BookOpen } from 'lucide-react';
import AppSelect from './AppSelect';
import StarRatingInput from './StarRatingInput';
import useAppTranslation from '../hooks/useAppTranslation';

export default function VisitReportEditor({
  schoolOptions = [],
  villageOptions = [],
  curriculumList = [],
  value,
  onChange,
}) {
  const { t } = useAppTranslation();
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
          <School size={18} /> {t('components.VisitReportEditor.بيانات_الزيارة_الميدانية', 'بيانات الزيارة الميدانية')}
        </h3>
        <div className="visit-report-editor__grid">
          <label className="app-field">
            <span className="app-label">{t('components.DailyPrepEditor.المدرسة', 'المدرسة')}</span>
            <AppSelect
              searchable
              className="app-select"
              value={schoolId}
              onChange={(e) => handleSchoolChange(e.target.value)}
            >
              <option value="">{t('components.VisitReportEditor.اختر_المدرسة', '— اختر المدرسة —')}</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="app-field">
            <span className="app-label">{t('pages.SchoolReportPage.القرية', 'القرية')}</span>
            <AppSelect
              searchable
              className="app-select"
              value={villageId}
              onChange={(e) => patch({ villageId: e.target.value })}
            >
              <option value="">{t('components.VisitReportEditor.اختر_القرية', '— اختر القرية —')}</option>
              {villageOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="app-field">
            <span className="app-label">{t('utils.reportDetailsHtml.المادة', 'المادة')}</span>
            <AppSelect
              searchable
              className="app-select"
              value={subjectId}
              onChange={(e) => patch({ subjectId: e.target.value, week: '' })}
            >
              <option value="">{t('components.VisitReportEditor.اختر_المادة', '— اختر المادة —')}</option>
              {curriculumList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="app-field">
            <span className="app-label">{t('components.VisitReportEditor.الدرس_الأسبوع', 'الدرس / الأسبوع')}</span>
            <AppSelect
              searchable
              className="app-select"
              value={week}
              onChange={(e) => patch({ week: e.target.value })}
              disabled={!subjectId}
            >
              <option value="">{t('components.VisitReportEditor.اختر_الدرس', '— اختر الدرس —')}</option>
              {availableWeeks.map((w) => (
                <option key={w.week} value={String(w.week)}>
                  {t('components.VisitReportEditor.أسبوع_w_week', `أسبوع ${w.week}: ${w.lesson || '—'}`)}
                </option>
              ))}
            </AppSelect>
          </label>
        </div>
      </div>

      <div className="visit-report-editor__section">
        <h3 className="visit-report-editor__title">
          <BookOpen size={18} /> {t('components.VisitReportEditor.التقييم_والملاحظات', 'التقييم والملاحظات')}
        </h3>
        <div className="report-edit-form__two-cols report-edit-form__two-cols--start">
          <StarRatingInput
            label={t('components.VisitReportEditor.تقييم_المعلم_من_5_نجوم', 'تقييم المعلم (من 5 نجوم)')}
            value={teacherRating}
            onChange={(n) => patch({ teacherRating: n })}
          />
          <StarRatingInput
            label={t('components.VisitReportEditor.تقييم_القرية_من_5_نجوم', 'تقييم القرية (من 5 نجوم)')}
            value={villageRating}
            onChange={(n) => patch({ villageRating: n })}
          />
        </div>
        <label className="app-field">
          <span className="app-label">{t('components.VisitReportEditor.ملاحظات_المشرف', 'ملاحظات المشرف')}</span>
          <textarea
            className="app-textarea"
            rows={4}
            value={generalNotes}
            onChange={(e) => patch({ generalNotes: e.target.value })}
            placeholder={t('components.VisitReportEditor.ملاحظات_وتوجيهات_عن_الزيارة', 'ملاحظات وتوجيهات عن الزيارة...')}
          />
        </label>
      </div>
    </div>
  );
}
