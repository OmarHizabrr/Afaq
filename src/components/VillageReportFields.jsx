import React from 'react';
import { Home } from 'lucide-react';
import ReportTextList from './ReportTextList';
import YesNoRadio from './YesNoRadio';
import useAppTranslation from '../hooks/useAppTranslation';


const VillageReportFields = ({
  value,
  onChange,
  showTitle = true,
  villageName = '',
  showAdditionalNotes = true,
  sectionTitle,
  readOnly = false,
}) => {
  const { t } = useAppTranslation();
  const resolvedSectionTitle =
    sectionTitle ?? t('components.VillageReportFields.القرية_والنشاطات', 'القرية والنشاطات');
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="village-report-fields">
      {showTitle && (
        <h3 className="village-report-fields__title">
          <Home size={18} /> {resolvedSectionTitle}
          {villageName ? <span className="village-report-fields__village">{villageName}</span> : null}
        </h3>
      )}
      <ReportTextList
        label={t('components.VillageReportFields.الأنشطة_التي_تمت_في_القرية_من_قبل_المعلم', 'الأنشطة التي تمت في القرية من قبل المعلم')}
        items={value.teacherVillageActivities || []}
        onChange={(teacherVillageActivities) => set({ teacherVillageActivities })}
        placeholder={t('components.VillageReportFields.وصف_النشاط', 'وصف النشاط...')}
        addLabel={t('components.VillageReportFields.إضافة_نشاط', 'إضافة نشاط')}
        emptyHint={t('components.VillageReportFields.لم_تُضف_أنشطة_بعد_اضغط_إضافة_نشاط_لإضافة_نشاط_جديد', 'لم تُضف أنشطة بعد. اضغط «إضافة نشاط» لإضافة نشاط جديد.')}
        readOnly={readOnly}
      />
      <ReportTextList
        label={t('components.VillageReportFields.الأنشطة_التي_تمت_في_القرية_من_قبل_المؤسسة', 'الأنشطة التي تمت في القرية من قبل المؤسسة')}
        items={value.institutionVillageActivities || []}
        onChange={(institutionVillageActivities) => set({ institutionVillageActivities })}
        placeholder={t('components.VillageReportFields.وصف_النشاط', 'وصف النشاط...')}
        addLabel={t('components.VillageReportFields.إضافة_نشاط', 'إضافة نشاط')}
        emptyHint={t('components.VillageReportFields.لم_تُضف_أنشطة_بعد_اضغط_إضافة_نشاط_لإضافة_نشاط_جديد', 'لم تُضف أنشطة بعد. اضغط «إضافة نشاط» لإضافة نشاط جديد.')}
        readOnly={readOnly}
      />
      <ReportTextList
        label={t('components.VillageReportDisplay.خطب_الجمعة_في_القرية', 'خطب الجمعة في القرية')}
        items={value.fridaySermons || []}
        onChange={(fridaySermons) => set({ fridaySermons })}
        placeholder={t('components.VillageReportFields.موضوع_أو_ملخص_الخطبة', 'موضوع أو ملخص الخطبة...')}
        addLabel={t('components.VillageReportFields.إضافة_خطبة', 'إضافة خطبة')}
        emptyHint={t('components.VillageReportFields.لم_تُضف_خطباً_بعد_اضغط_إضافة_خطبة_لإضافة_خطبة_جديدة', 'لم تُضف خطباً بعد. اضغط «إضافة خطبة» لإضافة خطبة جديدة.')}
        readOnly={readOnly}
      />
      <label className="app-field">
        <span className="app-label">{t('components.VillageReportFields.عدد_من_دخل_الإسلام', 'عدد من دخل الإسلام جديداً في القرية')}</span>
        <input
          className="app-input"
          type="number"
          min="0"
          value={value.newConvertsCount ?? ''}
          onChange={(e) => set({ newConvertsCount: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </label>
      {readOnly ? (
        <div className="app-field">
          <span className="app-label">{t('components.VillageReportFields.هل_يوجد_مشاريع_للمؤسسة_بالقرية؟', 'هل يوجد مشاريع للمؤسسة بالقرية؟')}</span>
          <p className="village-report-fields__readonly-value">{value.hasInstitutionProjects || '—'}</p>
        </div>
      ) : (
        <YesNoRadio
          label={t('components.VillageReportFields.هل_يوجد_مشاريع_للمؤسسة_بالقرية؟', 'هل يوجد مشاريع للمؤسسة بالقرية؟')}
          name={`hasInstitutionProjects-${villageName || 'v'}`}
          value={value.hasInstitutionProjects || ''}
          onChange={(hasInstitutionProjects) =>
            set({
              hasInstitutionProjects,
              institutionProjectsStatus: hasInstitutionProjects === t('components.ExplorationDynamicFieldBlock.نعم', 'نعم') ? value.institutionProjectsStatus : '',
            })
          }
        />
      )}
      {value.hasInstitutionProjects === t('components.ExplorationDynamicFieldBlock.نعم', 'نعم') && (
        <label className="app-field">
          <span className="app-label">{t('components.VillageReportFields.ما_حالة_المشاريع', 'ما حالة المشاريع؟')}</span>
          <textarea
            className="app-input app-textarea"
            value={value.institutionProjectsStatus || ''}
            onChange={(e) => set({ institutionProjectsStatus: e.target.value })}
            placeholder={t('components.VillageReportFields.اكتب_حالة_المشاريع_وتفاصيلها', 'اكتب حالة المشاريع وتفاصيلها...')}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </label>
      )}
      {showAdditionalNotes && (
        <label className="app-field">
          <span className="app-label">{t('components.VillageReportFields.ملاحظات_إضافية_القرية', 'ملاحظات إضافية (القرية)')}</span>
          <textarea
            className="app-input app-textarea"
            value={value.villageNotes || ''}
            onChange={(e) => set({ villageNotes: e.target.value })}
            placeholder={t('components.VillageReportFields.أي_ملاحظات_إضافية_عن_القرية', 'أي ملاحظات إضافية عن القرية...')}
          />
        </label>
      )}
    </div>
  );
};

export default VillageReportFields;
