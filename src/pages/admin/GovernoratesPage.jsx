import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Map, Eye, X, Save } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import BusyButton from '../../components/BusyButton';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterGovernoratesByScope,
  filterRegionsByScope,
} from '../../utils/permissionDataScope';

const GovernoratesPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = perm;
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null); // stores gubernorate object being edited
  const [govName, setGovName] = useState('');
  const [govCountry, setGovCountry] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showScopeNotice, setShowScopeNotice] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const fetchGovernorates = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.governorates);
      const ref = api.getGovernoratesCollection();
      const [govDocs, regDocs] = await Promise.all([
        api.getDocuments(ref),
        api.getCollectionGroupDocuments('regions'),
      ]);
      let regData = regDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      let data = govDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        regData = filterRegionsByScope(regData, membershipGroupIds, scope);
        data = filterGovernoratesByScope(data, regData, scope);
      }
      data.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
      setGovernorates(data);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.governorates) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchGovernorates();
  }, [ready, membershipLoading, fetchGovernorates, pageDataScope]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!ready) return;
    const scope = pageDataScope(PERMISSION_PAGE_IDS.governorates);
    setShowScopeNotice(scope === DATA_SCOPE_MEMBERSHIP);
  }, [ready, pageDataScope]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!govName.trim() || saving) return;

    try {
      setSaving(true);
      const api = FirestoreApi.Api;
      const docId = api.getNewId('governorates');
      const docRef = api.getGovernorateDoc(docId);
      
      await api.setData({
        docRef,
        data: { name: govName.trim(), country: govCountry.trim() }
      });

      setGovName('');
      setGovCountry('');
      setIsAdding(false);
      setSuccess('تمت إضافة المحافظة بنجاح.');
      setError('');
      fetchGovernorates(); // Refresh list
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الإضافة');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!govName.trim() || !isEditing || saving) return;

    try {
      setSaving(true);
      const api = FirestoreApi.Api;
      const docRef = api.getGovernorateDoc(isEditing.id);
      
      await api.updateData({
        docRef,
        data: { name: govName.trim(), country: govCountry.trim() }
      });

      setGovName('');
      setGovCountry('');
      setIsEditing(null);
      setSuccess('تم تحديث المحافظة بنجاح.');
      setError('');
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء التحديث');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (gov) => {
      setIsEditing(gov);
      setGovName(gov.name);
      setGovCountry(gov.country || '');
      setIsAdding(false);
  };

  const handleDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getGovernorateDoc(id);
      await api.deleteData(docRef);
      setSuccess('تم حذف المحافظة بنجاح.');
      setError('');
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  return (
    <div>
      <PageHeader icon={Map} title="إدارة المحافظات">
        {can(PERMISSION_PAGE_IDS.governorates, 'governorate_add') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => { setIsAdding(true); setIsEditing(null); setGovName(''); setGovCountry(''); }}>
            <Plus size={18} />
            <span>إضافة محافظة</span>
          </button>
        )}
      </PageHeader>

      {showScopeNotice && ready && pageDataScope(PERMISSION_PAGE_IDS.governorates) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>عرض محدود: المحافظات الظاهرة مرتبطة بمناطق مجموعاتك (عضوية منطقة أو ما يترتب عليها).</span>
          <button type="button" className="icon-btn" title="إغلاق" onClick={() => setShowScopeNotice(false)} style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="app-alert app-alert--error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>{error}</span>
          <button type="button" className="icon-btn" title="إغلاق" onClick={() => setError('')} style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="app-alert app-alert--success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>{success}</span>
          <button type="button" className="icon-btn" title="إغلاق" onClick={() => setSuccess('')} style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? 'تعديل المحافظة' : 'إضافة محافظة'}
        onClose={() => { setIsAdding(false); setIsEditing(null); setGovName(''); setGovCountry(''); }}
      >
        <form onSubmit={isEditing ? handleEdit : handleAdd}>
          <input 
            type="text" 
            placeholder="اسم المحافظة (مثال: صنعاء)"
            value={govName}
            onChange={(e) => setGovName(e.target.value)}
            autoFocus
            className="app-input"
            style={{ marginBottom: '1rem' }}
          />
          <input
            type="text"
            placeholder="الدولة (مثال: MALAWI)"
            value={govCountry}
            onChange={(e) => setGovCountry(e.target.value)}
            className="app-input"
            style={{ marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => { setIsAdding(false); setIsEditing(null); setGovName(''); setGovCountry(''); }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <X size={14} aria-hidden /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled" style={{ width: 'auto', marginTop: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} aria-hidden /> {isEditing ? 'تحديث' : 'حفظ'}
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* Governorates List */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : governorates.length === 0 ? (
        <div className="empty-state">
          لا توجد محافظات مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid">
          {governorates.map(gov => (
            <div key={gov.id} className="surface-card surface-card--entity">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{gov.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {gov.id.substring(0,8)}...</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  الدولة: {gov.country || 'غير محددة'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {can(PERMISSION_PAGE_IDS.governorates, 'governorate_view') && (
                  <button type="button" className="icon-btn" onClick={() => navigate(`/governorates/${gov.id}`)} title="عرض التفاصيل">
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.governorates, 'governorate_edit') && (
                  <button type="button" className="icon-btn" onClick={() => startEdit(gov)} title="تعديل">
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.governorates, 'governorate_delete') && (
                  <button type="button" className="icon-btn" onClick={() => setPendingDelete({ id: gov.id, name: gov.name })} title="حذف">
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
        title="تأكيد حذف المحافظة"
        message={`سيتم حذف المحافظة "${pendingDelete?.name || ''}" نهائياً.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id, item.name);
        }}
      />
    </div>
  );
};

export default GovernoratesPage;
