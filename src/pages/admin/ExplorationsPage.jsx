import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Compass, X, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import FirestoreApi from '../../services/firestoreApi';
import AppSelect from '../../components/AppSelect';
import FormModal from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
import {
  normalizeSchemaFields,
  initialFieldValues,
  validateFieldValues,
  sanitizeFieldValuesForSave,
} from '../../utils/explorationDynamicFields';
import ExplorationDynamicFieldBlock from '../../components/ExplorationDynamicFieldBlock';
import ExplorationListCard from '../../components/ExplorationListCard';
import { useExplorationOptionCaches } from '../../hooks/useExplorationOptionCaches';
import { filterExplorationTypesForPage } from '../../utils/explorationTargetPages';

const defaultForm = () => ({
  explorationTypeId: '',
  explorationTypeName: '',
  governorateId: '',
  governorateName: '',
  regionId: '',
  regionName: '',
  villageId: '',
  villageName: '',
  districtName: '',
  groupName: '',
  ltiName: '',
  kingName: '',
  familiesCount: '',
  muslimFamiliesCount: '',
  nonMuslimFamiliesCount: '',
  hasMosque: '',
  nearestMosqueDistanceKm: '',
  hasWell: '',
  nearestWellDistanceKm: '',
  islamEnteredVillage: '',
  hasMadrasa: '',
  hasSchool: '',
  wellUsageCost: '',
  hasElectricity: '',
  closestVillages: '',
  explorationDate: new Date().toISOString().slice(0, 10),
  explorationSupervisor: '',
  villageNeeds: '',
  fieldValues: {},
});

