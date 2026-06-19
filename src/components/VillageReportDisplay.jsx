import React from 'react';
import { Home } from 'lucide-react';
import { villageReportFromStored } from '../utils/villageReportFields';
import useAppTranslation from '../hooks/useAppTranslation';


const ListBlock = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <div className="village-report-display__block">
      <h4 className="village-report-display__label">{title}</h4>
      <ol className="village-report-display__list">
        {items.map((item, i) => (
          <li key={`${i}-${item}`}>{item}</li>
        ))}
      </ol>
    </div>
  );
};

const VillageReportDisplay = ({ report, villageName = '' }) => {
  const { t } = useAppTranslation();
  const v = villageReportFromStored(report);
  const yesLabel = t('components.ExplorationDynamicFieldBlock.نعم', 'نعم');
  const hasLists =
    v.teacherVillageActivities.length > 0 ||
    v.institutionVillageActivities.length > 0 ||
    v.fridaySermons.length > 0;
  const hasMeta =
    Number(v.newConvertsCount) > 0 || v.hasInstitutionProjects || v.villageNotes || report.notes;

  if (!hasLists && !hasMeta) return null;

  return (
    <section className="village-report-display surface-card">
      <h3 className="village-report-display__title">
        <Home size={20} color="var(--md-primary)" aria-hidden />{' '}
        {t('components.VillageReportDisplay.تقرير_القرية', 'تقرير القرية')}
        {villageName || report.villageName ? (
          <span className="village-report-display__village">{villageName || report.villageName}</span>
        ) : null}
      </h3>
      <div className="village-report-display__stats">
        {Number(v.newConvertsCount) > 0 && (
          <div className="village-report-display__stat">
            <span className="village-report-display__stat-label">{t('utils.reportDetailsHtml.دخل_الإسلام_جديداً', 'دخل الإسلام جديداً')}</span>
            <strong>{v.newConvertsCount}</strong>
          </div>
        )}
        {v.hasInstitutionProjects && (
          <div className="village-report-display__stat">
            <span className="village-report-display__stat-label">{t('utils.reportDetailsHtml.مشاريع_المؤسسة', 'مشاريع المؤسسة')}</span>
            <strong>{v.hasInstitutionProjects}</strong>
          </div>
        )}
      </div>
      {(v.hasInstitutionProjects === yesLabel || v.hasInstitutionProjects === 'نعم') && v.institutionProjectsStatus && (
        <div className="village-report-display__notes">
          <h4 className="village-report-display__label">{t('utils.reportDetailsHtml.حالة_المشاريع', 'حالة المشاريع')}</h4>
          <p>{v.institutionProjectsStatus}</p>
        </div>
      )}
      <ListBlock title={t('components.VillageReportDisplay.أنشطة_المعلم_في_القرية', 'أنشطة المعلم في القرية')} items={v.teacherVillageActivities} />
      <ListBlock title={t('components.VillageReportDisplay.أنشطة_المؤسسة_في_القرية', 'أنشطة المؤسسة في القرية')} items={v.institutionVillageActivities} />
      <ListBlock title={t('components.VillageReportDisplay.خطب_الجمعة_في_القرية', 'خطب الجمعة في القرية')} items={v.fridaySermons} />
      {v.villageNotes && !report.notes && (
        <div className="village-report-display__notes">
          <h4 className="village-report-display__label">{t('pages.SchoolReportPage.ملاحظات_إضافية', 'ملاحظات إضافية')}</h4>
          <p>{v.villageNotes}</p>
        </div>
      )}
      {report.notes && (
        <div className="village-report-display__notes">
          <h4 className="village-report-display__label">{t('pages.SchoolReportPage.ملاحظات_إضافية', 'ملاحظات إضافية')}</h4>
          <p>{report.notes}</p>
        </div>
      )}
    </section>
  );
};

export default VillageReportDisplay;
