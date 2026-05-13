import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Home, UserPlus, X, Eye, Save, ChevronDown, ChevronUp, Users, FileText, Settings2, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import ExplorationDynamicFieldBlock from '../../components/ExplorationDynamicFieldBlock';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
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
import {
  normalizeSchemaFields,
  initialFieldValues,
  validateFieldValues,
  sanitizeFieldValuesForSave,
} from '../../utils/explorationDynamicFields';
import { useExplorationOptionCaches } from '../../hooks/useExplorationOptionCaches';

const VillagesPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipMirrorGroupIds, membershipLoading, actorUser } = perm;
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

  /** لوحة المهتدين السريعة داخل البطاقة */
  const [nmQuickVillageId, setNmQuickVillageId] = useState(null);
  const [nmDraftName, setNmDraftName] = useState('');
  const [nmDraftType, setNmDraftType] = useState('رجل');
  const [nmDraftCategory, setNmDraftCategory] = useState(normalizeMuslimCategory());
  /** مدارس القرية المختارة للتسجيل السريع (افتراضي أول مدرسة) */
  const [nmDraftSchoolIds, setNmDraftSchoolIds] = useState([]);
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
  /** عند تعديل القرية: المدارس التي يُسجَّل فيها كل سجل جديد من نموذج القرية */
  const [villageModalSchoolIds, setVillageModalSchoolIds] = useState([]);

  /* ============================================================
   * مودال «الإضافة من نموذج الاستكشاف»: ينشئ قرية مع حقول استكشاف
   * ديناميكية + سجل المهتدين، ويحفظ كل ذلك في `villages`.
   * ============================================================ */
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [explorationTypes, setExplorationTypes] = useState([]);
  const [explorationTypesLoading, setExplorationTypesLoading] = useState(false);
  const [expRegionId, setExpRegionId] = useState('');
  const [expVillageName, setExpVillageName] = useState('');
  const [expGroupName, setExpGroupName] = useState('');
  const [expLtiName, setExpLtiName] = useState('');
  const [expPopulationCount, setExpPopulationCount] = useState('');
  const [expMuslimsCount, setExpMuslimsCount] = useState('');
  const [expNonMuslimsCount, setExpNonMuslimsCount] = useState('');
  const [expSelectedTypeId, setExpSelectedTypeId] = useState('');
  const [expFieldValues, setExpFieldValues] = useState({});
  const [expNewMuslims, setExpNewMuslims] = useState([]);
  const [expMuslimName, setExpMuslimName] = useState('');
  const [expMuslimType, setExpMuslimType] = useState('رجل');
  const [expMuslimCategoryForm, setExpMuslimCategoryForm] = useState(normalizeMuslimCategory());
  const [expSavingExploration, setExpSavingExploration] = useState(false);

  const expSelectedType = useMemo(
    () => explorationTypes.find((t) => t.id === expSelectedTypeId) || null,
    [explorationTypes, expSelectedTypeId]
  );
  const expSchemaFields = useMemo(
    () => normalizeSchemaFields(expSelectedType?.schemaFields || expSelectedType?.fields || []),
    [expSelectedType]
  );

  const { mergeFields: mergeExplorationFields, loading: expOptionCachesLoading } = useExplorationOptionCaches(
    isExploringAdding
  );
  const mergedExpFields = useMemo(
    () => mergeExplorationFields(expSchemaFields, expFieldValues, actorUser),
    [mergeExplorationFields, expSchemaFields, expFieldValues, actorUser]
  );

  const setExpDynamicValue = (fieldId, value) => {
    setExpFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const resetExplorationModalState = () => {
    setExpRegionId('');
    setExpVillageName('');
    setExpGroupName('');
    setExpLtiName('');
    setExpPopulationCount('');
    setExpMuslimsCount('');
    setExpNonMuslimsCount('');
    setExpFieldValues({});
    setExpNewMuslims([]);
    setExpMuslimName('');
    setExpMuslimType('رجل');
    setExpMuslimCategoryForm(normalizeMuslimCategory());
  };

  const loadExplorationTypesOnce = useCallback(async () => {
    if (explorationTypes.length > 0 || explorationTypesLoading) return;
    setExplorationTypesLoading(true);
    try {
      const api = FirestoreApi.Api;
      const docs = await api.getDocuments(api.getExplorationTypesCollection());
      const rows = docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
      setExplorationTypes(rows);
      if (rows.length > 0 && !expSelectedTypeId) {
        setExpSelectedTypeId(rows[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل أنواع الاستكشاف.');
    } finally {
      setExplorationTypesLoading(false);
    }
  }, [explorationTypes.length, explorationTypesLoading, expSelectedTypeId]);

  const openExplorationAddModal = async () => {
    resetExplorationModalState();
    setIsExploringAdding(true);
    await loadExplorationTypesOnce();
  };

  useEffect(() => {
    if (!isExploringAdding) return;
    if (expSchemaFields.length === 0) {
      setExpFieldValues({});
      return;
    }
    setExpFieldValues((prev) => initialFieldValues(expSchemaFields, prev || {}));
  }, [isExploringAdding, expSchemaFields]);

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
        type: m.type || 'رجل',
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
          type: data.type || 'رجل',
          muslimCategory: normalizeMuslimCategory(data.muslimCategory),
          enrolledSchoolId: data.enrolledSchoolId || enrolledSchoolIds[0] || '',
          enrolledSchoolIds,
        });
      });
      setNewMuslimsDocsByVillage(grouped);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
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

  const handleExplorationAdd = async (e) => {
    e.preventDefault();
    if (!expVillageName.trim() || !expRegionId) {
      setError('يرجى إدخال اسم القرية واختيار المنطقة.');
      return;
    }
    const missing = validateFieldValues(expSchemaFields, expFieldValues);
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join('، ')}`);
      return;
    }

    setExpSavingExploration(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const selectedRegion = regions.find((r) => r.id === expRegionId);
      const govId = selectedRegion ? selectedRegion.govId : null;

      const sanitized =
        expSchemaFields.length > 0 ? sanitizeFieldValuesForSave(expSchemaFields, expFieldValues) : {};

      const normalizedNewMuslims = normalizeNewMuslims(expNewMuslims);
      const counters = villageMuslimCounterFields(normalizedNewMuslims);

      const newVilId = api.getNewId('villages');
      const vilRef = api.getVillageDoc(expRegionId, newVilId);

      await api.setData({
        docRef: vilRef,
        data: {
          villageName: expVillageName.trim(),
          groupName: expGroupName.trim(),
          ltiName: expLtiName.trim(),
          regionId: expRegionId,
          govId,
          populationCount: parseInt(expPopulationCount, 10) || 0,
          muslimsCount: parseInt(expMuslimsCount, 10) || 0,
          nonMuslimsCount: parseInt(expNonMuslimsCount, 10) || 0,
          explorationTypeId: expSelectedType?.id || '',
          explorationTypeName: expSelectedType?.name || '',
          explorationFieldValues: sanitized,
          ...counters,
        },
        userData: actorUser || {},
      });

      await syncVillageNewMuslims(api, newVilId, normalizedNewMuslims, []);

      setIsExploringAdding(false);
      resetExplorationModalState();
      setSuccess('تمت إضافة القرية من نموذج الاستكشاف بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      if (err?.code === 'NO_SCHOOL_IN_VILLAGE') {
        setError('لا توجد مدرسة في هذه القرية لتسجيل المهتدين/المسلمين القدامى كطلاب. أضف مدرسة أولاً.');
      } else {
        setError('حدث خطأ أثناء الحفظ.');
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
      setSuccess('تم حفظ المدرسة الافتراضية للقرية.');
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ المدرسة الافتراضية.');
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
    setNmEditingType('رجل');
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
    setNmDraftType('رجل');
    setNmDraftCategory(normalizeMuslimCategory());
    const sch = schoolsByVillage[vilId] || [];
    setNmDraftSchoolIds(opening && sch.length ? [sch[0].id] : []);
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
    const schList = schoolsByVillage[vil.id] || [];
    if (schList.length && nmDraftSchoolIds.length === 0) {
      setError('اختر مدرسة واحدة على الأقل للتسجيل.');
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
      setNmDraftType('رجل');
      setNmDraftCategory(normalizeMuslimCategory());
      setNmDraftSchoolIds(schList.length ? [schList[0].id] : []);
      setSuccess(
        schoolIds.length > 1
          ? `تمت إضافة السجل وتسجيله كطالب في ${schoolIds.length} مدارس.`
          : 'تمت إضافة السجل وتسجيله كطالب في المدرسة المحددة.'
      );
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
          <>
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
                setVillageModalSchoolIds([]);
                setNmQuickVillageId(null);
                cancelNmQuickEdit();
              }}
            >
              <Plus size={18} />
              <span>إضافة قرية جديدة</span>
            </button>
            <button
              type="button"
              className="google-btn google-btn--toolbar"
              onClick={openExplorationAddModal}
              title="فتح نموذج استكشاف لإدخال قرية جديدة"
            >
              <Compass size={18} />
              <span>إضافة من نموذج الاستكشاف</span>
            </button>
          </>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.villages) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info villages-alert">
          عرض محدود: القرى والمناطق والمهتدين الظاهرون مرتبطون بمجموعاتك (عضوية مدرسة أو منطقة).
        </div>
      )}
      {error && (
        <div
          className="app-alert app-alert--error villages-alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="icon-btn"
            title="إغلاق"
            onClick={() => setError('')}
            style={{ width: 28, height: 28 }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div
          className="app-alert app-alert--success villages-alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
        >
          <span>{success}</span>
          <button
            type="button"
            className="icon-btn"
            title="إغلاق"
            onClick={() => setSuccess('')}
            style={{ width: 28, height: 28 }}
          >
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
          <h3 className="villages-form__title">البيانات الأساسية</h3>
          
          <div className="villages-form__grid">
            <div className="app-field app-field--grow">
              <label className="app-label">المنطقة التابعة لها</label>
              <AppSelect searchable value={selectedRegId} onChange={(e) => setSelectedRegId(e.target.value)} required>
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
            <h3 className="villages-form__title villages-form__title--inline">سجل المهتدين والمسلمين القدامى (يُسجَّلون كطلاب في المدارس التي تختارها)</h3>
            <div className="villages-form__counter">
              الإجمالي: {newMuslims.length}
            </div>
          </div>

          {isEditing && (schoolsByVillage[isEditing.id] || []).length > 0 && (
            <div className="app-field app-field--grow" style={{ marginBottom: '1rem' }}>
              <label className="app-label">مدارس القرية للتسجيل كطالب (قائمة الطلاب المسجلين في كل مدرسة)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: 8 }}>
                {(schoolsByVillage[isEditing.id] || []).map((sch) => (
                  <label key={sch.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={villageModalSchoolIds.includes(sch.id)}
                      onChange={() => toggleVillageModalSchool(sch.id)}
                    />
                    <span>{sch.name}</span>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: 8 }}>
                الافتراضي أول مدرسة؛ يمكنك تحديد أكثر من مدرسة. يجب بقاء خيار واحد على الأقل.
              </p>
            </div>
          )}

          {isEditing && (schoolsByVillage[isEditing.id] || []).length === 0 && newMuslims.length > 0 && (
            <div className="app-alert app-alert--info" style={{ marginBottom: '1rem' }}>
              لا توجد مدارس مرتبطة بهذه القرية بعد. أضف مدرسة للقرية أولاً، أو سجّل المهتدين لاحقاً من بطاقة القرية بعد ربط المدارس.
            </div>
          )}
          
          <div className="villages-form__new-muslim-row">
            <div className="app-field app-field--grow">
              <label className="app-label">الاسم</label>
              <input type="text" value={muslimName} onChange={(e) => setMuslimName(e.target.value)} className="app-input" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewMuslimToList())} />
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">النوع</label>
              <AppSelect searchable value={muslimType} onChange={(e) => setMuslimType(e.target.value)}>
                <option value="رجل">رجل</option>
                <option value="امرأة">امرأة</option>
                <option value="طفل">طفل</option>
              </AppSelect>
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">التصنيف</label>
              <AppSelect searchable value={muslimCategoryForm} onChange={(e) => setMuslimCategoryForm(normalizeMuslimCategory(e.target.value))}>
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
            <BusyButton
              type="submit"
              busy={loading}
              className="google-btn google-btn--filled villages-form__action-btn villages-form__action-btn--primary"
            >
              {isEditing ? 'تحديث القرية' : 'حفظ القرية'}
            </BusyButton>
          </div>
          </form>
      </FormModal>

      {/* Exploration-driven Add Modal — يحفظ القرية في `villages` مع explorationFieldValues */}
      <FormModal
        open={isExploringAdding}
        title="إضافة قرية من نموذج الاستكشاف"
        size="lg"
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd} className="villages-form">
          {explorationTypesLoading ? (
            <div className="app-alert app-alert--info" style={{ marginBottom: '0.75rem' }}>
              جاري تحميل أنواع الاستكشاف…
            </div>
          ) : explorationTypes.length === 0 ? (
            <div className="app-alert app-alert--warning" style={{ marginBottom: '0.75rem' }}>
              لا توجد أنواع استكشاف معرَّفة. أضف نوعاً من «أنواع الاستكشاف» قبل استخدام هذا النموذج.
            </div>
          ) : (
            <div
              className="app-field app-field--grow"
              style={{ marginBottom: '0.75rem' }}
            >
              <label className="app-label">نوع الاستكشاف</label>
              <AppSelect
                searchable
                value={expSelectedTypeId}
                onChange={(e) => setExpSelectedTypeId(e.target.value)}
              >
                {explorationTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </AppSelect>
              {expSelectedType?.description && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {expSelectedType.description}
                </p>
              )}
            </div>
          )}

          <h3 className="villages-form__title">البيانات الأساسية للقرية</h3>

          <div className="villages-form__grid">
            <div className="app-field app-field--grow">
              <label className="app-label">المنطقة التابعة لها</label>
              <AppSelect
                searchable
                value={expRegionId}
                onChange={(e) => setExpRegionId(e.target.value)}
                required
              >
                <option value="">-- اختر المنطقة --</option>
                {regions.map((reg) => (
                  <option key={reg.id} value={reg.id}>{reg.name}</option>
                ))}
              </AppSelect>
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">اسم القرية</label>
              <input
                type="text"
                value={expVillageName}
                onChange={(e) => setExpVillageName(e.target.value)}
                className="app-input"
                required
              />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">اسم الجروب</label>
              <input
                type="text"
                value={expGroupName}
                onChange={(e) => setExpGroupName(e.target.value)}
                className="app-input"
              />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">اسم الـ LTI</label>
              <input
                type="text"
                value={expLtiName}
                onChange={(e) => setExpLtiName(e.target.value)}
                className="app-input"
              />
            </div>
          </div>

          <div className="villages-form__grid villages-form__grid--stats">
            <div className="app-field app-field--grow">
              <label className="app-label">إجمالي السكان</label>
              <input
                type="number"
                min="0"
                value={expPopulationCount}
                onChange={(e) => setExpPopulationCount(e.target.value)}
                className="app-input"
              />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">عدد المسلمين</label>
              <input
                type="number"
                min="0"
                value={expMuslimsCount}
                onChange={(e) => setExpMuslimsCount(e.target.value)}
                className="app-input"
              />
            </div>
            <div className="app-field app-field--grow">
              <label className="app-label">عدد غير المسلمين</label>
              <input
                type="number"
                min="0"
                value={expNonMuslimsCount}
                onChange={(e) => setExpNonMuslimsCount(e.target.value)}
                className="app-input"
              />
            </div>
          </div>

          {expSchemaFields.length > 0 && (
            <>
              <hr className="villages-form__divider" />
              <h3 className="villages-form__title">
                حقول النوع: {expSelectedType?.name || ''}
              </h3>
              {expOptionCachesLoading && (
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  جاري تحميل قوائم البيانات من المنصة…
                </p>
              )}
              <div className="exploration-modal-flow">
                <ExplorationDynamicFieldBlock
                  variant="sheet"
                  fields={mergedExpFields}
                  values={expFieldValues}
                  onChange={setExpDynamicValue}
                  storageUserId={storageUserId}
                  actorUser={actorUser}
                />
              </div>
            </>
          )}

          <hr className="villages-form__divider" />

          <div className="villages-form__head-row">
            <h3 className="villages-form__title villages-form__title--inline">
              سجل المهتدين والمسلمين القدامى (يُسجَّلون كطلاب في المدارس التي تختارها)
            </h3>
            <div className="villages-form__counter">الإجمالي: {expNewMuslims.length}</div>
          </div>

          <div className="app-alert app-alert--info" style={{ marginBottom: '0.75rem' }}>
            يتم تسجيل المهتدين/المسلمين القدامى كطلاب بعد إنشاء القرية. اربط المدارس بهذه القرية لتُسجَّل الأسماء فيها
            تلقائياً. عند عدم وجود مدرسة، تُسجَّل أسماؤهم كأفراد قرية فقط.
          </div>

          <div className="villages-form__new-muslim-row">
            <div className="app-field app-field--grow">
              <label className="app-label">الاسم</label>
              <input
                type="text"
                value={expMuslimName}
                onChange={(e) => setExpMuslimName(e.target.value)}
                className="app-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpNewMuslimToList())}
              />
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">النوع</label>
              <AppSelect
                searchable
                value={expMuslimType}
                onChange={(e) => setExpMuslimType(e.target.value)}
              >
                <option value="رجل">رجل</option>
                <option value="امرأة">امرأة</option>
                <option value="طفل">طفل</option>
              </AppSelect>
            </div>
            <div className="app-field villages-form__new-muslim-type">
              <label className="app-label">التصنيف</label>
              <AppSelect
                searchable
                value={expMuslimCategoryForm}
                onChange={(e) => setExpMuslimCategoryForm(normalizeMuslimCategory(e.target.value))}
              >
                <option value="convert">مهتد جديد</option>
                <option value="born">مسلم قديم</option>
              </AppSelect>
            </div>
            <button
              type="button"
              onClick={addExpNewMuslimToList}
              className="google-btn google-btn--toolbar villages-form__new-muslim-btn"
            >
              <UserPlus size={16} /> إضافة
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
                    <span className="villages-form__new-muslims-type" style={{ opacity: 0.85 }}>
                      ({normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN ? 'مسلم قديم' : 'مهتد'})
                    </span>
                  </span>
                  <X
                    size={16}
                    color="var(--danger-color)"
                    style={{ cursor: 'pointer' }}
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
              إلغاء
            </button>
            <BusyButton
              type="submit"
              busy={expSavingExploration}
              className="google-btn google-btn--filled villages-form__action-btn villages-form__action-btn--primary"
            >
              حفظ القرية
            </BusyButton>
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
                  <button className="icon-btn" onClick={() => navigate(`/villages/${vil.id}`)} title="عرض التفاصيل الكاملة">
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.villages, 'village_report_quick_add') && (
                  <button
                    className="icon-btn"
                    title="إضافة تقرير المدرسة الافتراضية"
                    disabled={!defaultSchoolByVillage[vil.id]}
                    onClick={() => navigate(`/schools/${defaultSchoolByVillage[vil.id]}?composeReport=1`)}
                  >
                    <Plus size={16} color="var(--success-color)" />
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
              {!!defaultSchoolName && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: '0.25rem',
                    marginBottom: '0.35rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 999,
                    background: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
                    color: 'var(--accent-color)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                  title={`المدرسة الافتراضية: ${defaultSchoolName}`}
                >
                  <FileText size={12} />
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
              <div
                className="surface-card"
                style={{
                  marginTop: '0.85rem',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  display: 'grid',
                  gap: '0.6rem',
                }}
              >
                <strong style={{ fontSize: '0.92rem' }}>المدرسة الافتراضية للتقرير</strong>
                {(schoolsByVillage[vil.id] || []).length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    لا توجد مدارس مرتبطة بهذه القرية.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <AppSelect searchable
                      value={defaultSchoolByVillage[vil.id] || ''}
                      onChange={(e) =>
                        setDefaultSchoolByVillage((prev) => ({ ...prev, [vil.id]: e.target.value }))
                      }
                    >
                      {villageSchools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.name}
                        </option>
                      ))}
                    </AppSelect>
                    {can(PERMISSION_PAGE_IDS.villages, 'village_default_school_set') && (
                      <BusyButton
                        type="button"
                        className="google-btn"
                        style={{ width: 'auto', minHeight: '38px', padding: '0 12px' }}
                        busy={savingDefaultSchoolForVillageId === vil.id}
                        onClick={() => handleSaveDefaultSchool(vil, defaultSchoolByVillage[vil.id])}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Settings2 size={14} /> حفظ الافتراضي
                        </span>
                      </BusyButton>
                    )}
                    {can(PERMISSION_PAGE_IDS.villages, 'village_report_quick_add') && (
                      <button
                        type="button"
                        className="google-btn google-btn--filled"
                        style={{ width: '100%', minHeight: '38px', padding: '0 12px' }}
                        disabled={!defaultSchoolByVillage[vil.id]}
                        onClick={() => navigate(`/schools/${defaultSchoolByVillage[vil.id]}?composeReport=1`)}
                        title={
                          defaultSchoolByVillage[vil.id]
                            ? 'إضافة تقرير للمدرسة الافتراضية'
                            : 'لا توجد مدرسة افتراضية متاحة'
                        }
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={14} /> إضافة تقرير المدرسة الافتراضية
                        </span>
                      </button>
                    )}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  الافتراضي التلقائي هو أول مدرسة في القائمة، ويمكن تغييره يدويًا.
                </p>
                {!!defaultSchoolName && (
                  <div
                    className="app-alert app-alert--info"
                    style={{ margin: 0, padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
                  >
                    المدرسة الافتراضية الحالية: <strong>{defaultSchoolName}</strong>
                  </div>
                )}
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
                    يُسجَّل الشخص في المدارس المحددة ضمن قائمة الطلاب لكل مدرسة. الافتراضي أول مدرسة؛ يمكن اختيار أكثر من مدرسة.
                  </p>
                  {(schoolsByVillage[vil.id] || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginBottom: 10 }}>
                      {(schoolsByVillage[vil.id] || []).map((sch) => (
                        <label key={sch.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input
                            type="checkbox"
                            checked={nmDraftSchoolIds.includes(sch.id)}
                            onChange={() => toggleNmDraftSchool(sch.id)}
                            disabled={nmSaving}
                          />
                          <span>{sch.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
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
                    <AppSelect searchable
                      value={nmDraftType}
                      onChange={(e) => setNmDraftType(e.target.value)}
                      disabled={nmSaving}
                    >
                      <option value="رجل">رجل</option>
                      <option value="امرأة">امرأة</option>
                      <option value="طفل">طفل</option>
                    </AppSelect>
                    <AppSelect searchable
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
                              <AppSelect searchable
                                value={nmEditingType}
                                onChange={(e) => setNmEditingType(e.target.value)}
                                disabled={nmSaving}
                              >
                                <option value="رجل">رجل</option>
                                <option value="امرأة">امرأة</option>
                                <option value="طفل">طفل</option>
                              </AppSelect>
                              <AppSelect searchable
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