const yesNo = [
  { value: '', label: t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد') },
  { value: 'yes', label: t('components.ExplorationDynamicFieldBlock.نعم', 'نعم') },
  { value: 'no', label: t('components.ExplorationDynamicFieldBlock.لا', 'لا') },
];

const numberOrZero = (v) => {
  const { t } = useAppTranslation();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const ExplorationsPage = () => {
  const { can, ready, pageDataScope, membershipGroupIds, membershipMirrorGroupIds, membershipLoading, actorUser } = usePermissions();
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [explorations, setExplorations] = useState([]);
  const [allExplorationTypes, setAllExplorationTypes] = useState([]);
  const [form, setForm] = useState(defaultForm());

  const types = useMemo(
    () => filterExplorationTypesForPage(allExplorationTypes, PERMISSION_PAGE_IDS.explorations),
    [allExplorationTypes]
  );

  const modalTypes = useMemo(
    () =>
      filterExplorationTypesForPage(allExplorationTypes, PERMISSION_PAGE_IDS.explorations, {
        alwaysIncludeIds: [editingItem?.explorationTypeId, form.explorationTypeId].filter(Boolean),
      }),
    [allExplorationTypes, editingItem?.explorationTypeId, form.explorationTypeId]
  );

  const selectedType = useMemo(
    () => allExplorationTypes.find((t) => t.id === form.explorationTypeId) || null,
    [allExplorationTypes, form.explorationTypeId]
  );

  const schemaFields = useMemo(
    () => normalizeSchemaFields(selectedType?.schemaFields || selectedType?.fields || []),
    [selectedType]
  );

  const useDynamicForm = schemaFields.length > 0;

  const optionCachesEnabled = isModalOpen && useDynamicForm;
  const { mergeFields, loading: optionCachesLoading } = useExplorationOptionCaches(optionCachesEnabled);

  const mergedDynamicFields = useMemo(
    () => mergeFields(schemaFields, form.fieldValues || {}, actorUser),
    [mergeFields, schemaFields, form.fieldValues, actorUser]
  );

  const filteredExplorations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return explorations;
    return explorations.filter((row) => {
      const hay = [
        row.explorationTypeName,
        row.governorateName,
        row.regionName,
        row.villageName,
        row.groupName,
        row.explorationSupervisor,
        JSON.stringify(row.fieldValues || {}),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [explorations, search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const expDocs = await api.getDocuments(api.getExplorationsCollection());
      const typeDocs = await api.getDocuments(api.getExplorationTypesCollection());

      const typeRowsRaw = typeDocs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));

      const typeMap = new Map(typeRowsRaw.map((t) => [t.id, t.name || '']));

      const scope = pageDataScope(PERMISSION_PAGE_IDS.explorations);
      let allowedVillageIds = null;
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        const villageDocs = await api.getCollectionGroupDocuments('villages');
        const villageRows = villageDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const villageSet = new Set();
        villageRows.forEach((v) => {
          if (
            membershipGroupIds.has(v.id) ||
            membershipMirrorGroupIds.has(v.regionId) ||
            membershipMirrorGroupIds.has(v.govId)
          ) {
            villageSet.add(v.id);
          }
        });
        allowedVillageIds = villageSet;
      }

      const expRows = expDocs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((row) => {
          if (!allowedVillageIds) return true;
          return row.villageId && allowedVillageIds.has(row.villageId);
        })
        .map((row) => ({
          ...row,
          explorationTypeName: row.explorationTypeName || typeMap.get(row.explorationTypeId) || '',
        }))
        .sort((a, b) => new Date(b.explorationDate || b.createdAt || 0) - new Date(a.explorationDate || a.createdAt || 0));

      setAllExplorationTypes(typeRowsRaw);
      setExplorations(expRows);
    } catch (err) {
      console.error(err);
      setError(t('pages.ExplorationsPage.تعذر_تحميل_بيانات_الاستكشاف', 'تعذر تحميل بيانات الاستكشاف.'));
    } finally {
      setLoading(false);
    }
  }, [membershipGroupIds, membershipMirrorGroupIds, pageDataScope]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.explorations) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchAll();
  }, [ready, membershipLoading, fetchAll, pageDataScope]);

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

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(defaultForm());
  };

  const openAddModal = () => {
    setEditingItem(null);
    const firstId = types[0]?.id || '';
    const t = types.find((x) => x.id === firstId);
    const sch = normalizeSchemaFields(t?.schemaFields || t?.fields || []);
    setForm({
      ...defaultForm(),
      explorationTypeId: firstId,
      explorationTypeName: t?.name || '',
      fieldValues: sch.length > 0 ? initialFieldValues(sch, {}) : {},
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    const t = allExplorationTypes.find((x) => x.id === item.explorationTypeId);
    const sch = normalizeSchemaFields(t?.schemaFields || t?.fields || []);

    if (sch.length > 0) {
      setForm({
        ...defaultForm(),
        explorationTypeId: item.explorationTypeId || '',
        explorationTypeName: item.explorationTypeName || t?.name || '',
        governorateId: item.governorateId || '',
        governorateName: item.governorateName || '',
        regionId: item.regionId || '',
        regionName: item.regionName || '',
        villageId: item.villageId || '',
        villageName: item.villageName || '',
        districtName: item.districtName || '',
        groupName: item.groupName || '',
        ltiName: item.ltiName || '',
        fieldValues: initialFieldValues(sch, item.fieldValues),
      });
    } else {
      setForm({
        ...defaultForm(),
        ...item,
        familiesCount: String(item.familiesCount ?? ''),
        muslimFamiliesCount: String(item.muslimFamiliesCount ?? ''),
        nonMuslimFamiliesCount: String(item.nonMuslimFamiliesCount ?? ''),
        nearestMosqueDistanceKm: String(item.nearestMosqueDistanceKm ?? ''),
        nearestWellDistanceKm: String(item.nearestWellDistanceKm ?? ''),
        wellUsageCost: String(item.wellUsageCost ?? ''),
        fieldValues: item.fieldValues && typeof item.fieldValues === 'object' ? item.fieldValues : {},
      });
    }
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onExplorationTypeChange = (nextTypeId) => {
    const t = modalTypes.find((x) => x.id === nextTypeId) || allExplorationTypes.find((x) => x.id === nextTypeId);
    const sch = normalizeSchemaFields(t?.schemaFields || t?.fields || []);
    setForm((prev) => ({
      ...prev,
      explorationTypeId: nextTypeId,
      explorationTypeName: t?.name || '',
      fieldValues: sch.length > 0 ? initialFieldValues(sch, {}) : {},
    }));
  };

  const setDynamicValue = (fieldId, value) => {
    setForm((prev) => ({
      ...prev,
      fieldValues: { ...(prev.fieldValues || {}), [fieldId]: value },
    }));
  };

  const saveExploration = async (e) => {
    e.preventDefault();
    if (!form.explorationTypeId || saving) {
      setError(t('pages.ExplorationsPage.يرجى_اختيار_نوع_الاستكشاف', 'يرجى اختيار نوع الاستكشاف.'));
      return;
    }

    const type = allExplorationTypes.find((t) => t.id === form.explorationTypeId);
    const sch = normalizeSchemaFields(type?.schemaFields || type?.fields || []);

    if (sch.length > 0) {
      const missing = validateFieldValues(sch, form.fieldValues || {});
      if (missing.length) {
        setError(`يرجى تعبئة الحقول المطلوبة: ${missing.join('، ')}`);
        return;
      }
      const payload = {
        explorationTypeId: form.explorationTypeId,
        explorationTypeName: type?.name || form.explorationTypeName || '',
        governorateId: form.governorateId || '',
        governorateName: form.governorateName || '',
        regionId: form.regionId || '',
        regionName: form.regionName || '',
        villageId: form.villageId || '',
        villageName: form.villageName || '',
        districtName: form.districtName || '',
        groupName: form.groupName || '',
        ltiName: form.ltiName || '',
        fieldValues: sanitizeFieldValuesForSave(sch, form.fieldValues || {}),
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        setSaving(true);
        const api = FirestoreApi.Api;
        if (editingItem) {
          await api.updateData({
            docRef: api.getExplorationDoc(editingItem.id),
            data: payload,
          });
          setSuccess(t('pages.ExplorationsPage.تم_تحديث_الاستكشاف', 'تم تحديث الاستكشاف.'));
        } else {
          const id = api.getNewId('explorations');
          await api.setData({
            docRef: api.getExplorationDoc(id),
            data: payload,
          });
          setSuccess(t('pages.ExplorationsPage.تمت_إضافة_الاستكشاف_بنجاح', 'تمت إضافة الاستكشاف بنجاح.'));
        }
        setError('');
        closeModal();
        fetchAll();
      } catch (err) {
        console.error(err);
        setError(t('pages.ExplorationsPage.تعذر_حفظ_الاستكشاف', 'تعذر حفظ الاستكشاف.'));
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload = {
      ...form,
      explorationTypeName: type?.name || form.explorationTypeName || '',
      familiesCount: numberOrZero(form.familiesCount),
      muslimFamiliesCount: numberOrZero(form.muslimFamiliesCount),
      nonMuslimFamiliesCount: numberOrZero(form.nonMuslimFamiliesCount),
      nearestMosqueDistanceKm: numberOrZero(form.nearestMosqueDistanceKm),
      nearestWellDistanceKm: numberOrZero(form.nearestWellDistanceKm),
      wellUsageCost: numberOrZero(form.wellUsageCost),
      createdAt: editingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    delete payload.fieldValues;

    try {
      setSaving(true);
      const api = FirestoreApi.Api;
      if (editingItem) {
        await api.updateData({
          docRef: api.getExplorationDoc(editingItem.id),
          data: payload,
        });
        setSuccess(t('pages.ExplorationsPage.تم_تحديث_الاستكشاف', 'تم تحديث الاستكشاف.'));
      } else {
        const id = api.getNewId('explorations');
        await api.setData({
          docRef: api.getExplorationDoc(id),
          data: payload,
        });
        setSuccess(t('pages.ExplorationsPage.تمت_إضافة_الاستكشاف_بنجاح', 'تمت إضافة الاستكشاف بنجاح.'));
      }
      setError('');
      closeModal();
      fetchAll();
    } catch (err) {
      console.error(err);
      setError(t('pages.ExplorationsPage.تعذر_حفظ_الاستكشاف', 'تعذر حفظ الاستكشاف.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteExploration = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getExplorationDoc(id));
      setSuccess(t('pages.ExplorationsPage.تم_حذف_الاستكشاف', 'تم حذف الاستكشاف.'));
      setError('');
      fetchAll();
    } catch (err) {
      console.error(err);
      setError(t('pages.ExplorationsPage.تعذر_حذف_الاستكشاف', 'تعذر حذف الاستكشاف.'));
    }
  };

  const cardSubtitle = (item) => {
    const fv = item.fieldValues;
    if (fv && typeof fv === 'object' && Object.keys(fv).length) {
      const first = Object.values(fv).find((x) => x !== '' && x != null && JSON.stringify(x) !== '{}');
      if (first != null && typeof first === 'object' && 'from' in first) {
        return `بيانات مخصصة: ${first.from || '؟'} → ${first.to || '؟'}`;
      }
      if (first != null && String(first).trim()) return `بيانات مخصصة: ${String(first).slice(0, 40)}${String(first).length > 40 ? '…' : ''}`;
      return t('pages.ExplorationsPage.نموذج_مخصص', 'نموذج مخصص');
    }
    return `تاريخ الاستكشاف: ${item.explorationDate || '-'} - المشرف: ${item.explorationSupervisor || '-'}`;
  };

  return (
    <div className="explorations-page">
      <PageHeader icon={Compass} title={t('pages.ExplorationsPage.قسم_الاستكشاف', 'قسم الاستكشاف')}>
        {can(PERMISSION_PAGE_IDS.explorations, 'exploration_add') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={openAddModal}>
            <Plus size={18} />
            <span className="explorations-toolbar__long">{t('config.permissionRegistry.إضافة_استكشاف', 'إضافة استكشاف')}</span>
            <span className="explorations-toolbar__short">{t('components.ReportTextList.إضافة', 'إضافة')}</span>
          </button>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.explorations) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info explorations-alert">
          عرض محدود: تظهر بيانات الاستكشاف المرتبطة بقراك/مجموعاتك فقط.
        </div>
      )}
      {error && <div className="app-alert app-alert--error explorations-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success explorations-alert">{success}</div>}

      <div className="surface-card explorations-search-card">
        <label className="app-label">{t('utils.explorationDynamicFields.بحث', 'بحث')}</label>
        <div className="explorations-search-row">
          <Search size={16} color="var(--text-secondary)" aria-hidden />
          <input
            className="app-input"
            placeholder={t('pages.ExplorationsPage.ابحث_بالنوع_أو_المشرف_أو_الحقول_أو_القرية', 'ابحث بالنوع أو المشرف أو الحقول أو القرية...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner explorations-loading" />
      ) : filteredExplorations.length === 0 ? (
        <div className="empty-state">لا توجد استكشافات مضافة حتى الآن.</div>
      ) : (
        <div className="entity-grid entity-grid--md explorations-grid">
          {filteredExplorations.map((item) => (
            <ExplorationListCard
              key={item.id}
              item={item}
              subtitle={cardSubtitle(item)}
              canEdit={can(PERMISSION_PAGE_IDS.explorations, 'exploration_edit')}
              canDelete={can(PERMISSION_PAGE_IDS.explorations, 'exploration_delete')}
              onEdit={() => openEditModal(item)}
              onDelete={() =>
                setPendingDelete({ id: item.id, name: item.explorationTypeName || item.villageName || item.id })
              }
            />
          ))}
        </div>
      )}

      <FormModal
        open={isModalOpen}
        title={editingItem ? t('pages.ExplorationsPage.تعديل_الاستكشاف', 'تعديل الاستكشاف') : t('pages.ExplorationsPage.إضافة_استكشاف_جديد', 'إضافة استكشاف جديد')}
        onClose={closeModal}
        size="xl"
        className="modal-card--exploration-flow"
      >
        <form onSubmit={saveExploration} className="exploration-modal-form">
          <div className="exploration-modal-scroll">
            <div className="exploration-modal-flow">
              <section className="exploration-modal-type-card">
                <label className="exploration-modal-type-card__label">نوع الاستكشاف (مطلوب)</label>
                <AppSelect
                  searchable
                  className="exploration-modal-type-card__select"
                  value={form.explorationTypeId}
                  onChange={(e) => onExplorationTypeChange(e.target.value)}
                  required
                >
                  {modalTypes.length === 0 ? (
                    <option value="">لا توجد أنواع لهذه الصفحة — راجع «أنواع الاستكشاف»</option>
                  ) : (
                    modalTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </AppSelect>
                {modalTypes.length > 0 && (
                  <p className="exploration-modal-type-card__hint">
                    يُحدَّد النوع أولاً (الافتراضي: أول نوع في القائمة). عند اختيار نوع يُحمَّل القالب فوراً دون خطوة
                    إضافية.
                  </p>
                )}
              </section>

              {form.explorationTypeId && (
                <>
                  <div className="exploration-modal-template-banner">
                    <p className="exploration-modal-template-banner__text">
                      {useDynamicForm ? (
                        <>
                          <strong>نموذج مخصص.</strong> الحقول من «أنواع الاستكشاف».
                        </>
                      ) : (
                        <>
                          <strong>النموذج التقليدي.</strong> لم يُضف لهذا النوع حقول مخصصة بعد.
                        </>
                      )}
                    </p>
                  </div>
                  {useDynamicForm ? (
                    <>
                      {optionCachesLoading && (
                        <p className="exploration-modal-loading-hint">جاري تحميل قوائم البيانات من المنصة…</p>
                      )}
                      <ExplorationDynamicFieldBlock
                        variant="sheet"
                        fields={mergedDynamicFields}
                        values={form.fieldValues || {}}
                        onChange={setDynamicValue}
                        storageUserId={storageUserId}
                        actorUser={actorUser}
                      />
                    </>
                  ) : (
                    <div className="exploration-field-sheet exploration-field-sheet--legacy">
                      <label className="app-label">اسم اللواء / District</label>
                      <input className="app-input" value={form.districtName} onChange={(e) => setField('districtName', e.target.value)} />

                      <label className="app-label">اسم المجموعة</label>
                      <input className="app-input" value={form.groupName} onChange={(e) => setField('groupName', e.target.value)} />

                      <label className="app-label">L/A</label>
                      <input className="app-input" value={form.ltiName} onChange={(e) => setField('ltiName', e.target.value)} />

                      <label className="app-label">اسم القرية</label>
                      <input className="app-input" value={form.villageName} onChange={(e) => setField('villageName', e.target.value)} />

                      <label className="app-label">اسم الملك/الإنجيلي</label>
                      <input className="app-input" value={form.kingName} onChange={(e) => setField('kingName', e.target.value)} />

                      <label className="app-label">عدد الأسر</label>
                      <input
                        className="app-input"
                        inputMode="numeric"
                        value={form.familiesCount}
                        onChange={(e) => setField('familiesCount', e.target.value.replace(/[^\d.]/g, ''))}
                      />

                      <label className="app-label">عدد الأسر المسلمين</label>
                      <input
                        className="app-input"
                        inputMode="numeric"
                        value={form.muslimFamiliesCount}
                        onChange={(e) => setField('muslimFamiliesCount', e.target.value.replace(/[^\d.]/g, ''))}
                      />

                      <label className="app-label">عدد الأسر غير المسلمين</label>
                      <input
                        className="app-input"
                        inputMode="numeric"
                        value={form.nonMuslimFamiliesCount}
                        onChange={(e) => setField('nonMuslimFamiliesCount', e.target.value.replace(/[^\d.]/g, ''))}
                      />

                      <label className="app-label">هل يوجد مسجد؟</label>
                      <AppSelect className="exploration-field-sheet__select" value={form.hasMosque} onChange={(e) => setField('hasMosque', e.target.value)}>
                        {yesNo.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </AppSelect>

                      <label className="app-label">المسافة لأقرب مسجد (كم)</label>
                      <input
                        className="app-input"
                        inputMode="decimal"
                        value={form.nearestMosqueDistanceKm}
                        onChange={(e) => setField('nearestMosqueDistanceKm', e.target.value.replace(/[^\d.]/g, ''))}
                      />

                      <label className="app-label">هل يوجد بئر؟</label>
                      <AppSelect className="exploration-field-sheet__select" value={form.hasWell} onChange={(e) => setField('hasWell', e.target.value)}>
                        {yesNo.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </AppSelect>

                      <label className="app-label">المسافة لأقرب بئر (كم)</label>
                      <input
                        className="app-input"
                        inputMode="decimal"
                        value={form.nearestWellDistanceKm}
                        onChange={(e) => setField('nearestWellDistanceKm', e.target.value.replace(/[^\d.]/g, ''))}
                      />

                      <label className="app-label">هل دخل الإسلام للقرية؟</label>
                      <AppSelect className="exploration-field-sheet__select" value={form.islamEnteredVillage} onChange={(e) => setField('islamEnteredVillage', e.target.value)}>
                        {yesNo.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </AppSelect>

                      <label className="app-label">هل يوجد مدرسة قرآنية؟</label>
                      <AppSelect className="exploration-field-sheet__select" value={form.hasMadrasa} onChange={(e) => setField('hasMadrasa', e.target.value)}>
                        {yesNo.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </AppSelect>

                      <label className="app-label">هل يوجد مدرسة؟</label>
                      <AppSelect className="exploration-field-sheet__select" value={form.hasSchool} onChange={(e) => setField('hasSchool', e.target.value)}>
                        {yesNo.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </AppSelect>

                      <label className="app-label">كم سيكلف استخدام البئر؟</label>
                      <input
                        className="app-input"
                        inputMode="decimal"
                        value={form.wellUsageCost}
                        onChange={(e) => setField('wellUsageCost', e.target.value.replace(/[^\d.]/g, ''))}
                      />

                      <label className="app-label">هل لدى القرية كهرباء؟</label>
                      <AppSelect className="exploration-field-sheet__select" value={form.hasElectricity} onChange={(e) => setField('hasElectricity', e.target.value)}>
                        {yesNo.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </AppSelect>

                      <label className="app-label">أقرب قريتين</label>
                      <input className="app-input" value={form.closestVillages} onChange={(e) => setField('closestVillages', e.target.value)} />

                      <label className="app-label">تاريخ الاستكشاف</label>
                      <input className="app-input" type="date" value={form.explorationDate} onChange={(e) => setField('explorationDate', e.target.value)} />

                      <label className="app-label">اسم المشرف</label>
                      <input className="app-input" value={form.explorationSupervisor} onChange={(e) => setField('explorationSupervisor', e.target.value)} />

                      <label className="app-label">احتياج القرية</label>
                      <textarea
                        className="app-input exploration-field-sheet__textarea"
                        value={form.villageNeeds}
                        onChange={(e) => setField('villageNeeds', e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="exploration-modal-footer">
            <button type="button" className="google-btn exploration-modal-footer__btn" onClick={closeModal}>
              <span className="exploration-modal-footer__btn-inner">
                <X size={14} aria-hidden /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled exploration-modal-footer__btn">
              <span className="exploration-modal-footer__btn-inner">
                <Save size={14} aria-hidden /> حفظ الاستكشاف
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('pages.ExplorationsPage.تأكيد_حذف_الاستكشاف', 'تأكيد حذف الاستكشاف')}
        message={`سيتم حذف سجل الاستكشاف «${pendingDelete?.name || ''}» نهائياً.`}
        danger
        confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await deleteExploration(item.id);
        }}
      />
    </div>
  );
};

export default ExplorationsPage;
