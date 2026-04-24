import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Home, UserPlus, X, Eye, Save, ChevronDown, ChevronUp, Users } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import {
  MUSLIM_CATEGORY_BORN,
  normalizeMuslimCategory,
  villageMuslimCounterFields,
  enrollVillagePersonAsStudent,
  syncStudentDisplayNameAcrossStores,
  syncVillageListingPersonStudentFields,
  deleteVillageListedPersonFully,
} from '../../services/villageStudentEnrollment';

const VillagesPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [villages, setVillages] = useState([]);
  const [regions, setRegions] = useState([]);
  const [newMuslimsDocsByVillage, setNewMuslimsDocsByVillage] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingNewMuslimDelete, setPendingNewMuslimDelete] = useState(null);

  /** لوحة المهتدين السريعة داخل البطاقة */
  const [nmQuickVillageId, setNmQuickVillageId] = useState(null);
  const [nmDraftName, setNmDraftName] = useState('');
  const [nmDraftType, setNmDraftType] = useState('رجل');
  const [nmDraftCategory, setNmDraftCategory] = useState(normalizeMuslimCategory());
  const [nmEditingId, setNmEditingId] = useState(null);
  const [nmEditingName, setNmEditingName] = useState('');
  const [nmEditingType, setNmEditingType] = useState('رجل');
  const [nmEditingCategory, setNmEditingCategory] = useState(normalizeMuslimCategory());
  const [nmSaving, setNmSaving] = useState(false);

  // Form State
  const [selectedRegId, setSelectedRegId] = useState('');
  const [formData, setFormData] = useState({
    villageName: '',
    groupName: '',
    ltiName: '',
    populationCount: '',
    muslimsCount: '',
    nonMuslimsCount: ''
  });

  // Dynamic Array for new muslims before saving
  const [newMuslims, setNewMuslims] = useState([]);
  const [muslimName, setMuslimName] = useState('');
  const [muslimType, setMuslimType] = useState('رجل');
  const [muslimCategoryForm, setMuslimCategoryForm] = useState(normalizeMuslimCategory());

  const normalizeNewMuslims = (items) =>
    items
      .map((m) => ({
        id: m.id,
        name: (m.name || '').trim(),
        type: m.type || 'رجل',
        muslimCategory: normalizeMuslimCategory(m.muslimCategory),
      }))
      .filter((m) => m.name.length > 0);

  const syncVillageNewMuslims = async (api, villageId, nextItems, currentItems) => {
    const currentById = new Map(currentItems.filter((m) => m.id).map((m) => [m.id, m]));
    const nextWithIds = nextItems.filter((m) => m.id);
    const nextIds = new Set(nextWithIds.map((m) => m.id));

    const toDelete = currentItems.filter((m) => m.id && !nextIds.has(m.id));
    await Promise.all(toDelete.map((m) => deleteVillageListedPersonFully(api, m.id)));

    for (const m of nextItems) {
      const docId = m.id || api.getNewId('new_muslims');
      const old = currentById.get(docId);
      const mc = normalizeMuslimCategory(m.muslimCategory);
      const hadEnrollment = Boolean(old?.enrolledSchoolId);

      if (!hadEnrollment) {
        const { schoolId } = await enrollVillagePersonAsStudent(api, {
          personId: docId,
          villageId,
          displayName: m.name,
          listingType: m.type,
          muslimCategory: mc,
        });
        await api.setData({
          docRef: api.getNewMuslimDoc(docId),
          data: {
            villageId,
            name: m.name,
            type: m.type,
            muslimCategory: mc,
            enrolledSchoolId: schoolId,
          },
        });
      } else {
        await api.setData({
          docRef: api.getNewMuslimDoc(docId),
          data: { villageId, name: m.name, type: m.type, muslimCategory: mc },
          merge: true,
        });
        if (old.name !== m.name) {
          await syncStudentDisplayNameAcrossStores(api, docId, m.name);
        }
        if (old.type !== m.type || normalizeMuslimCategory(old.muslimCategory) !== mc) {
          await syncVillageListingPersonStudentFields(api, docId, { listingType: m.type, muslimCategory: mc });
        }
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      // Fetch regions, villages and linked new-muslims
      const [regDocs, vilDocs, newMuslimsDocs] = await Promise.all([
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getDocuments(api.getNewMuslimsCollection()),
      ]);

      setRegions(regDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setVillages(vilDocs.map(doc => ({ id: doc.id, ...doc.data() })));

      const grouped = {};
      newMuslimsDocs.forEach((doc) => {
        const data = doc.data();
        const villageId = data.villageId;
        if (!villageId) return;
        if (!grouped[villageId]) grouped[villageId] = [];
        grouped[villageId].push({
          id: doc.id,
          villageId,
          name: data.name || '',
          type: data.type || 'رجل',
          muslimCategory: normalizeMuslimCategory(data.muslimCategory),
          enrolledSchoolId: data.enrolledSchoolId || '',
        });
      });
      setNewMuslimsDocsByVillage(grouped);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addNewMuslimToList = () => {
    if (!muslimName.trim()) return;
    setNewMuslims((prev) => [
      ...prev,
      {
        name: muslimName.trim(),
        type: muslimType,
        muslimCategory: normalizeMuslimCategory(muslimCategoryForm),
      },
    ]);
    setMuslimName('');
  };

  const removeMuslimFromList = (index) => {
    setNewMuslims(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.villageName.trim() || !selectedRegId) {
      setError('يرجى إدخال اسم القرية واختيار المنطقة');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      
      const selectedRegion = regions.find(r => r.id === selectedRegId);
      const govId = selectedRegion ? selectedRegion.govId : null;

      const villageData = {
        ...formData,
        regionId: selectedRegId,
        govId: govId,
        populationCount: parseInt(formData.populationCount) || 0,
        muslimsCount: parseInt(formData.muslimsCount) || 0,
        nonMuslimsCount: parseInt(formData.nonMuslimsCount) || 0,
      };
      const normalizedNewMuslims = normalizeNewMuslims(newMuslims);
      const counters = villageMuslimCounterFields(normalizedNewMuslims);

      if (isEditing) {
        const docRef = api.getVillageDoc(isEditing.regionId, isEditing.id);
        await api.updateData({ docRef, data: { ...villageData, ...counters } });
        const currentItems = newMuslimsDocsByVillage[isEditing.id] || [];
        await syncVillageNewMuslims(api, isEditing.id, normalizedNewMuslims, currentItems);
      } else {
        const newVilId = api.getNewId('villages');
        const vilRef = api.getVillageDoc(selectedRegId, newVilId);
        
        await api.setData({
          docRef: vilRef,
          data: {
            ...villageData,
            ...counters,
          }
        });
        await syncVillageNewMuslims(api, newVilId, normalizedNewMuslims, []);
      }

      setFormData({ villageName: '', groupName: '', ltiName: '', populationCount: '', muslimsCount: '', nonMuslimsCount: '' });
      setSelectedRegId('');
      setNewMuslims([]);
      setIsAdding(false);
      setIsEditing(null);
      setError('');
      setSuccess(isEditing ? 'تم تحديث بيانات القرية بنجاح.' : 'تمت إضافة القرية بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      if (err.code === 'NO_SCHOOL_IN_VILLAGE') {
        setError('لا توجد مدرسة في هذه القرية لتسجيل المهتدين/المسلمين القدامى كطلاب. أضف مدرسة أولاً.');
      } else {
        setError('حدث خطأ أثناء الحفظ');
      }
      setLoading(false);
    }
  };

  const handleEditClick = (vil) => {
    setNmQuickVillageId(null);
    cancelNmQuickEdit();
    setIsEditing(vil);
    setIsAdding(true);
    setSelectedRegId(vil.regionId);
    setFormData({
      villageName: vil.villageName,
      groupName: vil.groupName || '',
      ltiName: vil.ltiName || '',
      populationCount: vil.populationCount || '',
      muslimsCount: vil.muslimsCount || '',
      nonMuslimsCount: vil.nonMuslimsCount || ''
    });
    setNewMuslims(
      (newMuslimsDocsByVillage[vil.id] || []).map((m) => ({
        ...m,
        muslimCategory: normalizeMuslimCategory(m.muslimCategory),
      }))
    );
  };

  const handleDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      const villageDoc = villages.find(v => v.id === id);
      if (!villageDoc) return;

      const linkedNewMuslims = newMuslimsDocsByVillage[id] || [];
      if (linkedNewMuslims.length > 0) {
        await Promise.all(linkedNewMuslims.map((m) => deleteVillageListedPersonFully(api, m.id)));
      }
      
      const docRef = api.getVillageDoc(villageDoc.regionId, id);
      await api.deleteData(docRef);
      setSuccess('تم حذف القرية بنجاح.');
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  const getRegionName = (regId) => {
    const reg = regions.find(r => r.id === regId);
    return reg ? reg.name : 'غير معروف';
  };

  const syncVillageNewMuslimCounters = async (regionId, villageId, items) => {
    const api = FirestoreApi.Api;
    await api.updateData({
      docRef: api.getVillageDoc(regionId, villageId),
      data: villageMuslimCounterFields(items),
    });
  };

  const patchVillageNewMuslims = (villageId, nextItems) => {
    setNewMuslimsDocsByVillage((prev) => ({ ...prev, [villageId]: nextItems }));
  };

  const cancelNmQuickEdit = () => {
    setNmEditingId(null);
    setNmEditingName('');
    setNmEditingType('رجل');
    setNmEditingCategory(normalizeMuslimCategory());
  };

  const toggleQuickNewMuslims = (vilId) => {
    setNmQuickVillageId((v) => (v === vilId ? null : vilId));
    setNmDraftName('');
    setNmDraftType('رجل');
    setNmDraftCategory(normalizeMuslimCategory());
    cancelNmQuickEdit();
  };

  const startNmQuickEdit = (m) => {
    setNmEditingId(m.id);
    setNmEditingName(m.name || '');
    setNmEditingType(m.type || 'رجل');
    setNmEditingCategory(normalizeMuslimCategory(m.muslimCategory));
  };

  const handleQuickAddNewMuslim = async (vil) => {
    if (!nmDraftName.trim() || nmQuickVillageId !== vil.id) return;
    setNmSaving(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const docId = api.getNewId('new_muslims');
      const mc = normalizeMuslimCategory(nmDraftCategory);
      const { schoolId } = await enrollVillagePersonAsStudent(api, {
        personId: docId,
        villageId: vil.id,
        displayName: nmDraftName.trim(),
        listingType: nmDraftType,
        muslimCategory: mc,
      });
      await api.setData({
        docRef: api.getNewMuslimDoc(docId),
        data: {
          villageId: vil.id,
          name: nmDraftName.trim(),
          type: nmDraftType,
          muslimCategory: mc,
          enrolledSchoolId: schoolId,
        },
      });
      const list = [
        ...(newMuslimsDocsByVillage[vil.id] || []),
        {
          id: docId,
          villageId: vil.id,
          name: nmDraftName.trim(),
          type: nmDraftType,
          muslimCategory: mc,
          enrolledSchoolId: schoolId,
        },
      ];
      patchVillageNewMuslims(vil.id, list);
      await syncVillageNewMuslimCounters(vil.regionId, vil.id, list);
      setNmDraftName('');
      setNmDraftType('رجل');
      setNmDraftCategory(normalizeMuslimCategory());
      setSuccess('تمت إضافة السجل وتسجيله كطالب في أول مدرسة بالقرية.');
    } catch (err) {
      console.error(err);
      if (err.code === 'NO_SCHOOL_IN_VILLAGE') {
        setError('لا توجد مدرسة في هذه القرية لتسجيل الطالب تلقائياً.');
      } else {
        setError('تعذر إضافة السجل.');
      }
    } finally {
      setNmSaving(false);
    }
  };

  const handleQuickSaveNewMuslim = async (vil) => {
    if (!nmEditingId || !nmEditingName.trim()) return;
    setNmSaving(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const prev = (newMuslimsDocsByVillage[vil.id] || []).find((x) => x.id === nmEditingId);
      const mc = normalizeMuslimCategory(nmEditingCategory);
      if (prev && prev.name !== nmEditingName.trim()) {
        await syncStudentDisplayNameAcrossStores(api, nmEditingId, nmEditingName.trim());
      }
      if (prev && (prev.type !== nmEditingType || normalizeMuslimCategory(prev.muslimCategory) !== mc)) {
        await syncVillageListingPersonStudentFields(api, nmEditingId, {
          listingType: nmEditingType,
          muslimCategory: mc,
        });
      }
      await api.updateData({
        docRef: api.getNewMuslimDoc(nmEditingId),
        data: { name: nmEditingName.trim(), type: nmEditingType, muslimCategory: mc },
      });
      const list = (newMuslimsDocsByVillage[vil.id] || []).map((m) =>
        m.id === nmEditingId
          ? { ...m, name: nmEditingName.trim(), type: nmEditingType, muslimCategory: mc }
          : m
      );
      patchVillageNewMuslims(vil.id, list);
      await syncVillageNewMuslimCounters(vil.regionId, vil.id, list);
      cancelNmQuickEdit();
      setSuccess('تم تحديث السجل.');
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ التعديل.');
    } finally {
      setNmSaving(false);
    }
  };

  const handleQuickDeleteNewMuslim = async (vil, m) => {
    setNmSaving(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      await deleteVillageListedPersonFully(api, m.id);
      const list = (newMuslimsDocsByVillage[vil.id] || []).filter((x) => x.id !== m.id);
      patchVillageNewMuslims(vil.id, list);
      await syncVillageNewMuslimCounters(vil.regionId, vil.id, list);
      if (nmEditingId === m.id) cancelNmQuickEdit();
      setSuccess('تم حذف السجل.');
    } catch (err) {
      console.error(err);
      setError('تعذر الحذف.');
    } finally {
      setNmSaving(false);
    }
  };

  return (
    <div>
      <PageHeader icon={Home} title="إدارة القرى" subtitle="البيانات الديموغرافية والمجموعات">
        {can(PERMISSION_PAGE_IDS.villages, 'village_add') && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
              setSelectedRegId('');
              setFormData({ villageName: '', groupName: '', ltiName: '', populationCount: '', muslimsCount: '', nonMuslimsCount: '' });
              setNewMuslims([]);
              setMuslimName('');
              setMuslimType('رجل');
              setMuslimCategoryForm(normalizeMuslimCategory());
              setNmQuickVillageId(null);
              cancelNmQuickEdit();
            }}
          >
            <Plus size={18} />
            <span>إضافة قرية جديدة</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error villages-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success villages-alert">{success}</div>}

      {/* Complex Add/Edit Modal */}
      <FormModal
        open={isAdding}
        title={null}
        size="lg"
        onClose={() => setIsAdding(false)}
      >
          <form onSubmit={handleAdd} className="villages-form">
          <h3 className="villages-form__title">البيانات الأساسية</h3>
          
          <div className="villages-form__grid">
            <div className="app-field app-field--grow">
              <label className="app-label">المنطقة التابعة لها</label>
              <AppSelect value={selectedRegId} onChange={(e) => setSelectedRegId(e.target.value)} required>
                <option value="">-- اختر المنطقة --</option>
                {regions.map(reg => (
                  <option key={reg.id} value={reg.id}>{reg.name} ({getRegionName(reg.id)})</option> // Simplified
                ))}
              </AppSelect>
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">اسم القرية</label>
              <input name="villageName" type="text" value={formData.villageName} onChange={handleInputChange} className="app-input" required />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">اسم الجروب</label>
              <input name="groupName" type="text" value={formData.groupName} onChange={handleInputChange} className="app-input" />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">اسم الـ LTI</label>
              <input name="ltiName" type="text" value={formData.ltiName} onChange={handleInputChange} className="app-input" />
            </div>
          </div>

          <hr className="villages-form__divider" />

          <h3 className="villages-form__title">الإحصائيات السكانية</h3>
          <div className="villages-form__grid villages-form__grid--stats">
            <div className="app-field app-field--grow">
              <label className="app-label">إجمالي السكان</label>
              <input name="populationCount" type="number" min="0" value={formData.populationCount} onChange={handleInputChange} className="app-input" />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">عدد المسلمين</label>
              <input name="muslimsCount" type="number" min="0" value={formData.muslimsCount} onChange={handleInputChange} className="app-input" />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">عدد غير المسلمين</label>
              <input name="nonMuslimsCount" type="number" min="0" value={formData.nonMuslimsCount} onChange={handleInputChange} className="app-input" />
            </div>
          </div>

          <hr className="villages-form__divider" />

          <div className="villages-form__head-row">
            <h3 className="villages-form__title villages-form__title--inline">سجل المهتدين والمسلمين القدامى (يُسجَّلون كطلاب في أول مدرسة بالقرية)</h3>
            <div className="villages-form__counter">
              الإجمالي: {newMuslims.length}
            </div>
          </div>
          
          <div className="villages-form__new-muslim-row">
            <div className="app-field app-field--grow">
              <label className="app-label">الاسم</label>
              <input type="text" value={muslimName} onChange={(e) => setMuslimName(e.target.value)} className="app-input" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewMuslimToList())} />
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">النوع</label>
              <AppSelect value={muslimType} onChange={(e) => setMuslimType(e.target.value)}>
                <option value="رجل">رجل</option>
                <option value="امرأة">امرأة</option>
                <option value="طفل">طفل</option>
              </AppSelect>
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">التصنيف</label>
              <AppSelect value={muslimCategoryForm} onChange={(e) => setMuslimCategoryForm(normalizeMuslimCategory(e.target.value))}>
                <option value="convert">مهتد جديد</option>
                <option value="born">مسلم قديم</option>
              </AppSelect>
            </div>
            <button type="button" onClick={addNewMuslimToList} className="google-btn google-btn--toolbar villages-form__new-muslim-btn">
              <UserPlus size={16} /> إضافة
            </button>
          </div>

          {newMuslims.length > 0 && (
            <div className="villages-form__new-muslims-list">
              {newMuslims.map((m, index) => (
                <div key={index} className={`villages-form__new-muslims-item ${index !== newMuslims.length - 1 ? 'villages-form__new-muslims-item--with-border' : ''}`}>
                  <span className="villages-form__new-muslims-name">
                    {m.name} — <span className="villages-form__new-muslims-type">{m.type}</span>
                    {' '}
                    <span className="villages-form__new-muslims-type" style={{ opacity: 0.85 }}>
                      ({normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN ? 'مسلم قديم' : 'مهتد'})
                    </span>
                  </span>
                  <X size={16} color="var(--danger-color)" style={{ cursor: 'pointer' }} onClick={() => removeMuslimFromList(index)} />
                </div>
              ))}
            </div>
          )}

          <div className="villages-form__actions">
            <button type="button" onClick={() => setIsAdding(false)} className="google-btn villages-form__action-btn">
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="google-btn google-btn--filled villages-form__action-btn villages-form__action-btn--primary">
              {loading ? 'جاري الحفظ...' : isEditing ? 'تحديث القرية' : 'حفظ القرية'}
            </button>
          </div>
          </form>
      </FormModal>

      {/* Villages List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : villages.length === 0 ? (
        <div className="empty-state">
          لا توجد قرى مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--lg">
          {villages.map((vil) => {
            const nmList = newMuslimsDocsByVillage[vil.id] || [];
            const isBorn = (m) => normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN;
            const convertsList = nmList.filter((m) => !isBorn(m));
            const bornList = nmList.filter(isBorn);
            return (
            <div key={vil.id} className="surface-card surface-card--village">
              <div className="villages-card__actions">
                {can(PERMISSION_PAGE_IDS.villages, 'village_view') && (
                  <button className="icon-btn" onClick={() => navigate(`/villages/${vil.id}`)} title="عرض التفاصيل الكاملة">
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.villages, 'village_edit') && (
                  <button className="icon-btn" onClick={() => handleEditClick(vil)} title="تعديل القرية">
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.villages, 'village_delete') && (
                  <button className="icon-btn" onClick={() => setPendingDelete({ id: vil.id, name: vil.villageName })} title="حذف القرية">
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
              
              <h3 className="villages-card__title">{vil.villageName}</h3>
              <p className="villages-card__subtitle">
                المنطقة: {getRegionName(vil.regionId)}
              </p>

              <div className="villages-card__stats">
                <div><Users size={14} /> السكان: {vil.populationCount}</div>
                <div>مسلمين: {vil.muslimsCount}</div>
                <div className="villages-card__stats-danger">غير المسلمين: {vil.nonMuslimsCount}</div>
                <div className="villages-card__stats-success">مهتدين (رجال): {convertsList.filter((m) => m.type === 'رجل').length}</div>
                <div className="villages-card__stats-success">مهتدين (نساء): {convertsList.filter((m) => m.type === 'امرأة').length}</div>
                <div className="villages-card__stats-success">مهتدين (أطفال): {convertsList.filter((m) => m.type === 'طفل').length}</div>
                <div className="villages-card__stats-success" style={{ opacity: 0.95 }}>مسلمون قدامى (رجال): {bornList.filter((m) => m.type === 'رجل').length}</div>
                <div className="villages-card__stats-success" style={{ opacity: 0.95 }}>مسلمون قدامى (نساء): {bornList.filter((m) => m.type === 'امرأة').length}</div>
                <div className="villages-card__stats-success" style={{ opacity: 0.95 }}>مسلمون قدامى (أطفال): {bornList.filter((m) => m.type === 'طفل').length}</div>
              </div>

              <div className="villages-card__meta">
                <span>جروب: {vil.groupName || '-'}</span>
                <span>LTI: {vil.ltiName || '-'}</span>
              </div>

              {(can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') ||
                can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') ||
                can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_delete')) && (
                <button
                  type="button"
                  className="google-btn google-btn--toolbar"
                  style={{ width: '100%', marginTop: '0.85rem' }}
                  onClick={() => toggleQuickNewMuslims(vil.id)}
                >
                  <UserPlus size={16} aria-hidden />
                  {nmQuickVillageId === vil.id ? (
                    <>
                      <ChevronUp size={16} aria-hidden />
                      <span>طي السجل</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} aria-hidden />
                      <span>مهتدون ومسلمون قدامى من البطاقة</span>
                    </>
                  )}
                </button>
              )}

              {nmQuickVillageId === vil.id && (
                <div
                  className="surface-card villages-quick-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="villages-quick-panel__hint">
                    يُسجَّل الشخص كطالب في أول مدرسة بالقرية (حسب الاسم). يُحدَّث عدّ القرية تلقائياً.
                  </p>
                  <div className="villages-quick-panel__entry-row">
                    <input
                      type="text"
                      value={nmDraftName}
                      onChange={(e) => setNmDraftName(e.target.value)}
                      placeholder="الاسم"
                      className="app-input"
                      disabled={nmSaving}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddNewMuslim(vil);
                        }
                      }}
                    />
                    <AppSelect
                      value={nmDraftType}
                      onChange={(e) => setNmDraftType(e.target.value)}
                      disabled={nmSaving}
                    >
                      <option value="رجل">رجل</option>
                      <option value="امرأة">امرأة</option>
                      <option value="طفل">طفل</option>
                    </AppSelect>
                    <AppSelect
                      value={nmDraftCategory}
                      onChange={(e) => setNmDraftCategory(normalizeMuslimCategory(e.target.value))}
                      disabled={nmSaving}
                    >
                      <option value="convert">مهتد</option>
                      <option value="born">مسلم قديم</option>
                    </AppSelect>
                    {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') && (
                      <button
                        type="button"
                        className="google-btn google-btn--filled"
                        style={{ marginTop: 0, width: 'auto', padding: '0 12px' }}
                        disabled={nmSaving}
                        onClick={() => handleQuickAddNewMuslim(vil)}
                      >
                        إضافة
                      </button>
                    )}
                  </div>
                  <div className="villages-quick-panel__list">
                    {(newMuslimsDocsByVillage[vil.id] || []).length === 0 ? (
                      <p className="villages-quick-panel__empty">
                        لا توجد سجلات بعد.
                      </p>
                    ) : (
                      (newMuslimsDocsByVillage[vil.id] || []).map((m) => (
                        <div key={m.id} className={`villages-quick-panel__item ${nmEditingId === m.id ? 'villages-quick-panel__item--editing' : ''}`}>
                          {nmEditingId === m.id ? (
                            <>
                              <input
                                type="text"
                                value={nmEditingName}
                                onChange={(e) => setNmEditingName(e.target.value)}
                                className="app-input"
                                disabled={nmSaving}
                              />
                              <AppSelect
                                value={nmEditingType}
                                onChange={(e) => setNmEditingType(e.target.value)}
                                disabled={nmSaving}
                              >
                                <option value="رجل">رجل</option>
                                <option value="امرأة">امرأة</option>
                                <option value="طفل">طفل</option>
                              </AppSelect>
                              <AppSelect
                                value={nmEditingCategory}
                                onChange={(e) => setNmEditingCategory(normalizeMuslimCategory(e.target.value))}
                                disabled={nmSaving}
                              >
                                <option value="convert">مهتد</option>
                                <option value="born">مسلم قديم</option>
                              </AppSelect>
                              <button
                                type="button"
                                className="icon-btn"
                                title="حفظ"
                                disabled={nmSaving}
                                onClick={() => handleQuickSaveNewMuslim(vil)}
                              >
                                <Save size={16} color="var(--success-color)" />
                              </button>
                              <button type="button" className="icon-btn" title="إلغاء" disabled={nmSaving} onClick={cancelNmQuickEdit}>
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span>
                                {m.name}{' '}
                                <span className="villages-quick-panel__item-type">
                                  ({m.type})
                                  {normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN
                                    ? ' · مسلم قديم'
                                    : ' · مهتد'}
                                </span>
                              </span>
                              <span style={{ display: 'flex', gap: '4px' }}>
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') && (
                                  <button type="button" className="icon-btn" title="تعديل" disabled={nmSaving} onClick={() => startNmQuickEdit(m)}>
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_delete') && (
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    title="حذف"
                                    disabled={nmSaving}
                                    onClick={() => setPendingNewMuslimDelete({ vil, m })}
                                  >
                                    <Trash2 size={16} color="var(--danger-color)" />
                                  </button>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف القرية"
        message={`سيتم حذف قرية "${pendingDelete?.name || ''}" وكل السجلات المرتبطة بها.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id);
        }}
      />

      <ConfirmDialog
        open={!!pendingNewMuslimDelete}
        title="حذف السجل"
        message={
          pendingNewMuslimDelete
            ? `حذف «${pendingNewMuslimDelete.m.name}» من سجل القرية «${pendingNewMuslimDelete.vil.villageName}» وإزالة حساب الطالب وارتباطاته؟`
            : ''
        }
        confirmLabel="حذف"
        danger
        onCancel={() => setPendingNewMuslimDelete(null)}
        onConfirm={async () => {
          const p = pendingNewMuslimDelete;
          setPendingNewMuslimDelete(null);
          if (p) await handleQuickDeleteNewMuslim(p.vil, p.m);
        }}
      />
    </div>
  );
};

export default VillagesPage;
