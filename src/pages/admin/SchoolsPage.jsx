import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, School, Eye, MapPin, Handshake, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import ExplorationFormSection from '../../components/ExplorationFormSection';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import { useExplorationForm } from '../../hooks/useExplorationForm';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS, EXPLORATION_BRIDGE_ACTION_IDS } from '../../config/permissionRegistry';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterRegionsByScope,
  filterSchoolsByScope,
  filterVillagesByScope,
} from '../../utils/permissionDataScope';

const SCHOOL_LEVEL_OPTIONS = [
  { value: 'adults', label: 'كبار' },
  { value: 'children', label: 'صغار' },
];

const schoolLevelLabel = (v) => SCHOOL_LEVEL_OPTIONS.find((o) => o.value === v)?.label || 'غير محدد';

const SchoolsPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipMirrorGroupIds, membershipLoading, actorUser, explorationBridgeAllowed } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [schools, setSchools] = useState([]);
  const [regions, setRegions] = useState([]);
  const [villages, setVillages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);

  // Form State
  const [selectedRegId, setSelectedRegId] = useState('');
  const [selectedVilId, setSelectedVilId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('children');
  const [donorName, setDonorName] = useState('');
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.schools);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.schools);

      const [regDocs, vilDocs, schDocs] = await Promise.all([
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getCollectionGroupDocuments('schools'),
      ]);

      let schoolsRows = schDocs.map((doc) => {
        const data = doc.data() || {};
        const pathVillageId = doc.ref.parent.parent?.id || '';
        return {
          id: doc.id,
          ...data,
          pathVillageId: pathVillageId || data.villageId || '',
        };
      });

      if (scope === DATA_SCOPE_MEMBERSHIP) {
        schoolsRows = filterSchoolsByScope(schoolsRows, membershipGroupIds, scope);
      }

      let regionsRows = regDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      let villagesRows = vilDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        regionsRows = filterRegionsByScope(regionsRows, membershipGroupIds, scope);
        villagesRows = filterVillagesByScope(
          villagesRows,
          membershipGroupIds,
          schoolsRows,
          scope,
          membershipMirrorGroupIds
        );
      }

      setRegions(regionsRows);
      setVillages(villagesRows);
      setSchools(schoolsRows);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds, membershipMirrorGroupIds]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.schools) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchData();
  }, [ready, membershipLoading, fetchData, pageDataScope]);

  // Filter villages based on selected region
  const filteredVillages = selectedRegId 
    ? villages.filter(v => v.regionId === selectedRegId) 
    : villages;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!schoolName.trim() || !selectedVilId || !schoolLevel) {
      setError('يرجى إدخال اسم المدرسة واختيار القرية ونوع المدرسة (كبار / صغار)');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      
      const schoolData = {
        name: schoolName.trim(),
        villageId: selectedVilId,
        schoolLevel,
        donorName: donorName.trim() || '',
      };

      if (isEditing) {
        const pathVid = isEditing.pathVillageId || isEditing.villageId;
        if (!pathVid) {
          setError('تعذر تحديد مسار المدرسة في القاعدة. أعد تحميل الصفحة وحاول مرة أخرى.');
          setLoading(false);
          return;
        }
        if (selectedVilId === pathVid) {
          const docRef = api.getSchoolDoc(pathVid, isEditing.id);
          await api.updateData({ docRef, data: schoolData });
        } else {
          const oldRef = api.getSchoolDoc(pathVid, isEditing.id);
          const newRef = api.getSchoolDoc(selectedVilId, isEditing.id);
          await api.setData({ docRef: newRef, data: schoolData, merge: true });
          await api.deleteData(oldRef);
        }
      } else {
        const newSchId = api.getNewId('schools');
        const schRef = api.getSchoolDoc(selectedVilId, newSchId);
        await api.setData({ docRef: schRef, data: schoolData });
      }

      // Reset
      setSchoolName('');
      setSchoolLevel('children');
      setDonorName('');
      setSelectedVilId('');
      setSelectedRegId('');
      setIsAdding(false);
      setIsEditing(null);
      setError('');
      setSuccess(isEditing ? 'تم تحديث المدرسة بنجاح.' : 'تمت إضافة المدرسة بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الحفظ');
      setLoading(false);
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
    const villageId = expForm.getValueBySource('villages');
    if (!villageId) {
      setError('يجب أن يحتوي نموذج الاستكشاف على حقل مصدره «القرى» لربط المدرسة بقريتها.');
      return;
    }
    const fallbackName = expForm.selectedType?.name ? `مدرسة - ${expForm.selectedType.name}` : '';
    const derivedName = expForm.deriveDisplayName(fallbackName);
    if (!derivedName) {
      setError('لا يمكن استخراج اسم المدرسة من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".');
      return;
    }
    setExpSaving(true);
    try {
      const api = FirestoreApi.Api;
      const newSchId = api.getNewId('schools');
      await api.setData({
        docRef: api.getSchoolDoc(villageId, newSchId),
        data: {
          name: derivedName,
          villageId,
          schoolLevel: 'children',
          donorName: '',
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        userData: actorUser || {},
      });
      setIsExploringAdding(false);
      expForm.reset();
      setError('');
      setSuccess('تمت إضافة المدرسة من نموذج الاستكشاف بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الحفظ');
    } finally {
      setExpSaving(false);
    }
  };

  const handleEditClick = (sch) => {
    setIsEditing(sch);
    setIsAdding(true);
    const effectiveVilId = sch.pathVillageId || sch.villageId || '';
    setSelectedVilId(effectiveVilId);
    const vil = villages.find((v) => v.id === effectiveVilId);
    if (vil) setSelectedRegId(vil.regionId);
    setSchoolName(sch.name);
    setSchoolLevel(sch.schoolLevel || 'children');
    setDonorName(sch.donorName || '');
  };

  const handleDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      const schoolDoc = schools.find(s => s.id === id);
      if (!schoolDoc) return;

      const vid = schoolDoc.pathVillageId || schoolDoc.villageId;
      const docRef = api.getSchoolDoc(vid, id);
      await api.deleteData(docRef);
      setSuccess('تم حذف المدرسة بنجاح.');
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  const getVillageName = (vilId) => {
    const vil = villages.find(v => v.id === vilId);
    return vil ? vil.villageName : 'غير معروف';
  };

  return (
    <div>
      <PageHeader icon={School} title="إدارة المدارس">
        {can(PERMISSION_PAGE_IDS.schools, 'school_add') && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
              setSchoolLevel('children');
              setSchoolName('');
              setDonorName('');
              setSelectedVilId('');
              setSelectedRegId('');
            }}
          >
            <Plus size={18} />
            <span>إضافة مدرسة</span>
          </button>
        )}
        {can(PERMISSION_PAGE_IDS.schools, 'school_add') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => setIsExploringAdding(true)}
          >
            <Compass size={18} />
            <span>إضافة من الاستكشاف</span>
          </button>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.schools) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info schools-alert" style={{ marginBottom: '0.75rem' }}>
          عرض محدود: تظهر المدارس والقرى والمناطق المرتبطة بمجموعاتك فقط (عضوية مدرسة أو منطقة).
        </div>
      )}
      {error && <div className="app-alert app-alert--error schools-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success schools-alert">{success}</div>}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding}
        title={isEditing ? 'تعديل المدرسة' : 'إضافة مدرسة'}
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd} className="schools-form">
          <label className="app-label">تصفية حسب المنطقة</label>
          <AppSelect searchable value={selectedRegId} onChange={(e) => { setSelectedRegId(e.target.value); setSelectedVilId(''); }} className="schools-form__field-gap">
            <option value="">-- كل المناطق --</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </AppSelect>

          <label className="app-label">القرية (مطلوب)</label>
          <AppSelect searchable value={selectedVilId} onChange={(e) => setSelectedVilId(e.target.value)} className="schools-form__field-gap" required>
            <option value="">-- اختر القرية --</option>
            {filteredVillages.map(v => <option key={v.id} value={v.id}>{v.villageName}</option>)}
          </AppSelect>

          <label className="app-label">اسم المدرسة (مطلوب)</label>
          <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="app-input schools-form__field-gap" required placeholder="مثال: مدرسة النور" />

          <label className="app-label">نوع المدرسة (مطلوب)</label>
          <AppSelect searchable
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value)}
            className="schools-form__field-gap"
            required
          >
            {SCHOOL_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AppSelect>

          <label className="app-label">اسم المتبرع (اختياري)</label>
          <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} className="app-input schools-form__field-gap-lg" placeholder="فاعل خير" />

          <div className="schools-form__actions">
            <button type="button" onClick={() => setIsAdding(false)} className="google-btn schools-form__action-btn">
              إلغاء
            </button>
            <BusyButton type="submit" busy={loading} className="google-btn google-btn--filled schools-form__action-btn">
              حفظ المدرسة
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        title="إضافة مدرسة من نموذج الاستكشاف"
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd} className="schools-form">
          <div className="app-alert app-alert--info" style={{ marginBottom: '0.75rem' }}>
            النموذج يحتاج حقلاً مصدره «القرى» لربط المدرسة بقريتها.
          </div>
          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading="حقول نموذج الاستكشاف"
            currentPageId={PERMISSION_PAGE_IDS.schools}
          />

          <div className="schools-form__actions" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsExploringAdding(false)} className="google-btn schools-form__action-btn">
              إلغاء
            </button>
            <BusyButton type="submit" busy={expSaving} className="google-btn google-btn--filled schools-form__action-btn">
              حفظ المدرسة
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : schools.length === 0 ? (
        <div className="empty-state">
          لا توجد مدارس مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {schools.map(sch => (
            <div key={sch.id} className="surface-card surface-card--entity">
              <div>
                <h3 className="schools-card__title">{sch.name}</h3>
                <div className="schools-card__meta">
                  <span><MapPin size={14} /> القرية: {getVillageName(sch.pathVillageId || sch.villageId)}</span>
                  <span>النوع: {schoolLevelLabel(sch.schoolLevel)}</span>
                  {sch.donorName && <span className="schools-card__donor"><Handshake size={14} /> المتبرع: {sch.donorName}</span>}
                </div>
                <div style={{ marginTop: 6 }}>
                  {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                    <ExplorationBadge record={sch} onClick={() => setViewingExplorationOf(sch)} />
                  )}
                </div>
              </div>
              <div className="schools-card__actions">
                {can(PERMISSION_PAGE_IDS.schools, 'school_view') && (
                  <button className="icon-btn" onClick={() => navigate(`/schools/${sch.id}`)} title="عرض التفاصيل">
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.schools, 'school_edit') && (
                  <button className="icon-btn" onClick={() => handleEditClick(sch)} title="تعديل">
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.schools, 'school_delete') && (
                  <button className="icon-btn" onClick={() => setPendingDelete({ id: sch.id, name: sch.name })} title="حذف">
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
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={
          can(PERMISSION_PAGE_IDS.schools, 'school_edit') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)
        }
        fallbackName={viewingExplorationOf?.name}
        onSave={async ({ fieldValues, derivedName, selectedType, controller }) => {
          const target = viewingExplorationOf;
          if (!target) return;
          const api = FirestoreApi.Api;
          const pathVid = target.pathVillageId || target.villageId;
          if (!pathVid) throw new Error('تعذر تحديد مسار المدرسة في القاعدة.');
          const nextVillageId = controller.getValueBySource('villages') || pathVid;
          const nextData = {
            name: derivedName || target.name || '',
            villageId: nextVillageId,
            explorationTypeId: selectedType?.id || target.explorationTypeId || '',
            explorationTypeName: selectedType?.name || target.explorationTypeName || '',
            explorationFieldValues: fieldValues,
          };
          if (nextVillageId !== pathVid) {
            const { id: _id, pathVillageId: _pathVillageId, ...rest } = target;
            await api.setData({
              docRef: api.getSchoolDoc(nextVillageId, target.id),
              data: { ...rest, ...nextData },
              userData: actorUser || {},
            });
            await api.deleteData(api.getSchoolDoc(pathVid, target.id));
          } else {
            await api.updateData({
              docRef: api.getSchoolDoc(pathVid, target.id),
              data: nextData,
              userData: actorUser || {},
            });
          }
          setSuccess('تم تحديث بيانات نموذج المدرسة.');
          setError('');
          fetchData();
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف المدرسة"
        message={`سيتم حذف مدرسة "${pendingDelete?.name || ''}" نهائياً.`}
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

export default SchoolsPage;
