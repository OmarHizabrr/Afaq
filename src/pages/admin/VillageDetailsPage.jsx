import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { School, ChevronRight, Info, PieChart, MapPin, Edit2, Trash2, Plus, Save, X, User, Users, Baby, Hash, FileText } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import VillageDefaultSchoolPanel from '../../components/VillageDefaultSchoolPanel';
import VillageSchoolCheckboxGroup from '../../components/VillageSchoolCheckboxGroup';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
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

const VillageDetailsPage = () => {
  const { t } = useAppTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [village, setVillage] = useState(null);
    const [schools, setSchools] = useState([]);
    const [newMuslims, setNewMuslims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState(t('pages.VillageDetailsPage.رجل', 'رجل'));
    const [newMuslimCategory, setNewMuslimCategory] = useState(normalizeMuslimCategory());
    const [addMuslimSchoolIds, setAddMuslimSchoolIds] = useState([]);
    const [editingMuslimId, setEditingMuslimId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingType, setEditingType] = useState(t('pages.VillageDetailsPage.رجل', 'رجل'));
    const [editingMuslimCategory, setEditingMuslimCategory] = useState(normalizeMuslimCategory());
    const [pendingDelete, setPendingDelete] = useState(null);
    const [defaultSchoolId, setDefaultSchoolId] = useState('');
    const [savingDefaultSchool, setSavingDefaultSchool] = useState(false);
    const { can, ready, pageDataScope, membershipGroupIds, membershipMirrorGroupIds, membershipLoading } =
      usePermissions();

    useEffect(() => {
        const fetchVillageDetails = async () => {
            if (!id) return;
            setSchools([]);
            try {
                const api = FirestoreApi.Api;
                // Fetch Village
                const allVillages = await api.getCollectionGroupDocuments('villages');
                const vilDoc = allVillages.find(v => v.id === id);
                if (!vilDoc) return;
                setVillage({ id, ...vilDoc.data() });

                // Fetch Schools in this Village
                const allSchools = await api.getCollectionGroupDocuments('schools');
                const vilSchools = allSchools.filter(s => s.data().villageId === id).map(s => ({ id: s.id, ...s.data() }));
                setSchools(vilSchools);
                const hasValidDefault = vilSchools.some((s) => s.id === vilDoc.data()?.defaultSchoolId);
                setDefaultSchoolId(hasValidDefault ? vilDoc.data()?.defaultSchoolId : (vilSchools[0]?.id || ''));

                const newMuslimsDocs = await api.getDocuments(api.getNewMuslimsCollection());
                const villageNewMuslims = newMuslimsDocs
                  .map((doc) => {
                    const data = doc.data() || {};
                    const enrolledSchoolIds =
                      Array.isArray(data.enrolledSchoolIds) && data.enrolledSchoolIds.length > 0
                        ? data.enrolledSchoolIds
                        : data.enrolledSchoolId
                          ? [data.enrolledSchoolId]
                          : [];
                    return {
                      id: doc.id,
                      ...data,
                      muslimCategory: normalizeMuslimCategory(data.muslimCategory),
                      enrolledSchoolId: data.enrolledSchoolId || enrolledSchoolIds[0] || '',
                      enrolledSchoolIds,
                    };
                  })
                  .filter((doc) => doc.villageId === id);
                setNewMuslims(villageNewMuslims);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchVillageDetails();
    }, [id]);

    useEffect(() => {
      setAddMuslimSchoolIds([]);
    }, [id]);

    useEffect(() => {
      if (!schools.length) {
        setAddMuslimSchoolIds([]);
        return;
      }
      setAddMuslimSchoolIds((prev) => {
        const kept = prev.filter((pid) => schools.some((s) => s.id === pid));
        return kept.length ? kept : [schools[0].id];
      });
    }, [schools]);

    const toggleAddMuslimSchool = (schoolId) => {
      setAddMuslimSchoolIds((prev) => {
        if (prev.includes(schoolId)) {
          if (prev.length <= 1) return prev;
          return prev.filter((x) => x !== schoolId);
        }
        return [...prev, schoolId];
      });
    };

    if (loading) return <div className="loading-spinner page-loading-lg" />;
    if (!village) return <div className="empty-state">{t('pages.VillageDetailsPage.القرية_غير_موجودة', 'القرية غير موجودة')}</div>;

    const vilScope = pageDataScope(PERMISSION_PAGE_IDS.villages);
    const villageAllowed =
      membershipGroupIds.has(id) ||
      schools.some((s) => membershipGroupIds.has(s.id)) ||
      membershipMirrorGroupIds.has(village.regionId);
    if (
      ready &&
      !membershipLoading &&
      vilScope === DATA_SCOPE_MEMBERSHIP &&
      id &&
      !villageAllowed
    ) {
      return <Navigate to="/villages" replace />;
    }

    const StatBox = ({ label, value, tone }) => (
        <div className="surface-card village-details-statbox">
            <p className="village-details-statbox__label">{label}</p>
            <h3 className={`village-details-statbox__value stat-tone--${tone}`}>{value}</h3>
        </div>
    );

    const isBornRow = (m) => normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN;
    const convertsOnly = newMuslims.filter((m) => !isBornRow(m));
    const bornOnly = newMuslims.filter(isBornRow);
    const menCount = convertsOnly.filter((m) => m.type === t('pages.VillageDetailsPage.رجل', 'رجل')).length;
    const womenCount = convertsOnly.filter((m) => m.type === t('pages.VillageDetailsPage.امرأة', 'امرأة')).length;
    const childrenCount = convertsOnly.filter((m) => m.type === t('pages.VillageDetailsPage.طفل', 'طفل')).length;
    const bornMen = bornOnly.filter((m) => m.type === t('pages.VillageDetailsPage.رجل', 'رجل')).length;
    const bornWomen = bornOnly.filter((m) => m.type === t('pages.VillageDetailsPage.امرأة', 'امرأة')).length;
    const bornChildren = bornOnly.filter((m) => m.type === t('pages.VillageDetailsPage.طفل', 'طفل')).length;

    const syncVillageCounters = async (nextList) => {
      if (!village?.regionId || !id) return;
      const api = FirestoreApi.Api;
      const docRef = api.getVillageDoc(village.regionId, id);
      await api.updateData({
        docRef,
        data: villageMuslimCounterFields(nextList),
      });
    };

    const handleAddNewMuslim = async () => {
      if (!newName.trim() || !id) return;
      if (schools.length > 0 && addMuslimSchoolIds.length === 0) {
        window.alert(t('pages.VillageDetailsPage.اختر_مدرسة_واحدة_على_الأقل_للتسجيل', 'اختر مدرسة واحدة على الأقل للتسجيل.'));
        return;
      }
      try {
        setSaving(true);
        const api = FirestoreApi.Api;
        const docId = api.getNewId('new_muslims');
        const mc = normalizeMuslimCategory(newMuslimCategory);
        const { schoolIds } = await enrollVillagePersonAsStudent(api, {
          personId: docId,
          villageId: id,
          displayName: newName.trim(),
          listingType: newType,
          muslimCategory: mc,
          schoolIds: addMuslimSchoolIds.length > 0 ? addMuslimSchoolIds : null,
        });
        await api.setData({
          docRef: api.getNewMuslimDoc(docId),
          data: {
            villageId: id,
            name: newName.trim(),
            type: newType,
            muslimCategory: mc,
            enrolledSchoolId: schoolIds[0],
            enrolledSchoolIds: schoolIds,
          },
        });
        const next = [
          ...newMuslims,
          {
            id: docId,
            villageId: id,
            name: newName.trim(),
            type: newType,
            muslimCategory: mc,
            enrolledSchoolId: schoolIds[0],
            enrolledSchoolIds: schoolIds,
          },
        ];
        setNewMuslims(next);
        await syncVillageCounters(next);
        setNewName('');
        setNewType(t('pages.VillageDetailsPage.رجل', 'رجل'));
        setNewMuslimCategory(normalizeMuslimCategory());
      } catch (err) {
        console.error(err);
        if (err.code === 'NO_SCHOOL_IN_VILLAGE') {
          window.alert(t('pages.VillageDetailsPage.لا_توجد_مدرسة_في_هذه_القرية_لتسجيل_الطالب_تلقائياً', 'لا توجد مدرسة في هذه القرية لتسجيل الطالب تلقائياً.'));
        }
      } finally {
        setSaving(false);
      }
    };

    const startEdit = (m) => {
      setEditingMuslimId(m.id);
      setEditingName(m.name || '');
      setEditingType(m.type || t('pages.VillageDetailsPage.رجل', 'رجل'));
      setEditingMuslimCategory(normalizeMuslimCategory(m.muslimCategory));
    };

    const cancelEdit = () => {
      setEditingMuslimId(null);
      setEditingName('');
      setEditingType(t('pages.VillageDetailsPage.رجل', 'رجل'));
      setEditingMuslimCategory(normalizeMuslimCategory());
    };

    const handleSaveEdit = async () => {
      if (!editingMuslimId || !editingName.trim()) return;
      try {
        setSaving(true);
        const api = FirestoreApi.Api;
        const prev = newMuslims.find((x) => x.id === editingMuslimId);
        const mc = normalizeMuslimCategory(editingMuslimCategory);
        if (prev && prev.name !== editingName.trim()) {
          await syncStudentDisplayNameAcrossStores(api, editingMuslimId, editingName.trim());
        }
        if (prev && (prev.type !== editingType || normalizeMuslimCategory(prev.muslimCategory) !== mc)) {
          await syncVillageListingPersonStudentFields(api, editingMuslimId, {
            listingType: editingType,
            muslimCategory: mc,
          });
        }
        await api.updateData({
          docRef: api.getNewMuslimDoc(editingMuslimId),
          data: { name: editingName.trim(), type: editingType, muslimCategory: mc },
        });
        const next = newMuslims.map((m) =>
          m.id === editingMuslimId ? { ...m, name: editingName.trim(), type: editingType, muslimCategory: mc } : m
        );
        setNewMuslims(next);
        await syncVillageCounters(next);
        cancelEdit();
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteNewMuslim = async (m) => {
      try {
        setSaving(true);
        const api = FirestoreApi.Api;
        await deleteVillageListedPersonFully(api, m.id);
        const next = newMuslims.filter((x) => x.id !== m.id);
        setNewMuslims(next);
        await syncVillageCounters(next);
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

    const handleSaveDefaultSchool = async () => {
      if (!defaultSchoolId || !village?.regionId || !id) return;
      try {
        setSavingDefaultSchool(true);
        const api = FirestoreApi.Api;
        await api.updateData({
          docRef: api.getVillageDoc(village.regionId, id),
          data: { defaultSchoolId },
        });
        setVillage((prev) => ({ ...(prev || {}), defaultSchoolId }));
      } catch (err) {
        console.error(err);
      } finally {
        setSavingDefaultSchool(false);
      }
    };

    return (
        <div className="village-details-page portal-page">
            <PageHeader
              topRow={
                <div className="village-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/villages')}>
                    <ChevronRight size={20} aria-hidden /> {t('pages.VillagesPage.إدارة_القرى', 'إدارة القرى')}
                  </button>
                  <ChevronRight size={16} className="page-nav-separator" aria-hidden />
                </div>
              }
              title={<>{t('pages.VillageDetailsPage.إحصائيات_قرية', 'إحصائيات قرية:')} <span className="page-header-accent">{village.villageName}</span></>}
            />

            <div className="village-details-layout">
                <div className="village-details-main-col">
                    {/* Demographics Card */}
                    <div className="surface-card surface-card--lg village-details-card">
                        <div className="village-details-card__head">
                            <PieChart size={24} color="var(--accent-color)" />
                            <h2 className="village-details-card__title">{t('pages.VillageDetailsPage.الإحصائيات_السكانية_والديموغرافية', 'الإحصائيات السكانية والديموغرافية')}</h2>
                        </div>
                        <div className="village-details-card__stats">
                            <StatBox label={t('pages.VillageDetailsPage.إجمالي_السكان', 'إجمالي السكان')} value={village.populationCount} tone="text" />
                            <StatBox label={t('pages.VillageDetailsPage.المسلمون', 'المسلمون')} value={village.muslimsCount} tone="success" />
                            <StatBox label={t('pages.VillageDetailsPage.غير_المسلمين', 'غير المسلمين')} value={village.nonMuslimsCount} tone="danger" />
                        </div>
                        
                        <div className="village-details-new-muslims">
                            <h3 className="village-details-new-muslims__title">{t('pages.VillageDetailsPage.المهتدون_والمسلمون_القدامى_يُسجَّلون_كطلاب', 'المهتدون والمسلمون القدامى (يُسجَّلون كطلاب)')}</h3>
                            <div className="village-details-new-muslims__summary">
                                <div><strong><User size={14} /> {t('pages.VillageDetailsPage.مهتدون_رجال', 'مهتدون — رجال:')}</strong> {menCount}</div>
                                <div><strong><Users size={14} /> {t('pages.VillageDetailsPage.مهتدون_نساء', 'مهتدون — نساء:')}</strong> {womenCount}</div>
                                <div><strong><Baby size={14} /> {t('pages.VillageDetailsPage.مهتدون_أطفال', 'مهتدون — أطفال:')}</strong> {childrenCount}</div>
                                <div className="village-details-new-muslims__summary-born"><strong>{t('pages.VillageDetailsPage.مسلمون_قدامى_رجال', 'مسلمون قدامى — رجال:')}</strong> {bornMen}</div>
                                <div><strong>{t('pages.VillageDetailsPage.مسلمون_قدامى_نساء', 'مسلمون قدامى — نساء:')}</strong> {bornWomen}</div>
                                <div><strong>{t('pages.VillageDetailsPage.مسلمون_قدامى_أطفال', 'مسلمون قدامى — أطفال:')}</strong> {bornChildren}</div>
                            </div>
                            <div className="village-details-new-muslims__body">
                              {schools.length > 0 && (
                                <div className="village-details-new-muslims__schools">
                                  <span className="village-details-new-muslims__schools-label">{t('pages.VillageDetailsPage.المدارس_قائمة_الطلاب_المسجلين', 'المدارس (قائمة الطلاب المسجلين):')}</span>
                                  <VillageSchoolCheckboxGroup
                                    schools={schools}
                                    selectedIds={addMuslimSchoolIds}
                                    onToggle={toggleAddMuslimSchool}
                                    disabled={saving}
                                  />
                                </div>
                              )}
                              <div className="village-details-new-muslims__entry">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  placeholder={t('pages.VillageDetailsPage.الاسم', 'الاسم')}
                                  className="app-input"
                                />
                                <AppSelect searchable
                                  value={newType}
                                  onChange={(e) => setNewType(e.target.value)}
                                  className=""
                                >
                                  <option value={t('pages.VillageDetailsPage.رجل', 'رجل')}>{t('pages.VillageDetailsPage.رجل', 'رجل')}</option>
                                  <option value={t('pages.VillageDetailsPage.امرأة', 'امرأة')}>{t('pages.VillageDetailsPage.امرأة', 'امرأة')}</option>
                                  <option value={t('pages.VillageDetailsPage.طفل', 'طفل')}>{t('pages.VillageDetailsPage.طفل', 'طفل')}</option>
                                </AppSelect>
                                <AppSelect searchable
                                  value={newMuslimCategory}
                                  onChange={(e) => setNewMuslimCategory(normalizeMuslimCategory(e.target.value))}
                                  className=""
                                >
                                  <option value="convert">{t('pages.VillagesPage.مهتد', 'مهتد')}</option>
                                  <option value="born">{t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم')}</option>
                                </AppSelect>
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') && (
                                  <BusyButton type="button" className="icon-btn" onClick={handleAddNewMuslim} busy={saving} title={t('components.ReportTextList.إضافة', 'إضافة')}>
                                    <Plus size={16} />
                                  </BusyButton>
                                )}
                              </div>
                              {newMuslims.length === 0 ? (
                                <p className="village-details-new-muslims__empty">{t('pages.VillageDetailsPage.لا_توجد_سجلات_بعد', 'لا توجد سجلات بعد.')}</p>
                              ) : (
                                <div className="village-details-new-muslims__list">
                                  {newMuslims.map((m) => (
                                    <div key={m.id} className="village-details-new-muslims__item">
                                      {editingMuslimId === m.id ? (
                                        <>
                                          <div className="village-details-new-muslims__item-edit">
                                            <input
                                              type="text"
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              className="app-input"
                                            />
                                            <AppSelect searchable
                                              value={editingType}
                                              onChange={(e) => setEditingType(e.target.value)}
                                              className=""
                                            >
                                              <option value={t('pages.VillageDetailsPage.رجل', 'رجل')}>{t('pages.VillageDetailsPage.رجل', 'رجل')}</option>
                                              <option value={t('pages.VillageDetailsPage.امرأة', 'امرأة')}>{t('pages.VillageDetailsPage.امرأة', 'امرأة')}</option>
                                              <option value={t('pages.VillageDetailsPage.طفل', 'طفل')}>{t('pages.VillageDetailsPage.طفل', 'طفل')}</option>
                                            </AppSelect>
                                            <AppSelect searchable
                                              value={editingMuslimCategory}
                                              onChange={(e) => setEditingMuslimCategory(normalizeMuslimCategory(e.target.value))}
                                              className=""
                                            >
                                              <option value="convert">{t('pages.VillagesPage.مهتد', 'مهتد')}</option>
                                              <option value="born">{t('pages.VillagesPage.مسلم_قديم', 'مسلم قديم')}</option>
                                            </AppSelect>
                                          </div>
                                          <div className="village-details-new-muslims__item-actions">
                                            {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') && (
                                              <BusyButton type="button" className="icon-btn" onClick={handleSaveEdit} busy={saving} title={t('components.MessengerPanel.حفظ', 'حفظ')}>
                                                <Save size={14} />
                                              </BusyButton>
                                            )}
                                            <button type="button" className="icon-btn" onClick={cancelEdit} title={t('components.ConfirmDialog.إلغاء', 'إلغاء')}><X size={14} /></button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                            <span className="village-details-new-muslims__item-name">{m.name}</span>
                                          <div className="village-details-new-muslims__item-actions">
                                            <span className="village-details-new-muslims__item-type">
                                              {m.type}
                                              {isBornRow(m) ? t('pages.VillageDetailsPage.مسلم_قديم', ' · مسلم قديم') : t('pages.VillageDetailsPage.مهتد', ' · مهتد')}
                                              {(m.enrolledSchoolIds?.length || 0) > 0 && (
                                                <span className="village-details-new-muslims__item-meta"> · {(m.enrolledSchoolIds?.length || 0)} مدرسة</span>
                                              )}
                                            </span>
                                            {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') && (
                                              <button type="button" className="icon-btn" onClick={() => startEdit(m)} title={t('components.ExplorationListCard.تعديل', 'تعديل')}><Edit2 size={14} /></button>
                                            )}
                                            {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_delete') && (
                                              <button type="button" className="icon-btn" onClick={() => setPendingDelete(m)} title={t('components.ExplorationListCard.حذف', 'حذف')}><Trash2 size={14} color="var(--danger-color)" /></button>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                        </div>
                    </div>

                    {/* Schools Card */}
                    <div className="surface-card surface-card--lg village-details-card">
                        <div className="village-details-card__head">
                            <School size={24} color="var(--accent-color)" />
                            <h2 className="village-details-card__title">{t('pages.VillageDetailsPage.المدارس_والمراكز_التعليمية_في_القرية', 'المدارس والمراكز التعليمية في القرية')}</h2>
                        </div>
                        {!!(schools.find((s) => s.id === defaultSchoolId)?.name || schools[0]?.name) && (
                          <div
                            className="villages-card__default-badge"
                            title={`المدرسة الافتراضية: ${schools.find((s) => s.id === defaultSchoolId)?.name || schools[0]?.name}`}
                          >
                            <FileText size={12} aria-hidden />
                            <span>
                              الافتراضية: {schools.find((s) => s.id === defaultSchoolId)?.name || schools[0]?.name}
                            </span>
                          </div>
                        )}
                        <VillageDefaultSchoolPanel
                          schools={schools}
                          defaultSchoolId={defaultSchoolId}
                          title={t('pages.VillageDetailsPage.المدرسة_الافتراضية_للتقارير', 'المدرسة الافتراضية للتقارير')}
                          hint={t('pages.VillageDetailsPage.الافتراضي_التلقائي_أول_مدرسة_تظهر_أولاً،_ويمكن_تعديله_', 'الافتراضي التلقائي: أول مدرسة تظهر أولاً، ويمكن تعديله وحفظه.')}
                          emptyText={t('pages.VillageDetailsPage.لا_توجد_مدارس_في_القرية_حالياً', 'لا توجد مدارس في القرية حالياً.')}
                          onDefaultSchoolChange={(e) => setDefaultSchoolId(e.target.value)}
                          onSaveDefault={handleSaveDefaultSchool}
                          onAddReport={() => navigate(`/schools/${defaultSchoolId}?composeReport=1`)}
                          saving={savingDefaultSchool}
                          canSetDefault={can(PERMISSION_PAGE_IDS.villages, 'village_default_school_set')}
                          canAddReport={can(PERMISSION_PAGE_IDS.villages, 'village_report_quick_add')}
                        />
                        {schools.length === 0 ? <p className="village-details-card__empty">{t('pages.VillageDetailsPage.لا_توجد_مدارس_مسجلة_في_هذه_القرية_حالياً', 'لا توجد مدارس مسجلة في هذه القرية حالياً.')}</p> : (
                            <div className="village-details-schools-list">
                                {schools.map(sch => (
                                    can(PERMISSION_PAGE_IDS.villages, 'village_school_view') ? (
                                      <button
                                        key={sch.id}
                                        type="button"
                                        className="village-details-schools-item"
                                        onClick={() => navigate(`/schools/${sch.id}`)}
                                      >
                                        <div>
                                          <h4 className="village-details-schools-item__name">{sch.name}</h4>
                                          <p className="village-details-schools-item__id"><Hash size={14} /> {sch.id}</p>
                                        </div>
                                        <ChevronRight size={18} className="geo-details-item__chevron" aria-hidden />
                                      </button>
                                    ) : (
                                      <div key={sch.id} className="village-details-schools-item">
                                        <div>
                                          <h4 className="village-details-schools-item__name">{sch.name}</h4>
                                          <p className="village-details-schools-item__id"><Hash size={14} /> {sch.id}</p>
                                        </div>
                                      </div>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="village-details-side-col">
                    <div className="surface-card surface-card--lg village-details-side-card">
                        <h3 className="village-details-side-card__title"><MapPin size={18} color="var(--accent-color)"/> {t('pages.VillageDetailsPage.التصنيف_الميداني', 'التصنيف الميداني')}</h3>
                        <div className="village-details-side-card__rows">
                            <div className="village-details-side-card__row">
                                <span className="village-details-side-card__label">{t('pages.VillageDetailsPage.اسم_المجموعة', 'اسم المجموعة:')}</span><br/>
                                <strong>{village.groupName || t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد')}</strong>
                            </div>
                            <div className="village-details-side-card__row">
                                <span className="village-details-side-card__label">{t('pages.VillageDetailsPage.تصنيف_LTI', 'تصنيف LTI:')}</span><br/>
                                <strong>{village.ltiName || t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد')}</strong>
                            </div>
                            <div className="village-details-side-card__row">
                                <span className="village-details-side-card__label">{t('pages.VillageDetailsPage.معرف_المنطقة', 'معرف المنطقة:')}</span><br/>
                                <strong>{village.regionId}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
              open={!!pendingDelete}
              title={t('pages.VillageDetailsPage.تأكيد_حذف_السجل', 'تأكيد حذف السجل')}
              message={`سيتم حذف «${pendingDelete?.name || ''}» من السجل وإزالة حساب الطالب وارتباطاته.`}
              confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
              danger
              onCancel={() => setPendingDelete(null)}
              onConfirm={async () => {
                const item = pendingDelete;
                setPendingDelete(null);
                if (item) await handleDeleteNewMuslim(item);
              }}
            />
        </div>
    );
};

export default VillageDetailsPage;
