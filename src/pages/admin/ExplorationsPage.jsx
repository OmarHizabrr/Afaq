import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Compass, Edit2, Trash2, X, Save } from 'lucide-react';
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
  { value: '', label: 'غير محدد' },
  { value: 'yes', label: 'نعم' },
  { value: 'no', label: 'لا' },
];

const numberOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const ExplorationsPage = () => {
  const { can, ready, pageDataScope, membershipGroupIds, membershipMirrorGroupIds, membershipLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [explorations, setExplorations] = useState([]);
  const [types, setTypes] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [regions, setRegions] = useState([]);
  const [villages, setVillages] = useState([]);
  const [form, setForm] = useState(defaultForm());

  const selectedType = useMemo(
    () => types.find((t) => t.id === form.explorationTypeId) || null,
    [types, form.explorationTypeId]
  );

  const schemaFields = useMemo(
    () => normalizeSchemaFields(selectedType?.schemaFields || selectedType?.fields || []),
    [selectedType]
  );

  const useDynamicForm = schemaFields.length > 0;

  const filteredRegions = useMemo(() => {
    if (!form.governorateId) return regions;
    return regions.filter((r) => (r.govId || '') === form.governorateId);
  }, [regions, form.governorateId]);

  const filteredVillages = useMemo(() => {
    if (!form.regionId) return villages;
    return villages.filter((v) => (v.regionId || '') === form.regionId);
  }, [villages, form.regionId]);

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
      const [expDocs, typeDocs, govDocs, regionDocs, villageDocs] = await Promise.all([
        api.getDocuments(api.getExplorationsCollection()),
        api.getDocuments(api.getExplorationTypesCollection()),
        api.getDocuments(api.getGovernoratesCollection()),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
      ]);

      const typeRows = typeDocs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));

      const govRows = govDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const regionRows = regionDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const villageRows = villageDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const typeMap = new Map(typeRows.map((t) => [t.id, t.name || '']));

      const scope = pageDataScope(PERMISSION_PAGE_IDS.explorations);
      let allowedVillageIds = null;
      if (scope === DATA_SCOPE_MEMBERSHIP) {
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
          return allowedVillageIds.has(row.villageId);
        })
        .map((row) => ({
          ...row,
          explorationTypeName: row.explorationTypeName || typeMap.get(row.explorationTypeId) || '',
        }))
        .sort((a, b) => new Date(b.explorationDate || b.createdAt || 0) - new Date(a.explorationDate || a.createdAt || 0));

      setTypes(typeRows);
      setGovernorates(govRows);
      setRegions(regionRows);
      setVillages(villageRows);
      setExplorations(expRows);
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل بيانات الاستكشاف.');
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
    setForm(defaultForm());
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    const t = types.find((x) => x.id === item.explorationTypeId);
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
    const t = types.find((x) => x.id === nextTypeId);
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

  const onGovernorateChange = (nextGovId) => {
    const gov = governorates.find((g) => g.id === nextGovId);
    setForm((prev) => ({
      ...prev,
      governorateId: nextGovId,
      governorateName: gov?.name || '',
      regionId: '',
      regionName: '',
      villageId: '',
      villageName: '',
      districtName: gov?.name || '',
    }));
  };

  const onRegionChange = (nextRegionId) => {
    const region = regions.find((r) => r.id === nextRegionId);
    const gov = governorates.find((g) => g.id === (region?.govId || ''));
    setForm((prev) => ({
      ...prev,
      regionId: nextRegionId,
      regionName: region?.name || '',
      governorateId: region?.govId || prev.governorateId,
      governorateName: gov?.name || prev.governorateName,
      villageId: '',
      villageName: '',
      districtName: gov?.name || prev.districtName,
    }));
  };

  const onVillageChange = (nextVillageId) => {
    const village = villages.find((v) => v.id === nextVillageId);
    const region = regions.find((r) => r.id === (village?.regionId || ''));
    const gov = governorates.find((g) => g.id === (region?.govId || village?.govId || ''));
    setForm((prev) => ({
      ...prev,
      villageId: nextVillageId,
      villageName: village?.villageName || '',
      groupName: village?.groupName || prev.groupName,
      ltiName: village?.ltiName || prev.ltiName,
      regionId: village?.regionId || prev.regionId,
      regionName: region?.name || prev.regionName,
      governorateId: region?.govId || village?.govId || prev.governorateId,
      governorateName: gov?.name || prev.governorateName,
      districtName: gov?.name || prev.districtName,
    }));
  };

  const saveExploration = async (e) => {
    e.preventDefault();
    if (!form.explorationTypeId || !form.villageId || saving) {
      setError('يرجى اختيار نوع الاستكشاف والقرية على الأقل.');
      return;
    }

    const type = types.find((t) => t.id === form.explorationTypeId);
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
        villageId: form.villageId,
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
          setSuccess('تم تحديث الاستكشاف.');
        } else {
          const id = api.getNewId('explorations');
          await api.setData({
            docRef: api.getExplorationDoc(id),
            data: payload,
          });
          setSuccess('تمت إضافة الاستكشاف بنجاح.');
        }
        setError('');
        closeModal();
        fetchAll();
      } catch (err) {
        console.error(err);
        setError('تعذر حفظ الاستكشاف.');
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
        setSuccess('تم تحديث الاستكشاف.');
      } else {
        const id = api.getNewId('explorations');
        await api.setData({
          docRef: api.getExplorationDoc(id),
          data: payload,
        });
        setSuccess('تمت إضافة الاستكشاف بنجاح.');
      }
      setError('');
      closeModal();
      fetchAll();
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ الاستكشاف.');
    } finally {
      setSaving(false);
    }
  };

  const deleteExploration = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getExplorationDoc(id));
      setSuccess('تم حذف الاستكشاف.');
      setError('');
      fetchAll();
    } catch (err) {
      console.error(err);
      setError('تعذر حذف الاستكشاف.');
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
      return 'نموذج مخصص';
    }
    return `تاريخ الاستكشاف: ${item.explorationDate || '-'} - المشرف: ${item.explorationSupervisor || '-'}`;
  };

  return (
    <div>
      <PageHeader icon={Compass} title="قسم الاستكشاف">
        {can(PERMISSION_PAGE_IDS.explorations, 'exploration_add') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={openAddModal}>
            <Plus size={18} />
            <span>إضافة استكشاف</span>
          </button>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.explorations) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info" style={{ marginBottom: '0.75rem' }}>
          عرض محدود: تظهر بيانات الاستكشاف المرتبطة بقراك/مجموعاتك فقط.
        </div>
      )}
      {error && <div className="app-alert app-alert--error">{error}</div>}
      {success && <div className="app-alert app-alert--success">{success}</div>}

      <div className="surface-card" style={{ marginBottom: '1rem' }}>
        <label className="app-label">بحث</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            className="app-input"
            placeholder="ابحث بالنوع أو القرية أو المشرف أو قيم الحقول..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }} />
      ) : filteredExplorations.length === 0 ? (
        <div className="empty-state">لا توجد استكشافات مضافة حتى الآن.</div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {filteredExplorations.map((item) => (
            <div key={item.id} className="surface-card surface-card--entity">
              <div>
                <h3 style={{ margin: 0 }}>{item.explorationTypeName || 'نوع غير محدد'}</h3>
                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {item.governorateName || '-'} / {item.regionName || '-'} / {item.villageName || '-'}
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{cardSubtitle(item)}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {can(PERMISSION_PAGE_IDS.explorations, 'exploration_edit') && (
                  <button type="button" className="icon-btn" title="تعديل" onClick={() => openEditModal(item)}>
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.explorations, 'exploration_delete') && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="حذف"
                    onClick={() => setPendingDelete({ id: item.id, name: item.villageName || item.id })}
                  >
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        open={isModalOpen}
        title={editingItem ? 'تعديل الاستكشاف' : 'إضافة استكشاف جديد'}
        onClose={closeModal}
        size="lg"
      >
        <form onSubmit={saveExploration} className="exploration-form-grid">
          <label className="app-label">نوع الاستكشاف (مطلوب)</label>
          <AppSelect searchable value={form.explorationTypeId} onChange={(e) => onExplorationTypeChange(e.target.value)} required>
            <option value="">-- اختر النوع --</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </AppSelect>

          {form.explorationTypeId && (
            <p className="exploration-form-grid__full" style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {useDynamicForm
                ? 'هذا النوع يستخدم حقولاً مخصصة. عُرّف الحقول من صفحة «أنواع الاستكشاف».'
                : 'هذا النوع بدون حقول مخصصة: يظهر النموذج الكامل التقليدي.'}
            </p>
          )}

          <label className="app-label">المحافظة</label>
          <AppSelect searchable value={form.governorateId} onChange={(e) => onGovernorateChange(e.target.value)}>
            <option value="">-- اختر المحافظة --</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </AppSelect>

          <label className="app-label">المنطقة</label>
          <AppSelect searchable value={form.regionId} onChange={(e) => onRegionChange(e.target.value)}>
            <option value="">-- اختر المنطقة --</option>
            {filteredRegions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </AppSelect>

          <label className="app-label">القرية (مطلوب)</label>
          <AppSelect searchable value={form.villageId} onChange={(e) => onVillageChange(e.target.value)} required>
            <option value="">-- اختر القرية --</option>
            {filteredVillages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.villageName}
              </option>
            ))}
          </AppSelect>

          {useDynamicForm ? (
            <ExplorationDynamicFieldBlock fields={schemaFields} values={form.fieldValues || {}} onChange={setDynamicValue} />
          ) : (
            <>
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
              <AppSelect value={form.hasMosque} onChange={(e) => setField('hasMosque', e.target.value)}>
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
              <AppSelect value={form.hasWell} onChange={(e) => setField('hasWell', e.target.value)}>
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
              <AppSelect value={form.islamEnteredVillage} onChange={(e) => setField('islamEnteredVillage', e.target.value)}>
                {yesNo.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </AppSelect>

              <label className="app-label">هل يوجد مدرسة قرآنية؟</label>
              <AppSelect value={form.hasMadrasa} onChange={(e) => setField('hasMadrasa', e.target.value)}>
                {yesNo.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </AppSelect>

              <label className="app-label">هل يوجد مدرسة؟</label>
              <AppSelect value={form.hasSchool} onChange={(e) => setField('hasSchool', e.target.value)}>
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
              <AppSelect value={form.hasElectricity} onChange={(e) => setField('hasElectricity', e.target.value)}>
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
                className="app-input exploration-form-grid__full"
                value={form.villageNeeds}
                onChange={(e) => setField('villageNeeds', e.target.value)}
                style={{ minHeight: '90px' }}
              />
            </>
          )}

          <div className="exploration-form-grid__full" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="google-btn" style={{ width: 'auto' }} onClick={closeModal}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled" style={{ width: 'auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> حفظ الاستكشاف
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف الاستكشاف"
        message={`سيتم حذف سجل الاستكشاف للقرية "${pendingDelete?.name || ''}" نهائياً.`}
        danger
        confirmLabel="حذف نهائي"
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
