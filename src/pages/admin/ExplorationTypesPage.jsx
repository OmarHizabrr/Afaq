import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tags, X, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import FirestoreApi from '../../services/firestoreApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const ExplorationTypesPage = () => {
  const { can } = usePermissions();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const docs = await api.getDocuments(api.getExplorationTypesCollection());
      const rows = docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
      setTypes(rows);
    } catch (err) {
      console.error(err);
      setError('تعذر جلب أنواع الاستكشاف.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const clearForm = () => {
    setTypeName('');
    setDescription('');
    setIsAdding(false);
    setIsEditing(null);
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!typeName.trim() || saving) return;
    try {
      setSaving(true);
      const api = FirestoreApi.Api;
      if (isEditing) {
        await api.updateData({
          docRef: api.getExplorationTypeDoc(isEditing.id),
          data: {
            name: typeName.trim(),
            description: description.trim(),
          },
        });
        setSuccess('تم تحديث نوع الاستكشاف.');
      } else {
        const id = api.getNewId('exploration_types');
        await api.setData({
          docRef: api.getExplorationTypeDoc(id),
          data: {
            name: typeName.trim(),
            description: description.trim(),
          },
        });
        setSuccess('تمت إضافة نوع استكشاف جديد.');
      }
      clearForm();
      setError('');
      fetchTypes();
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ نوع الاستكشاف.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getExplorationTypeDoc(id));
      setSuccess('تم حذف نوع الاستكشاف.');
      setError('');
      fetchTypes();
    } catch (err) {
      console.error(err);
      setError('تعذر حذف نوع الاستكشاف.');
    }
  };

  const startEdit = (item) => {
    setIsEditing(item);
    setIsAdding(false);
    setTypeName(item.name || '');
    setDescription(item.description || '');
  };

  return (
    <div>
      <PageHeader icon={Tags} title="إدارة أنواع الاستكشاف">
        {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_add') && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => {
              clearForm();
              setIsAdding(true);
            }}
          >
            <Plus size={18} />
            <span>إضافة نوع</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error">{error}</div>}
      {success && <div className="app-alert app-alert--success">{success}</div>}

      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? 'تعديل نوع الاستكشاف' : 'إضافة نوع استكشاف'}
        onClose={clearForm}
      >
        <form onSubmit={onSave}>
          <label className="app-label">الاسم (مطلوب)</label>
          <input
            className="app-input"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="مثال: استكشاف بئر"
            required
            style={{ marginBottom: '0.75rem' }}
          />
          <label className="app-label">وصف مختصر</label>
          <textarea
            className="app-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="تفاصيل إضافية عن النوع (اختياري)"
            style={{ minHeight: '90px', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="google-btn" style={{ width: 'auto' }} onClick={clearForm}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled" style={{ width: 'auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> حفظ
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }} />
      ) : types.length === 0 ? (
        <div className="empty-state">لا توجد أنواع استكشاف مضافة حتى الآن.</div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {types.map((item) => (
            <div key={item.id} className="surface-card surface-card--entity">
              <div>
                <h3 style={{ margin: 0 }}>{item.name || 'بدون اسم'}</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {item.description || 'بدون وصف'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_edit') && (
                  <button type="button" className="icon-btn" title="تعديل" onClick={() => startEdit(item)}>
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.exploration_types, 'exploration_type_delete') && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="حذف"
                    onClick={() => setPendingDelete({ id: item.id, name: item.name })}
                  >
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف نوع الاستكشاف"
        message={`سيتم حذف النوع "${pendingDelete?.name || ''}" نهائياً.`}
        danger
        confirmLabel="حذف نهائي"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await onDelete(item.id);
        }}
      />
    </div>
  );
};

export default ExplorationTypesPage;
