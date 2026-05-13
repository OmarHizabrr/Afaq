import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, MapPin, Map, Eye, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import BusyButton from '../../components/BusyButton';
import ExplorationFormSection from '../../components/ExplorationFormSection';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import { useExplorationForm } from '../../hooks/useExplorationForm';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterGovernoratesByScope,
  filterRegionsByScope,
} from '../../utils/permissionDataScope';

const RegionsPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [regions, setRegions] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  
  // Form State
  const [regionName, setRegionName] = useState('');
  const [selectedGovId, setSelectedGovId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const expForm = useExplorationForm(isExploringAdding, actorUser);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.regions);

      const govRef = api.getGovernoratesCollection();
      const [govDocs, regDocs] = await Promise.all([
        api.getDocuments(govRef),
        api.getCollectionGroupDocuments('regions'),
      ]);

      let regData = regDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      let govData = govDocs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (scope === DATA_SCOPE_MEMBERSHIP) {
        regData = filterRegionsByScope(regData, membershipGroupIds, scope);
        govData = filterGovernoratesByScope(govData, regData, scope);
      }

      setGovernorates(govData);
      setRegions(regData);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.regions) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchData();
  }, [ready, membershipLoading, fetchData, pageDataScope]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!regionName.trim() || !selectedGovId) {
      setError('يرجى إدخال اسم المنطقة واختيار المحافظة');
      return;
    }

    try {
      const api = FirestoreApi.Api;
      // The new ID is for the region document
      const regId = api.getNewId('regions');
      // The parent document in the 'regions' collection is named after the govId
      const docRef = api.getRegionDoc(selectedGovId, regId);
      
      await api.setData({
        docRef,
        data: { 
          name: regionName.trim(),
          govId: selectedGovId 
        }
      });

      setRegionName('');
      setSelectedGovId('');
      setIsAdding(false);
      setError('');
      setSuccess('تمت إضافة المنطقة بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الإضافة');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!regionName.trim() || !selectedGovId || !isEditing) {
      setError('يرجى إدخال اسم المنطقة واختيار المحافظة');
      return;
    }

    try {
      const api = FirestoreApi.Api;
      const docRef = api.getRegionDoc(isEditing.govId, isEditing.id);
      
      await api.updateData({
        docRef,
        data: { 
          name: regionName.trim(),
          govId: selectedGovId 
        }
      });

      setRegionName('');
      setSelectedGovId('');
      setIsEditing(null);
      setError('');
      setSuccess('تم تحديث المنطقة بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء التحديث');
    }
  };

  const startEdit = (region) => {
      setIsEditing(region);
      setRegionName(region.name);
      setSelectedGovId(region.govId);
      setIsAdding(false);
  };

  const handleDelete = async (region) => {
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getRegionDoc(region.govId, region.id);
      await api.deleteData(docRef);
      setSuccess('تم حذف المنطقة بنجاح.');
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  const handleExplorationAdd = async (e) => {
    e.preventDefault();
    if (expSaving) return;
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join('، ')}`);
      return;
    }
    const govId = expForm.getValueBySource('governorates');
    if (!govId) {
      setError('يجب أن يحتوي نموذج الاستكشاف على حقل مصدره «المحافظات» لاختيار المحافظة الأم.');
      return;
    }
    const fallbackName = expForm.selectedType?.name ? `منطقة - ${expForm.selectedType.name}` : '';
    const derivedName = expForm.deriveDisplayName(fallbackName);
    if (!derivedName) {
      setError('لا يمكن استخراج اسم المنطقة من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".');
      return;
    }
    setExpSaving(true);
    try {
      const api = FirestoreApi.Api;
      const regId = api.getNewId('regions');
      await api.setData({
        docRef: api.getRegionDoc(govId, regId),
        data: {
          name: derivedName,
          govId,
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        userData: actorUser || {},
      });
      setIsExploringAdding(false);
      expForm.reset();
      setSuccess('تمت إضافة المنطقة من نموذج الاستكشاف بنجاح.');
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الإضافة');
    } finally {
      setExpSaving(false);
    }
  };

  const getGovName = (govId) => {
    const gov = governorates.find(g => g.id === govId);
    return gov ? gov.name : 'غير معروف';
  };

  return (
    <div>
      <PageHeader icon={MapPin} title="إدارة المناطق">
        {can(PERMISSION_PAGE_IDS.regions, 'region_add') && (
          <>
            <button type="button" className="google-btn google-btn--toolbar" onClick={() => { setIsAdding(true); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }}>
              <Plus size={18} />
              <span>إضافة منطقة</span>
            </button>
            <button
              type="button"
              className="google-btn google-btn--toolbar"
              onClick={() => setIsExploringAdding(true)}
            >
              <Compass size={18} />
              <span>إضافة من الاستكشاف</span>
            </button>
          </>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.regions) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info" style={{ marginBottom: '1rem' }}>
          عرض محدود: المناطق والمحافظات الظاهرة مرتبطة بمجموعاتك (عضوية منطقة أو ما يترتب عليها).
        </div>
      )}
      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="app-alert app-alert--success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? 'تعديل المنطقة' : 'إضافة منطقة'}
        onClose={() => { setIsAdding(false); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }}
      >
        <form onSubmit={isEditing ? handleEdit : handleAdd}>
          <AppSelect searchable
            value={selectedGovId}
            onChange={(e) => setSelectedGovId(e.target.value)}
            className="app-select"
            style={{ marginBottom: '0.75rem' }}
          >
            <option value="">-- اختر المحافظة --</option>
            {governorates.map(gov => (
              <option key={gov.id} value={gov.id}>{gov.name}</option>
            ))}
          </AppSelect>

          <input 
            type="text" 
            placeholder="اسم المنطقة (مثال: أزال)"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            className="app-input"
            style={{ marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => { setIsAdding(false); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }}>
              إلغاء
            </button>
            <BusyButton type="submit" busy={loading} className="google-btn google-btn--filled" style={{ width: 'auto', marginTop: 0 }}>
              {isEditing ? 'تحديث' : 'حفظ'}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        title="إضافة منطقة من نموذج الاستكشاف"
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd}>
          <div className="app-alert app-alert--info" style={{ marginBottom: '0.75rem' }}>
            النموذج يحتاج حقلاً مصدره «المحافظات» لربط المنطقة بالمحافظة الأم.
          </div>
          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading="حقول نموذج الاستكشاف"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsExploringAdding(false)}>
              إلغاء
            </button>
            <BusyButton type="submit" busy={expSaving} className="google-btn google-btn--filled" style={{ width: 'auto', marginTop: 0 }}>
              حفظ المنطقة
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* Regions List */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : regions.length === 0 ? (
        <div className="empty-state">
          لا توجد مناطق مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {regions.map(region => (
            <div key={region.id} className="surface-card surface-card--entity">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '4px' }}>{region.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Map size={14} />
                  <span>المحافظة: {getGovName(region.govId)}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <ExplorationBadge record={region} onClick={() => setViewingExplorationOf(region)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {can(PERMISSION_PAGE_IDS.regions, 'region_view') && (
                  <button className="icon-btn" onClick={() => navigate(`/regions/${region.id}`)} title="عرض التفاصيل">
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.regions, 'region_edit') && (
                  <button className="icon-btn" onClick={() => startEdit(region)} title="تعديل">
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.regions, 'region_delete') && (
                  <button className="icon-btn" onClick={() => setPendingDelete(region)} title="حذف">
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={viewingExplorationOf ? `بيانات النموذج — ${viewingExplorationOf.name}` : 'بيانات النموذج'}
        record={viewingExplorationOf}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف المنطقة"
        message={`سيتم حذف المنطقة "${pendingDelete?.name || ''}" نهائياً.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item);
        }}
      />
    </div>
  );
};

export default RegionsPage;
