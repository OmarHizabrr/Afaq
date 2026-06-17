import React from 'react';
import { Home } from 'lucide-react';
import ReportTextList from './ReportTextList';
import YesNoRadio from './YesNoRadio';

const VillageReportFields = ({
  value,
  onChange,
  showTitle = true,
  villageName = '',
  showAdditionalNotes = true,
  sectionTitle = 'القرية والنشاطات',
  readOnly = false,
}) => {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="village-report-fields">
      {showTitle && (
        <h3 className="village-report-fields__title">
          <Home size={18} /> {sectionTitle}
          {villageName ? <span className="village-report-fields__village">{villageName}</span> : null}
        </h3>
      )}
      <ReportTextList
        label="الأنشطة التي تمت في القرية من قبل المعلم"
        items={value.teacherVillageActivities || []}
        onChange={(teacherVillageActivities) => set({ teacherVillageActivities })}
        placeholder="وصف النشاط..."
        addLabel="إضافة نشاط"
        emptyHint="لم تُضف أنشطة بعد. اضغط «إضافة نشاط» لإضافة نشاط جديد."
        readOnly={readOnly}
      />
      <ReportTextList
        label="الأنشطة التي تمت في القرية من قبل المؤسسة"
        items={value.institutionVillageActivities || []}
        onChange={(institutionVillageActivities) => set({ institutionVillageActivities })}
        placeholder="وصف النشاط..."
        addLabel="إضافة نشاط"
        emptyHint="لم تُضف أنشطة بعد. اضغط «إضافة نشاط» لإضافة نشاط جديد."
        readOnly={readOnly}
      />
      <ReportTextList
        label="خطب الجمعة في القرية"
        items={value.fridaySermons || []}
        onChange={(fridaySermons) => set({ fridaySermons })}
        placeholder="موضوع أو ملخص الخطبة..."
        addLabel="إضافة خطبة"
        emptyHint="لم تُضف خطباً بعد. اضغط «إضافة خطبة» لإضافة خطبة جديدة."
        readOnly={readOnly}
      />
      <label className="app-field">
        <span className="app-label">عدد من دخل الإسلام جديداً في القرية</span>
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
          <span className="app-label">هل يوجد مشاريع للمؤسسة بالقرية؟</span>
          <p className="village-report-fields__readonly-value">{value.hasInstitutionProjects || '—'}</p>
        </div>
      ) : (
        <YesNoRadio
          label="هل يوجد مشاريع للمؤسسة بالقرية؟"
          name={`hasInstitutionProjects-${villageName || 'v'}`}
          value={value.hasInstitutionProjects || ''}
          onChange={(hasInstitutionProjects) =>
            set({
              hasInstitutionProjects,
              institutionProjectsStatus: hasInstitutionProjects === 'نعم' ? value.institutionProjectsStatus : '',
            })
          }
        />
      )}
      {value.hasInstitutionProjects === 'نعم' && (
        <label className="app-field">
          <span className="app-label">ما حالة المشاريع؟</span>
          <textarea
            className="app-input app-textarea"
            value={value.institutionProjectsStatus || ''}
            onChange={(e) => set({ institutionProjectsStatus: e.target.value })}
            placeholder="اكتب حالة المشاريع وتفاصيلها..."
            readOnly={readOnly}
            disabled={readOnly}
          />
        </label>
      )}
      {showAdditionalNotes && (
        <label className="app-field">
          <span className="app-label">ملاحظات إضافية (القرية)</span>
          <textarea
            className="app-input app-textarea"
            value={value.villageNotes || ''}
            onChange={(e) => set({ villageNotes: e.target.value })}
            placeholder="أي ملاحظات إضافية عن القرية..."
          />
        </label>
      )}
    </div>
  );
};

export default VillageReportFields;
