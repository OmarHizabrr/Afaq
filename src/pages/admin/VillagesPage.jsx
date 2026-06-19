import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Home, UserPlus, X, Eye, Save, ChevronDown, ChevronUp, Users, FileText, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import ExplorationFormSection from '../../components/ExplorationFormSection';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import VillageDefaultSchoolPanel from '../../components/VillageDefaultSchoolPanel';
import VillageSchoolCheckboxGroup from '../../components/VillageSchoolCheckboxGroup';
import { useExplorationForm } from '../../hooks/useExplorationForm';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS, EXPLORATION_BRIDGE_ACTION_IDS } from '../../config/permissionRegistry';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterRegionsByScope,
  filterSchoolsByScope,
  filterVillagesByScope,
} from '../../utils/permissionDataScope';
import {
  MUSLIM_CATEGORY_BORN,
  normalizeMuslimCategory,
  villageMuslimCounterFields,
  enrollVillagePersonAsStudent,
  syncStudentDisplayNameAcrossStores,
  syncVillageListingPersonStudentFields,
  deleteVillageListedPersonFully,
} from '../../services/villageStudentEnrollment';
import useAppTranslation from '../../hooks/useAppTranslation';

const VillagesPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipMirrorGroupIds, membershipLoading, actorUser, explorationBridgeAllowed } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [villages, setVillages] = useState([]);
  const [regions, setRegions] = useState([]);
  const [newMuslimsDocsByVillage, setNewMuslimsDocsByVillage] = useState({});
  /** @type {Record<string, { id: string, name: string }[]>} */
  const [schoolsByVillage, setSchoolsByVillage] = useState({});
  const [defaultSchoolByVillage, setDefaultSchoolByVillage] = useState({});
  const [savingDefaultSchoolForVillageId, setSavingDefaultSchoolForVillageId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingNewMuslimDelete, setPendingNewMuslimDelete] = useState(null);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);

  /** لوحة المهتدين السريعة داخل البطاقة */
  const [nmQuickVillageId, setNmQuickVillageId] = useState(null);
  const [nmDraftName, setNmDraftName] = useState('');
  const [nmDraftType, setNmDraftType] = useState(t('pages.VillageDetailsPage.رجل', 'رجل'));
  const [nmDraftCategory, setNmDraftCategory] = useState(normalizeMuslimCategory());
  /** مدارس القرية المختارة للتسجيل السريع (افتراضي أول مدرسة) */
  const [nmDraftSchoolIds, setNmDraftSchoolIds] = useState([]);
  const [nmEditingId, setNmEditingId] = useState(null);
  const [nmEditingName, setNmEditingName] = useState('');
  const [nmEditingType, setNmEditingType] = useState(t('pages.VillageDetailsPage.رجل', 'رجل'));
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
  const [muslimType, setMuslimType] = useState(t('pages.VillageDetailsPage.رجل', 'رجل'));
  const [muslimCategoryForm, setMuslimCategoryForm] = useState(normalizeMuslimCategory());
  /** عند تعديل القرية: المدارس التي يُسجَّل فيها كل سجل جديد من نموذج القرية */
  const [villageModalSchoolIds, setVillageModalSchoolIds] = useState([]);

  /* ============================================================
   * مودال «الإضافة من نموذج الاستكشاف»: ينشئ قرية باستخدام حقول
   * نموذج الاستكشاف فقط (لاسم القرية والمنطقة)، مع الإبقاء على
   * بلوك «سجل المهتدين والمسلمين القدامى» المخصص للقرى.
   * ============================================================ */
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSavingExploration, setExpSavingExploration] = useState(false);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.villages);

  /* سجل المهتدين والمسلمين القدامى ضمن نفس المودال */
  const [expNewMuslims, setExpNewMuslims] = useState([]);
  const [expMuslimName, setExpMuslimName] = useState('');
  const [expMuslimType, setExpMuslimType] = useState(t('pages.VillageDetailsPage.رجل', 'رجل'));
  const [expMuslimCategoryForm, setExpMuslimCategoryForm] = useState(normalizeMuslimCategory());

  const resetExplorationNewMuslims = () => {
    setExpNewMuslims([]);
    setExpMuslimName('');
    setExpMuslimType(t('pages.VillageDetailsPage.رجل', 'رجل'));
    setExpMuslimCategoryForm(normalizeMuslimCategory());
  };

  const openExplorationAddModal = () => {
    resetExplorationNewMuslims();
    setIsExploringAdding(true);
  };

  const addExpNewMuslimToList = () => {
    if (!expMuslimName.trim()) return;
    setExpNewMuslims((prev) => [
      ...prev,
      {
        name: expMuslimName.trim(),
        type: expMuslimType,
        muslimCategory: normalizeMuslimCategory(expMuslimCategoryForm),
      },
    ]);
    setExpMuslimName('');
  };

  const removeExpMuslimFromList = (index) => {
    setExpNewMuslims((prev) => prev.filter((_, i) => i !== index));
  };

  const normalizeNewMuslims = (items) =>
    items
      .map((m) => ({
        id: m.id,
        name: (m.name || '').trim(),
        type: m.type || t('pages.VillageDetailsPage.رجل', 'رجل'),
        muslimCategory: normalizeMuslimCategory(m.muslimCategory),
      }))
      .filter((m) => m.name.length > 0);

  const syncVillageNewMuslims = async (api, villageId, nextItems, currentItems, preferredSchoolIds = null) => {
    const currentById = new Map(currentItems.filter((m) => m.id).map((m) => [m.id, m]));
    const nextWithIds = nextItems.filter((m) => m.id);
    const nextIds = new Set(nextWithIds.map((m) => m.id));

    const toDelete = currentItems.filter((m) => m.id && !nextIds.has(m.id));
    await Promise.all(toDelete.map((m) => deleteVillageListedPersonFully(api, m.id)));

    const schoolIdsForNew =
      Array.isArray(preferredSchoolIds) && preferredSchoolIds.length > 0 ? preferredSchoolIds : null;

    for (const m of nextItems) {
      const docId = m.id || api.getNewId('new_muslims');
      const old = currentById.get(docId);
      const mc = normalizeMuslimCategory(m.muslimCategory);
      const hadEnrollment = Boolean(
        old?.enrolledSchoolId || (Array.isArray(old?.enrolledSchoolIds) && old.enrolledSchoolIds.length)
      );

      if (!hadEnrollment) {
        const { schoolIds } = await enrollVillagePersonAsStudent(api, {
          personId: docId,
          villageId,
          displayName: m.name,
          listingType: m.type,
          muslimCategory: mc,
          schoolIds: schoolIdsForNew,
        });
        await api.setData({
          docRef: api.getNewMuslimDoc(docId),
          data: {
            villageId,
            name: m.name,
            type: m.type,
            muslimCategory: mc,
            enrolledSchoolId: schoolIds[0],
            enrolledSchoolIds: schoolIds,
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      // Fetch regions, villages and linked new-muslims
      const [regDocs, vilDocs, newMuslimsDocs, schoolDocs] = await Promise.all([
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getDocuments(api.getNewMuslimsCollection()),
        api.getCollectionGroupDocuments('schools'),
      ]);

      const scope = pageDataScope(PERMISSION_PAGE_IDS.villages);
      let schoolsRows = schoolDocs.map((doc) => {
        const data = doc.data() || {};
        const pathVillageId = doc.ref.parent.parent?.id || '';
        return {
          id: doc.id,
          ...data,
          pathVillageId: pathVillageId || data.villageId || '',
        };
      });
      let regionsRows = regDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      let villagesRows = vilDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        schoolsRows = filterSchoolsByScope(schoolsRows, membershipGroupIds, scope);
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
      const allowedVillageIds = new Set(villagesRows.map((v) => v.id));

      const byVil = {};
      schoolsRows.forEach((row) => {
        const vid = row.villageId || row.pathVillageId;
        if (!vid) return;
        if (!byVil[vid]) byVil[vid] = [];
        byVil[vid].push({ id: row.id, name: (row.name || '').trim() || row.id });
      });
      Object.keys(byVil).forEach((k) => {
        byVil[k].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      });
      setSchoolsByVillage(byVil);
      const defaults = {};
      villagesRows.forEach((v) => {
        const list = byVil[v.id] || [];
        if (!list.length) {
          defaults[v.id] = '';
          return;
        }
        const valid = list.some((s) => s.id === v.defaultSchoolId);
        defaults[v.id] = valid ? v.defaultSchoolId : list[0].id;
      });
      setDefaultSchoolByVillage(defaults);

      const grouped = {};
      newMuslimsDocs.forEach((doc) => {
        const data = doc.data();
        const villageId = data.villageId;
        if (!villageId || !allowedVillageIds.has(villageId)) return;
        if (!grouped[villageId]) grouped[villageId] = [];
        const enrolledSchoolIds =
          Array.isArray(data.enrolledSchoolIds) && data.enrolledSchoolIds.length > 0
            ? data.enrolledSchoolIds
            : data.enrolledSchoolId
              ? [data.enrolledSchoolId]
              : [];
        grouped[villageId].push({
          id: doc.id,
          villageId,
          name: data.name || '',
          type: data.type || t('pages.VillageDetailsPage.رجل', 'رجل'),
          muslimCategory: normalizeMuslimCategory(data.muslimCategory),
          enrolledSchoolId: data.enrolledSchoolId || enrolledSchoolIds[0] || '',
          enrolledSchoolIds,
        });
      });
      setNewMuslimsDocsByVillage(grouped);
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_جلب_البيانات', 'حدث خطأ أثناء جلب البيانات'));
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds, membershipMirrorGroupIds]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.villages) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchData();
  }, [ready, membershipLoading, fetchData, pageDataScope]);

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
      setError(t('pages.VillagesPage.يرجى_إدخال_اسم_القرية_واختيار_المنطقة', 'يرجى إدخال اسم القرية واختيار المنطقة'));
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
        await syncVillageNewMuslims(api, isEditing.id, normalizedNewMuslims, currentItems, villageModalSchoolIds);
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
      setVillageModalSchoolIds([]);
      setError('');
      setSuccess(isEditing ? t('pages.VillagesPage.تم_تحديث_بيانات_القرية_بنجاح', 'تم تحديث بيانات القرية بنجاح.') : t('pages.VillagesPage.تمت_إضافة_القرية_بنجاح', 'تمت إضافة القرية بنجاح.'));
      fetchData();
    } catch (err) {
      console.error(err);
      if (err.code === 'NO_SCHOOL_IN_VILLAGE') {
        setError(t('pages.VillagesPage.لا_توجد_مدرسة_في_هذه_القرية_لتسجيل_المهتدين_المسلمين_القدامى', 'لا توجد مدرسة في هذه القرية لتسجيل المهتدين/المسلمين القدامى كطلاب. أضف مدرسة أولاً.'));
      } else {
        setError(t('pages.SchoolsPage.حدث_خطأ_أثناء_الحفظ', 'حدث خطأ أثناء الحفظ'));
      }
      setLoading(false);
    }
  };

  const handleExplorationAdd = async (e) => {
    e.preventDefault();
    if (expSavingExploration) return;
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`${t('components.ExplorationDataModal.الحقول_التالية_مطلوبة_أو_غير_صالحة', 'الحقول التالية مطلوبة أو غير صالحة:')} ${missing.join(t('components.ExplorationDataModal.،', '، '))}`);
      return;
    }
    const regionId = expForm.getValueBySource('regions');
    if (!regionId) {
      setError(t('pages.VillagesPage.يجب_أن_يحتوي_نموذج_الاستكشاف_على_حقل_مصدره_المناطق_لربط_القر', 'يجب أن يحتوي نموذج الاستكشاف على حقل مصدره «المناطق» لربط القرية بمنطقتها.'));
      return;
    }
    const fallbackName = expForm.selectedType?.name ? `قرية - ${expForm.selectedType.name}` : '';
    const derivedVillageName = expForm.deriveDisplayName(fallbackName);
    if (!derivedVillageName) {
      setError(t('pages.VillagesPage.لا_يمكن_استخراج_اسم_القرية_من_حقول_النموذج_أضف_حقلاً_نصياً_ي', 'لا يمكن استخراج اسم القرية من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".'));
      return;
    }

    setExpSavingExploration(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const selectedRegion = regions.find((r) => r.id === regionId);
      const govId = selectedRegion ? selectedRegion.govId : null;

      const sanitized = expForm.sanitize();

      const normalizedNewMuslims = normalizeNewMuslims(expNewMuslims);
      const counters = villageMuslimCounterFields(normalizedNewMuslims);

      const newVilId = api.getNewId('villages');
      const vilRef = api.getVillageDoc(regionId, newVilId);

      await api.setData({
        docRef: vilRef,
        data: {
          villageName: derivedVillageName,
          regionId,
          govId,
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: sanitized,
          ...counters,
        },
        userData: actorUser || {},
      });

      await syncVillageNewMuslims(api, newVilId, normalizedNewMuslims, []);

      setIsExploringAdding(false);
      resetExplorationNewMuslims();
      expForm.reset();
      setSuccess(t('pages.VillagesPage.تمت_إضافة_القرية_من_نموذج_الاستكشاف_بنجاح', 'تمت إضافة القرية من نموذج الاستكشاف بنجاح.'));
      fetchData();
    } catch (err) {
      console.error(err);
      if (err?.code === 'NO_SCHOOL_IN_VILLAGE') {
        setError(t('pages.VillagesPage.لا_توجد_مدرسة_في_هذه_القرية_لتسجيل_المهتدين_المسلمين_القدامى', 'لا توجد مدرسة في هذه القرية لتسجيل المهتدين/المسلمين القدامى كطلاب. أضف مدرسة أولاً.'));
      } else {
        setError(t('pages.VillagesPage.حدث_خطأ_أثناء_الحفظ', 'حدث خطأ أثناء الحفظ.'));
      }
    } finally {
      setExpSavingExploration(false);
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
    const sch = schoolsByVillage[vil.id] || [];
    setVillageModalSchoolIds(sch.length ? [sch[0].id] : []);
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
      setSuccess(t('pages.VillagesPage.تم_حذف_القرية_بنجاح', 'تم حذف القرية بنجاح.'));
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.لا_يمكن_الحذف_في_الوقت_الحالي', 'لا يمكن الحذف في الوقت الحالي.'));
    }
  };

  const getRegionName = (regId) => {
    const reg = regions.find(r => r.id === regId);
    return reg ? reg.name : t('pages.RegionsPage.غير_معروف', 'غير معروف');
  };

  const handleSaveDefaultSchool = async (vil, schoolId) => {
    if (!vil?.id || !schoolId) return;
    setSavingDefaultSchoolForVillageId(vil.id);
    setError('');
    try {
      const api = FirestoreApi.Api;
      await api.updateData({
        docRef: api.getVillageDoc(vil.regionId, vil.id),
        data: { defaultSchoolId: schoolId },
      });
      setVillages((prev) =>
        prev.map((v) => (v.id === vil.id ? { ...v, defaultSchoolId: schoolId } : v))
      );
      setSuccess(t('pages.VillagesPage.تم_حفظ_المدرسة_الافتراضية_للقرية', 'تم حفظ المدرسة الافتراضية للقرية.'));
    } catch (err) {
      console.error(err);
      setError(t('pages.VillagesPage.تعذر_حفظ_المدرسة_الافتراضية', 'تعذر حفظ المدرسة الافتراضية.'));
    } finally {
      setSavingDefaultSchoolForVillageId('');
    }
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
    setNmEditingType(t('pages.VillageDetailsPage.رجل', 'رجل'));
    setNmEditingCategory(normalizeMuslimCategory());
  };

  const toggleNmDraftSchool = (schoolId) => {
    setNmDraftSchoolIds((prev) => {
      if (prev.includes(schoolId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== schoolId);
      }
      return [...prev, schoolId];
    });
  };

  const toggleVillageModalSchool = (schoolId) => {
    setVillageModalSchoolIds((prev) => {
      if (prev.includes(schoolId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== schoolId);
      }
      return [...prev, schoolId];
    });
  };

  const toggleQuickNewMuslims = (vilId) => {
    const opening = nmQuickVillageId !== vilId;
    setNmQuickVillageId((v) => (v === vilId ? null : vilId));
    setNmDraftName('');
    setNmDraftType(t('pages.VillageDetailsPage.رجل', 'رجل'));
    setNmDraftCategory(normalizeMuslimCategory());
    const sch = schoolsByVillage[vilId] || [];
    setNmDraftSchoolIds(opening && sch.length ? [sch[0].id] : []);
    cancelNmQuickEdit();
  };

  const startNmQuickEdit = (m) => {
    setNmEditingId(m.id);
    setNmEditingName(m.name || '');
    setNmEditingType(m.type || t('pages.VillageDetailsPage.رجل', 'رجل'));
    setNmEditingCategory(normalizeMuslimCategory(m.muslimCategory));
  };

  const handleQuickAddNewMuslim = async (vil) => {
    if (!nmDraftName.trim() || nmQuickVillageId !== vil.id) return;
    const schList = schoolsByVillage[vil.id] || [];
    if (schList.length && nmDraftSchoolIds.length === 0) {
      setError(t('pages.VillageDetailsPage.اختر_مدرسة_واحدة_على_الأقل_للتسجيل', 'اختر مدرسة واحدة على الأقل للتسجيل.'));
      return;
    }
    setNmSaving(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const docId = api.getNewId('new_muslims');
      const mc = normalizeMuslimCategory(nmDraftCategory);
      const { schoolIds } = await enrollVillagePersonAsStudent(api, {
        personId: docId,
        villageId: vil.id,
        displayName: nmDraftName.trim(),
        listingType: nmDraftType,
        muslimCategory: mc,
        schoolIds: nmDraftSchoolIds.length > 0 ? nmDraftSchoolIds : null,
      });
      await api.setData({
        docRef: api.getNewMuslimDoc(docId),
        data: {
          villageId: vil.id,
          name: nmDraftName.trim(),
          type: nmDraftType,
          muslimCategory: mc,
          enrolledSchoolId: schoolIds[0],
          enrolledSchoolIds: schoolIds,
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
          enrolledSchoolId: schoolIds[0],
          enrolledSchoolIds: schoolIds,
        },
      ];
      patchVillageNewMuslims(vil.id, list);
      await syncVillageNewMuslimCounters(vil.regionId, vil.id, list);
      setNmDraftName('');
      setNmDraftType(t('pages.VillageDetailsPage.رجل', 'رجل'));
      setNmDraftCategory(normalizeMuslimCategory());
      setNmDraftSchoolIds(schList.length ? [schList[0].id] : []);
      setSuccess(
        schoolIds.length > 1
          ? `تمت إضافة السجل وتسجيله كطالب في ${schoolIds.length} مدارس.`
          : t('pages.VillagesPage.تمت_إضافة_السجل_وتسجيله_كطالب_في_المدرسة_المحددة', 'تمت إضافة السجل وتسجيله كطالب في المدرسة المحددة.')
      );
    } catch (err) {
      console.error(err);
      if (err.code === 'NO_SCHOOL_IN_VILLAGE') {
        setError(t('pages.VillageDetailsPage.لا_توجد_مدرسة_في_هذه_القرية_لتسجيل_الطالب_تلقائياً', 'لا توجد مدرسة في هذه القرية لتسجيل الطالب تلقائياً.'));
      } else {
        setError(t('pages.VillagesPage.تعذر_إضافة_السجل', 'تعذر إضافة السجل.'));
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
      setSuccess(t('pages.VillagesPage.تم_تحديث_السجل', 'تم تحديث السجل.'));
    } catch (err) {
      console.error(err);
      setError(t('pages.VillagesPage.تعذر_حفظ_التعديل', 'تعذر حفظ التعديل.'));
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
      setSuccess(t('pages.VillagesPage.تم_حذف_السجل', 'تم حذف السجل.'));
    } catch (err) {
      console.error(err);
      setError(t('pages.VillagesPage.تعذر_الحذف', 'تعذر الحذف.'));
    } finally {
      setNmSaving(false);
    }
  };

  return (
    <div className="villages-page">
      <PageHeader icon={Home} title={t('pages.VillagesPage.إدارة_القرى', 'إدارة القرى')} subtitle={t('pages.VillagesPage.البيانات_الديموغرافية_والمجموعات', 'البيانات الديموغرافية والمجموعات')}>
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
              setMuslimType(t('pages.VillageDetailsPage.رجل', 'رجل'));
              setMuslimCategoryForm(normalizeMuslimCategory());
              setVillageModalSchoolIds([]);
              setNmQuickVillageId(null);
              cancelNmQuickEdit();
            }}
          >
            <Plus size={18} />
            <span>{t('pages.VillagesPage.إضافة_قرية_جديدة', 'إضافة قرية جديدة')}</span>
          </button>
        )}
        {can(PERMISSION_PAGE_IDS.villages, 'village_add') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={openExplorationAddModal}
            title={t('pages.VillagesPage.فتح_نموذج_استكشاف_لإدخال_قرية_جديدة', 'فتح نموذج استكشاف لإدخال قرية جديدة')}
          >
            <Compass size={18} />
            <span className="villages-toolbar__long">{t('pages.VillagesPage.إضافة_من_نموذج_الاستكشاف', 'إضافة من نموذج الاستكشاف')}</span>
            <span className="villages-toolbar__short">{t('utils.explorationTargetPages.استكشاف', 'استكشاف')}</span>
          </button>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.villages) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info villages-alert">
          {t('pages.VillagesPage.عرض_محدود_القرى', 'عرض محدود: القرى والمناطق والمهتدين الظاهرون مرتبطون بمجموعاتك (عضوية مدرسة أو منطقة).')}
        </div>
      )}
      {error && (
        <div className="app-alert app-alert--error villages-alert app-alert--dismissible">
          <span>{error}</span>
          <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="app-alert app-alert--success villages-alert app-alert--dismissible">
          <span>{success}</span>
          <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setSuccess('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Complex Add/Edit Modal */}
      <FormModal
        open={isAdding}
        title={null}
        size="lg"
        onClose={() => setIsAdding(false)}
      >
          <form onSubmit={handleAdd} className="villages-form">
          <h3 className="villages-form__title">{t('pages.VillagesPage.البيانات_الأساسية', 'البيانات الأساسية')}</h3>
          
          <div className="villages-form__grid">
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillagesPage.المنطقة_التابعة_لها', 'المنطقة التابعة لها')}</label>
              <AppSelect searchable value={selectedRegId} onChange={(e) => setSelectedRegId(e.target.value)} required>
                <option value="">{t('pages.VillagesPage.اختر_المنطقة', '-- اختر المنطقة --')}</option>
                {regions.map(reg => (
                  <option key={reg.id} value={reg.id}>{reg.name} ({getRegionName(reg.id)})</option> // Simplified
                ))}
              </AppSelect>
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.ExplorationsPage.اسم_القرية', 'اسم القرية')}</label>
              <input name="villageName" type="text" value={formData.villageName} onChange={handleInputChange} className="app-input" required />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillagesPage.اسم_الجروب', 'اسم الجروب')}</label>
              <input name="groupName" type="text" value={formData.groupName} onChange={handleInputChange} className="app-input" />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillagesPage.اسم_الـ_LTI', 'اسم الـ LTI')}</label>
              <input name="ltiName" type="text" value={formData.ltiName} onChange={handleInputChange} className="app-input" />
            </div>
          </div>

          <hr className="villages-form__divider" />

          <h3 className="villages-form__title">{t('pages.VillagesPage.الإحصائيات_السكانية', 'الإحصائيات السكانية')}</h3>
          <div className="villages-form__grid villages-form__grid--stats">
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillageDetailsPage.إجمالي_السكان', 'إجمالي السكان')}</label>
              <input name="populationCount" type="number" min="0" value={formData.populationCount} onChange={handleInputChange} className="app-input" />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillagesPage.عدد_المسلمين', 'عدد المسلمين')}</label>
              <input name="muslimsCount" type="number" min="0" value={formData.muslimsCount} onChange={handleInputChange} className="app-input" />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillagesPage.عدد_غير_المسلمين', 'عدد غير المسلمين')}</label>
              <input name="nonMuslimsCount" type="number" min="0" value={formData.nonMuslimsCount} onChange={handleInputChange} className="app-input" />
            </div>
          </div>

          <hr className="villages-form__divider" />

          <div className="villages-form__head-row">
            <h3 className="villages-form__title villages-form__title--inline">{t('pages.VillagesPage.سجل_المهتدين_والمسلمين_القدامى_يُسجَّلون_كطلاب_في_المد', 'سجل المهتدين والمسلمين القدامى (يُسجَّلون كطلاب في المدارس التي تختارها)')}</h3>
            <div className="villages-form__counter">
              الإجمالي: {newMuslims.length}
            </div>
          </div>

          {isEditing && (schoolsByVillage[isEditing.id] || []).length > 0 && (
            <div className="app-field app-field--grow villages-form__school-pick">
              <label className="app-label">{t('pages.VillagesPage.مدارس_القرية_للتسجيل_كطالب_قائمة_الطلاب_المسجلين_في_كل', 'مدارس القرية للتسجيل كطالب (قائمة الطلاب المسجلين في كل مدرسة)')}</label>
              <VillageSchoolCheckboxGroup
                schools={schoolsByVillage[isEditing.id] || []}
                selectedIds={villageModalSchoolIds}
                onToggle={toggleVillageModalSchool}
              />
              <p className="villages-form__school-pick-hint">
                الافتراضي أول مدرسة؛ يمكنك تحديد أكثر من مدرسة. يجب بقاء خيار واحد على الأقل.
              </p>
            </div>
          )}

          {isEditing && (schoolsByVillage[isEditing.id] || []).length === 0 && newMuslims.length > 0 && (
            <div className="app-alert app-alert--info geo-page-alert">
              لا توجد مدارس مرتبطة بهذه القرية بعد. أضف مدرسة للقرية أولاً، أو سجّل المهتدين لاحقاً من بطاقة القرية بعد ربط المدارس.
            </div>
          )}
          
          <div className="villages-form__new-muslim-row">
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillageDetailsPage.الاسم', 'الاسم')}</label>
              <input type="text" value={muslimName} onChange={(e) => setMuslimName(e.target.value)} className="app-input" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewMuslimToList())} />
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">{t('utils.schoolReportExport.النوع', 'النوع')}</label>
              <AppSelect searchable value={muslimType} onChange={(e) => setMuslimType(e.target.value)}>
                <option value={t('pages.VillageDetailsPage.رجل', 'رجل')}>{t('pages.VillageDetailsPage.رجل', 'رجل')}</option>
                <option value={t('pages.VillageDetailsPage.امرأة', 'امرأة')}>{t('pages.VillageDetailsPage.امرأة', 'امرأة')}</option>
                <option value={t('pages.VillageDetailsPage.طفل', 'طفل')}>{t('pages.VillageDetailsPage.طفل', 'طفل')}</option>
              </AppSelect>
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">{t('pages.VillagesPage.التصنيف', 'التصنيف')}</label>
              <AppSelect searchable value={muslimCategoryForm} onChange={(e) => setMuslimCategoryForm(normalizeMuslimCategory(e.target.value))}>
                <option value="convert">{t('pages.VillagesPage.مهتد_جديد', 'مهتد جديد')}</option>
                <option value="born">{t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم')}</option>
              </AppSelect>
            </div>
            <button type="button" onClick={addNewMuslimToList} className="google-btn google-btn--toolbar villages-form__new-muslim-btn">
              <UserPlus size={16} /> {t('components.ReportTextList.إضافة', 'إضافة')}
            </button>
          </div>

          {newMuslims.length > 0 && (
            <div className="villages-form__new-muslims-list">
              {newMuslims.map((m, index) => (
                <div key={index} className={`villages-form__new-muslims-item ${index !== newMuslims.length - 1 ? 'villages-form__new-muslims-item--with-border' : ''}`}>
                  <span className="villages-form__new-muslims-name">
                    {m.name} — <span className="villages-form__new-muslims-type">{m.type}</span>
                    {' '}
                    <span className="villages-form__new-muslims-type villages-form__new-muslims-type--muted">
                      ({normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN ? t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم') : t('pages.VillagesPage.مهتد', 'مهتد')})
                    </span>
                  </span>
                  <X
                    size={16}
                    color="var(--danger-color)"
                    className="villages-form__new-muslims-remove"
                    onClick={() => removeMuslimFromList(index)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="villages-form__actions">
            <button type="button" onClick={() => setIsAdding(false)} className="google-btn villages-form__action-btn">
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton
              type="submit"
              busy={loading}
              className="google-btn google-btn--filled villages-form__action-btn villages-form__action-btn--primary"
            >
              {isEditing ? t('pages.VillagesPage.تحديث_القرية', 'تحديث القرية') : t('pages.VillagesPage.حفظ_القرية', 'حفظ القرية')}
            </BusyButton>
          </div>
          </form>
      </FormModal>

      {/* Exploration-driven Add Modal — يحفظ القرية في `villages` مع explorationFieldValues */}
      <FormModal
        open={isExploringAdding}
        title={t('pages.VillagesPage.إضافة_قرية_من_نموذج_الاستكشاف', 'إضافة قرية من نموذج الاستكشاف')}
        size="lg"
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd} className="villages-form">
          <div className="app-alert app-alert--info geo-page-alert geo-page-alert--tight">
            النموذج يحتاج حقلاً مصدره «المناطق» لربط القرية بمنطقتها، وحقلاً نصياً للاسم.
          </div>

          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading={t('components.ExplorationDataModal.حقول_نموذج_الاستكشاف', 'حقول نموذج الاستكشاف')}
            currentPageId={PERMISSION_PAGE_IDS.villages}
          />

          <hr className="villages-form__divider" />

          <div className="villages-form__head-row">
            <h3 className="villages-form__title villages-form__title--inline">
              سجل المهتدين والمسلمين القدامى (يُسجَّلون كطلاب في المدارس التي تختارها)
            </h3>
            <div className="villages-form__counter">الإجمالي: {expNewMuslims.length}</div>
          </div>

          <div className="app-alert app-alert--info geo-page-alert geo-page-alert--tight">
            يتم تسجيل المهتدين/المسلمين القدامى كطلاب بعد إنشاء القرية. اربط المدارس بهذه القرية لتُسجَّل الأسماء فيها
            تلقائياً. عند عدم وجود مدرسة، تُسجَّل أسماؤهم كأفراد قرية فقط.
          </div>

          <div className="villages-form__new-muslim-row">
            <div className="app-field app-field--grow">
              <label className="app-label">{t('pages.VillageDetailsPage.الاسم', 'الاسم')}</label>
              <input
                type="text"
                value={expMuslimName}
                onChange={(e) => setExpMuslimName(e.target.value)}
                className="app-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpNewMuslimToList())}
              />
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">{t('utils.schoolReportExport.النوع', 'النوع')}</label>
              <AppSelect
                searchable
                value={expMuslimType}
                onChange={(e) => setExpMuslimType(e.target.value)}
              >
                <option value={t('pages.VillageDetailsPage.رجل', 'رجل')}>{t('pages.VillageDetailsPage.رجل', 'رجل')}</option>
                <option value={t('pages.VillageDetailsPage.امرأة', 'امرأة')}>{t('pages.VillageDetailsPage.امرأة', 'امرأة')}</option>
                <option value={t('pages.VillageDetailsPage.طفل', 'طفل')}>{t('pages.VillageDetailsPage.طفل', 'طفل')}</option>
              </AppSelect>
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">{t('pages.VillagesPage.التصنيف', 'التصنيف')}</label>
              <AppSelect
                searchable
                value={expMuslimCategoryForm}
                onChange={(e) => setExpMuslimCategoryForm(normalizeMuslimCategory(e.target.value))}
              >
                <option value="convert">{t('pages.VillagesPage.مهتد_جديد', 'مهتد جديد')}</option>
                <option value="born">{t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم')}</option>
              </AppSelect>
            </div>
            <button
              type="button"
              onClick={addExpNewMuslimToList}
              className="google-btn google-btn--toolbar villages-form__new-muslim-btn"
            >
              <UserPlus size={16} /> {t('components.ReportTextList.إضافة', 'إضافة')}
            </button>
          </div>

          {expNewMuslims.length > 0 && (
            <div className="villages-form__new-muslims-list">
              {expNewMuslims.map((m, index) => (
                <div
                  key={index}
                  className={`villages-form__new-muslims-item ${index !== expNewMuslims.length - 1 ? 'villages-form__new-muslims-item--with-border' : ''}`}
                >
                  <span className="villages-form__new-muslims-name">
                    {m.name} — <span className="villages-form__new-muslims-type">{m.type}</span>
                    {' '}
                    <span className="villages-form__new-muslims-type villages-form__new-muslims-type--muted">
                      ({normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN ? t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم') : t('pages.VillagesPage.مهتد', 'مهتد')})
                    </span>
                  </span>
                  <X
                    size={16}
                    color="var(--danger-color)"
                    className="villages-form__new-muslims-remove"
                    onClick={() => removeExpMuslimFromList(index)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="villages-form__actions">
            <button
              type="button"
              onClick={() => setIsExploringAdding(false)}
              className="google-btn villages-form__action-btn"
            >
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton
              type="submit"
              busy={expSavingExploration}
              className="google-btn google-btn--filled villages-form__action-btn villages-form__action-btn--primary"
            >
              {t('pages.VillagesPage.حفظ_القرية', 'حفظ القرية')}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* Villages List */}
      {loading && !isAdding ? (
        <div className="loading-spinner page-loading"></div>
      ) : villages.length === 0 ? (
        <div className="empty-state">
          لا توجد قرى مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--lg">
          {villages.map((vil) => {
            const nmList = newMuslimsDocsByVillage[vil.id] || [];
            const villageSchools = schoolsByVillage[vil.id] || [];
            const defaultSchoolName =
              villageSchools.find((s) => s.id === defaultSchoolByVillage[vil.id])?.name ||
              villageSchools[0]?.name ||
              '';
            const isBorn = (m) => normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN;
            const convertsList = nmList.filter((m) => !isBorn(m));
            const bornList = nmList.filter(isBorn);
            return (
            <div key={vil.id} className="surface-card surface-card--village">
              <div className="villages-card__actions">
                {can(PERMISSION_PAGE_IDS.villages, 'village_view') && (
                  <button className="icon-btn" onClick={() => navigate(`/villages/${vil.id}`)} title={t('pages.AdminReportsPage.عرض_التفاصيل_الكاملة', 'عرض التفاصيل الكاملة')}>
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.villages, 'village_report_quick_add') && (
                  <button
                    className="icon-btn"
                    title={t('components.VillageDefaultSchoolPanel.إضافة_تقرير_المدرسة_الافتراضية', 'إضافة تقرير المدرسة الافتراضية')}
                    disabled={!defaultSchoolByVillage[vil.id]}
                    onClick={() => navigate(`/schools/${defaultSchoolByVillage[vil.id]}?composeReport=1`)}
                  >
                    <Plus size={16} color="var(--success-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.villages, 'village_edit') && (
                  <button className="icon-btn" onClick={() => handleEditClick(vil)} title={t('pages.VillagesPage.تعديل_القرية', 'تعديل القرية')}>
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.villages, 'village_delete') && (
                  <button className="icon-btn" onClick={() => setPendingDelete({ id: vil.id, name: vil.villageName })} title={t('pages.VillagesPage.حذف_القرية', 'حذف القرية')}>
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
              
              <h3 className="villages-card__title">{vil.villageName}</h3>
              {!!defaultSchoolName && (
                <div className="villages-card__default-badge" title={`المدرسة الافتراضية: ${defaultSchoolName}`}>
                  <FileText size={12} aria-hidden />
                  <span>الافتراضية: {defaultSchoolName}</span>
                </div>
              )}
              <p className="villages-card__subtitle">
                المنطقة: {getRegionName(vil.regionId)}
              </p>

              <div className="villages-card__stats">
                <div><Users size={14} /> السكان: {vil.populationCount}</div>
                <div>مسلمين: {vil.muslimsCount}</div>
                <div className="villages-card__stats-danger">غير المسلمين: {vil.nonMuslimsCount}</div>
                <div className="villages-card__stats-success">مهتدين (رجال): {convertsList.filter((m) => m.type === t('pages.VillageDetailsPage.رجل', 'رجل')).length}</div>
                <div className="villages-card__stats-success">مهتدين (نساء): {convertsList.filter((m) => m.type === t('pages.VillageDetailsPage.امرأة', 'امرأة')).length}</div>
                <div className="villages-card__stats-success">مهتدين (أطفال): {convertsList.filter((m) => m.type === t('pages.VillageDetailsPage.طفل', 'طفل')).length}</div>
                <div className="villages-card__stats-success">مسلمون قدامى (رجال): {bornList.filter((m) => m.type === t('pages.VillageDetailsPage.رجل', 'رجل')).length}</div>
                <div className="villages-card__stats-success">مسلمون قدامى (نساء): {bornList.filter((m) => m.type === t('pages.VillageDetailsPage.امرأة', 'امرأة')).length}</div>
                <div className="villages-card__stats-success">مسلمون قدامى (أطفال): {bornList.filter((m) => m.type === t('pages.VillageDetailsPage.طفل', 'طفل')).length}</div>
              </div>

              <div className="villages-card__meta">
                <span>جروب: {vil.groupName || '-'}</span>
                <span>LTI: {vil.ltiName || '-'}</span>
              </div>
              <div className="villages-card__exploration">
                {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                  <ExplorationBadge record={vil} onClick={() => setViewingExplorationOf(vil)} />
                )}
              </div>

              <VillageDefaultSchoolPanel
                schools={villageSchools}
                defaultSchoolId={defaultSchoolByVillage[vil.id] || ''}
                currentSchoolName={defaultSchoolName}
                onDefaultSchoolChange={(e) =>
                  setDefaultSchoolByVillage((prev) => ({ ...prev, [vil.id]: e.target.value }))
                }
                onSaveDefault={() => handleSaveDefaultSchool(vil, defaultSchoolByVillage[vil.id])}
                onAddReport={() => navigate(`/schools/${defaultSchoolByVillage[vil.id]}?composeReport=1`)}
                saving={savingDefaultSchoolForVillageId === vil.id}
                canSetDefault={can(PERMISSION_PAGE_IDS.villages, 'village_default_school_set')}
                canAddReport={can(PERMISSION_PAGE_IDS.villages, 'village_report_quick_add')}
              />

              {(can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') ||
                can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') ||
                can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_delete')) && (
                <button
                  type="button"
                  className="google-btn google-btn--toolbar villages-card__quick-toggle"
                  onClick={() => toggleQuickNewMuslims(vil.id)}
                >
                  <UserPlus size={16} aria-hidden />
                  {nmQuickVillageId === vil.id ? (
                    <>
                      <ChevronUp size={16} aria-hidden />
                      <span>{t('pages.VillagesPage.طي_السجل', 'طي السجل')}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} aria-hidden />
                      <span className="villages-toolbar__long">{t('pages.VillagesPage.مهتدون_ومسلمون_قدامى_من_البطاقة', 'مهتدون ومسلمون قدامى من البطاقة')}</span>
                      <span className="villages-toolbar__short">{t('pages.VillagesPage.سجل_المهتدين', 'سجل المهتدين')}</span>
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
                    يُسجَّل الشخص في المدارس المحددة ضمن قائمة الطلاب لكل مدرسة. الافتراضي أول مدرسة؛ يمكن اختيار أكثر من مدرسة.
                  </p>
                  {(schoolsByVillage[vil.id] || []).length > 0 && (
                    <VillageSchoolCheckboxGroup
                      schools={schoolsByVillage[vil.id] || []}
                      selectedIds={nmDraftSchoolIds}
                      onToggle={toggleNmDraftSchool}
                      disabled={nmSaving}
                    />
                  )}
                  <div className="villages-quick-panel__entry-row">
                    <input
                      type="text"
                      value={nmDraftName}
                      onChange={(e) => setNmDraftName(e.target.value)}
                      placeholder={t('pages.VillageDetailsPage.الاسم', 'الاسم')}
                      className="app-input"
                      disabled={nmSaving}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddNewMuslim(vil);
                        }
                      }}
                    />
                    <AppSelect searchable
                      value={nmDraftType}
                      onChange={(e) => setNmDraftType(e.target.value)}
                      disabled={nmSaving}
                    >
                      <option value={t('pages.VillageDetailsPage.رجل', 'رجل')}>{t('pages.VillageDetailsPage.رجل', 'رجل')}</option>
                      <option value={t('pages.VillageDetailsPage.امرأة', 'امرأة')}>{t('pages.VillageDetailsPage.امرأة', 'امرأة')}</option>
                      <option value={t('pages.VillageDetailsPage.طفل', 'طفل')}>{t('pages.VillageDetailsPage.طفل', 'طفل')}</option>
                    </AppSelect>
                    <AppSelect searchable
                      value={nmDraftCategory}
                      onChange={(e) => setNmDraftCategory(normalizeMuslimCategory(e.target.value))}
                      disabled={nmSaving}
                    >
                      <option value="convert">{t('pages.VillagesPage.مهتد', 'مهتد')}</option>
                      <option value="born">{t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم')}</option>
                    </AppSelect>
                    {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') && (
                      <button
                        type="button"
                        className="google-btn google-btn--filled villages-quick-panel__add-btn"
                        disabled={nmSaving}
                        onClick={() => handleQuickAddNewMuslim(vil)}
                      >
                        {t('components.ReportTextList.إضافة', 'إضافة')}
                      </button>
                    )}
                  </div>
                  <div className="villages-quick-panel__list">
                    {(newMuslimsDocsByVillage[vil.id] || []).length === 0 ? (
                      <p className="villages-quick-panel__empty">
                        {t('pages.VillageDetailsPage.لا_توجد_سجلات_بعد', 'لا توجد سجلات بعد.')}
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
                              <AppSelect searchable
                                value={nmEditingType}
                                onChange={(e) => setNmEditingType(e.target.value)}
                                disabled={nmSaving}
                              >
                                <option value={t('pages.VillageDetailsPage.رجل', 'رجل')}>{t('pages.VillageDetailsPage.رجل', 'رجل')}</option>
                                <option value={t('pages.VillageDetailsPage.امرأة', 'امرأة')}>{t('pages.VillageDetailsPage.امرأة', 'امرأة')}</option>
                                <option value={t('pages.VillageDetailsPage.طفل', 'طفل')}>{t('pages.VillageDetailsPage.طفل', 'طفل')}</option>
                              </AppSelect>
                              <AppSelect searchable
                                value={nmEditingCategory}
                                onChange={(e) => setNmEditingCategory(normalizeMuslimCategory(e.target.value))}
                                disabled={nmSaving}
                              >
                                <option value="convert">{t('pages.VillagesPage.مهتد', 'مهتد')}</option>
                                <option value="born">{t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم')}</option>
                              </AppSelect>
                              <button
                                type="button"
                                className="icon-btn"
                                title={t('components.MessengerPanel.حفظ', 'حفظ')}
                                disabled={nmSaving}
                                onClick={() => handleQuickSaveNewMuslim(vil)}
                              >
                                <Save size={16} color="var(--success-color)" />
                              </button>
                              <button type="button" className="icon-btn" title={t('components.ConfirmDialog.إلغاء', 'إلغاء')} disabled={nmSaving} onClick={cancelNmQuickEdit}>
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
                                    ? t('pages.VillageDetailsPage.مسلم_قديم', ' · مسلم قديم')
                                    : t('pages.VillageDetailsPage.مهتد', ' · مهتد')}
                                </span>
                              </span>
                              <span className="villages-quick-panel__item-actions">
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') && (
                                  <button type="button" className="icon-btn" title={t('components.ExplorationListCard.تعديل', 'تعديل')} disabled={nmSaving} onClick={() => startNmQuickEdit(m)}>
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_delete') && (
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    title={t('components.ExplorationListCard.حذف', 'حذف')}
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

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={viewingExplorationOf ? `بيانات النموذج — ${viewingExplorationOf.villageName}` : t('pages.CurriculumPage.بيانات_النموذج', 'بيانات النموذج')}
        record={viewingExplorationOf}
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={
          can(PERMISSION_PAGE_IDS.villages, 'village_edit') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)
        }
        fallbackName={viewingExplorationOf?.villageName}
        onSave={async ({ fieldValues, derivedName, selectedType, controller }) => {
          const target = viewingExplorationOf;
          if (!target) return;
          const api = FirestoreApi.Api;
          const nextRegionId = controller.getValueBySource('regions') || target.regionId;
          const selectedRegion = regions.find((r) => r.id === nextRegionId);
          const nextData = {
            villageName: derivedName || target.villageName || '',
            regionId: nextRegionId,
            govId: selectedRegion?.govId || target.govId || null,
            explorationTypeId: selectedType?.id || target.explorationTypeId || '',
            explorationTypeName: selectedType?.name || target.explorationTypeName || '',
            explorationFieldValues: fieldValues,
          };
          if (nextRegionId !== target.regionId) {
            const { id: _id, ...rest } = target;
            await api.setData({
              docRef: api.getVillageDoc(nextRegionId, target.id),
              data: { ...rest, ...nextData },
              userData: actorUser || {},
            });
            await api.deleteData(api.getVillageDoc(target.regionId, target.id));
          } else {
            await api.updateData({
              docRef: api.getVillageDoc(target.regionId, target.id),
              data: nextData,
              userData: actorUser || {},
            });
          }
          setSuccess(t('pages.VillagesPage.تم_تحديث_بيانات_نموذج_القرية', 'تم تحديث بيانات نموذج القرية.'));
          setError('');
          fetchData();
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('pages.VillagesPage.تأكيد_حذف_القرية', 'تأكيد حذف القرية')}
        message={`سيتم حذف قرية "${pendingDelete?.name || ''}" وكل السجلات المرتبطة بها.`}
        confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
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
        title={t('pages.VillagesPage.حذف_السجل', 'حذف السجل')}
        message={
          pendingNewMuslimDelete
            ? `حذف «${pendingNewMuslimDelete.m.name}» من سجل القرية «${pendingNewMuslimDelete.vil.villageName}» وإزالة حساب الطالب وارتباطاته؟`
            : ''
        }
        confirmLabel={t('components.ExplorationListCard.حذف', 'حذف')}
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
