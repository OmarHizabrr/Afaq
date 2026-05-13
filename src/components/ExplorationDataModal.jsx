import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import FormModal from './FormModal';
import BusyButton from './BusyButton';
import ExplorationDataView from './ExplorationDataView';
import ExplorationFormSection from './ExplorationFormSection';
import { useExplorationForm } from '../hooks/useExplorationForm';

/**
 * مودال موحَّد لعرض/تعديل بيانات نموذج الاستكشاف لسجل.
 *
 * - يعمل افتراضياً للقراءة فقط، ويعرض زر «تعديل» إذا تم تمرير `onSave`.
 * - في وضع التعديل يستخدم نفس نوع الاستكشاف الأصلي للسجل ويزرع القيم
 *   الحالية، ثم يستدعي `onSave(payload)` ويُغلق المودال عند النجاح.
 *
 * payload الذي يصل `onSave`:
 *   - fieldValues: قيم الحقول بعد التطهير الجاهزة للحفظ
 *   - derivedName: اسم عرض مُشتقّ من حقول الاستكشاف (سلسلة فارغة إن لم يتوفر)
 *   - selectedType: { id, name }
 *   - controller: نفس واجهة الهوك (`getValueBySource`, `getValueByType`...) للاستخدام المتقدم
 */
const ExplorationDataModal = ({
  open,
  onClose,
  title,
  record,
  onSave,
  actorUser,
  storageUserId,
  canEdit = true,
  fallbackName,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // إعادة الضبط عند الإغلاق
  useEffect(() => {
    if (!open) {
      setEditing(false);
      setSaving(false);
      setError('');
    }
  }, [open]);

  const seed = useMemo(
    () => ({
      typeId: record?.explorationTypeId || '',
      values: record?.explorationFieldValues || {},
    }),
    [record?.explorationTypeId, record?.explorationFieldValues]
  );

  const expForm = useExplorationForm(open && editing, actorUser, seed);

  const canSwitchToEdit = Boolean(onSave) && canEdit && record?.explorationTypeId;

  const handleSave = async () => {
    if (saving) return;
    setError('');
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join('، ')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fieldValues: expForm.sanitize(),
        derivedName: expForm.deriveDisplayName(fallbackName || ''),
        selectedType: expForm.selectedType
          ? { id: expForm.selectedType.id, name: expForm.selectedType.name }
          : { id: record?.explorationTypeId || '', name: record?.explorationTypeName || '' },
        controller: expForm,
      };
      await onSave(payload);
      setEditing(false);
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'تعذر حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal open={open} onClose={onClose} size="lg" title={title || 'بيانات نموذج الاستكشاف'}>
      {editing ? (
        <>
          {error && (
            <div className="app-alert app-alert--error" style={{ marginBottom: '0.75rem' }}>{error}</div>
          )}
          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading="حقول نموذج الاستكشاف"
            hideTypeSelect
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="google-btn"
              style={{ width: 'auto', marginTop: 0 }}
              onClick={() => { setEditing(false); setError(''); }}
              disabled={saving}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <X size={14} aria-hidden /> إلغاء
              </span>
            </button>
            <BusyButton
              type="button"
              busy={saving}
              className="google-btn google-btn--filled"
              style={{ width: 'auto', marginTop: 0 }}
              onClick={handleSave}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} aria-hidden /> حفظ التعديلات
              </span>
            </BusyButton>
          </div>
        </>
      ) : (
        <>
          <ExplorationDataView
            explorationTypeId={record?.explorationTypeId}
            explorationTypeName={record?.explorationTypeName}
            explorationFieldValues={record?.explorationFieldValues}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            {canSwitchToEdit && (
              <button
                type="button"
                className="google-btn"
                style={{ width: 'auto', marginTop: 0 }}
                onClick={() => setEditing(true)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Edit2 size={14} aria-hidden /> تعديل بيانات النموذج
                </span>
              </button>
            )}
            <button
              type="button"
              className="google-btn"
              style={{ width: 'auto', marginTop: 0 }}
              onClick={onClose}
            >
              إغلاق
            </button>
          </div>
        </>
      )}
    </FormModal>
  );
};

export default ExplorationDataModal;
