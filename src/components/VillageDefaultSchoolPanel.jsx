import React from 'react';
import { FileText, Settings2 } from 'lucide-react';
import AppSelect from './AppSelect';
import BusyButton from './BusyButton';

const VillageDefaultSchoolPanel = ({
  schools = [],
  defaultSchoolId,
  onDefaultSchoolChange,
  onSaveDefault,
  onAddReport,
  saving = false,
  canSetDefault = false,
  canAddReport = false,
  title = 'المدرسة الافتراضية للتقرير',
  hint = 'الافتراضي التلقائي هو أول مدرسة في القائمة، ويمكن تغييره يدويًا.',
  emptyText = 'لا توجد مدارس مرتبطة بهذه القرية.',
  reportLabel = 'إضافة تقرير المدرسة الافتراضية',
  currentSchoolName = '',
}) => {
  const resolvedName =
    currentSchoolName || schools.find((s) => s.id === defaultSchoolId)?.name || '';

  return (
    <div className="villages-default-school surface-card">
      <strong className="villages-default-school__title">{title}</strong>
      {schools.length === 0 ? (
        <p className="villages-default-school__empty">{emptyText}</p>
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
              حفظ الافتراضي
            </BusyButton>
          ) : null}
          {canAddReport ? (
            <button
              type="button"
              className="google-btn google-btn--filled google-btn--toolbar villages-default-school__btn villages-default-school__btn--report"
              disabled={!defaultSchoolId}
              onClick={onAddReport}
              title={defaultSchoolId ? reportLabel : 'لا توجد مدرسة افتراضية'}
            >
              <FileText size={14} aria-hidden />
              <span className="villages-default-school__report-long">{reportLabel}</span>
              <span className="villages-default-school__report-short">تقرير افتراضي</span>
            </button>
          ) : null}
        </div>
      )}
      <p className="villages-default-school__hint">{hint}</p>
      {resolvedName ? (
        <div className="app-alert app-alert--info villages-default-school__current">
          المدرسة الافتراضية الحالية: <strong>{resolvedName}</strong>
        </div>
      ) : null}
    </div>
  );
};

export default VillageDefaultSchoolPanel;
