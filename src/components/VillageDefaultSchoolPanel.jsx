import React from 'react';
import { FileText, Settings2 } from 'lucide-react';
import AppSelect from './AppSelect';
import BusyButton from './BusyButton';
import useAppTranslation from '../hooks/useAppTranslation';


const VillageDefaultSchoolPanel = ({
  schools = [],
  defaultSchoolId,
  onDefaultSchoolChange,
  onSaveDefault,
  onAddReport,
  saving = false,
  canSetDefault = false,
  canAddReport = false,
  title,
  hint,
  emptyText,
  reportLabel,
  currentSchoolName = '',
}) => {
  const { t } = useAppTranslation();
  const resolvedTitle = title ?? t('components.VillageDefaultSchoolPanel.المدرسة_الافتراضية_للتقرير', 'المدرسة الافتراضية للتقرير');
  const resolvedHint =
    hint ??
    t(
      'components.VillageDefaultSchoolPanel.الافتراضي_التلقائي',
      'الافتراضي التلقائي هو أول مدرسة في القائمة، ويمكن تغييره يدويًا.'
    );
  const resolvedEmptyText =
    emptyText ?? t('components.VillageDefaultSchoolPanel.لا_مدارس_مرتبطة', 'لا توجد مدارس مرتبطة بهذه القرية.');
  const resolvedReportLabel =
    reportLabel ?? t('components.VillageDefaultSchoolPanel.إضافة_تقرير_المدرسة', 'إضافة تقرير المدرسة الافتراضية');
  const resolvedName =
    currentSchoolName || schools.find((s) => s.id === defaultSchoolId)?.name || '';

  return (
    <div className="villages-default-school surface-card">
      <strong className="villages-default-school__title">{resolvedTitle}</strong>
      {schools.length === 0 ? (
        <p className="villages-default-school__empty">{resolvedEmptyText}</p>
      ) : (
        <div className="villages-default-school__actions">
          <AppSelect searchable value={defaultSchoolId || ''} onChange={onDefaultSchoolChange}>
            {schools.map((sch) => (
              <option key={sch.id} value={sch.id}>
                {sch.name}
              </option>
            ))}
          </AppSelect>
          {canSetDefault ? (
            <BusyButton
              type="button"
              className="google-btn google-btn--toolbar villages-default-school__btn"
              busy={saving}
              onClick={onSaveDefault}
            >
              <Settings2 size={14} aria-hidden />
              {t('components.VillageDefaultSchoolPanel.حفظ_الافتراضي', 'حفظ الافتراضي')}
            </BusyButton>
          ) : null}
          {canAddReport ? (
            <button
              type="button"
              className="google-btn google-btn--filled google-btn--toolbar villages-default-school__btn villages-default-school__btn--report"
              disabled={!defaultSchoolId}
              onClick={onAddReport}
              title={defaultSchoolId ? resolvedReportLabel : t('components.VillageDefaultSchoolPanel.لا_توجد_مدرسة_افتراضية', 'لا توجد مدرسة افتراضية')}
            >
              <FileText size={14} aria-hidden />
              <span className="villages-default-school__report-long">{resolvedReportLabel}</span>
              <span className="villages-default-school__report-short">
                {t('components.VillageDefaultSchoolPanel.تقرير_افتراضي', 'تقرير افتراضي')}
              </span>
            </button>
          ) : null}
        </div>
      )}
      <p className="villages-default-school__hint">{resolvedHint}</p>
      {resolvedName ? (
        <div className="app-alert app-alert--info villages-default-school__current">
          {t('components.VillageDefaultSchoolPanel.المدرسة_الافتراضية_الحالية', 'المدرسة الافتراضية الحالية:')}{' '}
          <strong>{resolvedName}</strong>
        </div>
      ) : null}
    </div>
  );
};

export default VillageDefaultSchoolPanel;
