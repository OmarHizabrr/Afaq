import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { School, ChevronRight, Info, PieChart, MapPin, Edit2, Trash2, Plus, Save, X, User, Users, Baby, Hash } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppSelect from '../../components/AppSelect';
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

const VillageDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [village, setVillage] = useState(null);
    const [schools, setSchools] = useState([]);
    const [newMuslims, setNewMuslims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('رجل');
    const [newMuslimCategory, setNewMuslimCategory] = useState(normalizeMuslimCategory());
    const [addMuslimSchoolIds, setAddMuslimSchoolIds] = useState([]);
    const [editingMuslimId, setEditingMuslimId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingType, setEditingType] = useState('رجل');
    const [editingMuslimCategory, setEditingMuslimCategory] = useState(normalizeMuslimCategory());
    const [pendingDelete, setPendingDelete] = useState(null);
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();

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

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!village) return <div className="empty-state">القرية غير موجودة</div>;

    const vilScope = pageDataScope(PERMISSION_PAGE_IDS.villages);
    const villageAllowed =
      membershipGroupIds.has(village.regionId) || schools.some((s) => membershipGroupIds.has(s.id));
    if (
      ready &&
      !membershipLoading &&
      vilScope === DATA_SCOPE_MEMBERSHIP &&
      id &&
      !villageAllowed
    ) {
      return <Navigate to="/villages" replace />;
    }

    const StatBox = ({ label, value, color }) => (
        <div className="surface-card village-details-statbox">
            <p className="village-details-statbox__label">{label}</p>
            <h3 className="village-details-statbox__value" style={{ color }}>{value}</h3>
        </div>
    );

    const isBornRow = (m) => normalizeMuslimCategory(m.muslimCategory) === MUSLIM_CATEGORY_BORN;
    const convertsOnly = newMuslims.filter((m) => !isBornRow(m));
    const bornOnly = newMuslims.filter(isBornRow);
    const menCount = convertsOnly.filter((m) => m.type === 'رجل').length;
    const womenCount = convertsOnly.filter((m) => m.type === 'امرأة').length;
    const childrenCount = convertsOnly.filter((m) => m.type === 'طفل').length;
    const bornMen = bornOnly.filter((m) => m.type === 'رجل').length;
    const bornWomen = bornOnly.filter((m) => m.type === 'امرأة').length;
    const bornChildren = bornOnly.filter((m) => m.type === 'طفل').length;

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
        window.alert('اختر مدرسة واحدة على الأقل للتسجيل.');
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
        setNewType('رجل');
        setNewMuslimCategory(normalizeMuslimCategory());
      } catch (err) {
        console.error(err);
        if (err.code === 'NO_SCHOOL_IN_VILLAGE') {
          window.alert('لا توجد مدرسة في هذه القرية لتسجيل الطالب تلقائياً.');
        }
      } finally {
        setSaving(false);
      }
    };

    const startEdit = (m) => {
      setEditingMuslimId(m.id);
      setEditingName(m.name || '');
      setEditingType(m.type || 'رجل');
      setEditingMuslimCategory(normalizeMuslimCategory(m.muslimCategory));
    };

    const cancelEdit = () => {
      setEditingMuslimId(null);
      setEditingName('');
      setEditingType('رجل');
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

    return (
        <div className="village-details-page">
            <PageHeader
              topRow={
                <div className="village-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/villages')}>
                    <ChevronRight size={20} aria-hidden /> إدارة القرى
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>إحصائيات قرية: <span style={{ color: 'var(--md-primary)' }}>{village.villageName}</span></>}
            />

            <div className="village-details-layout">
                <div className="village-details-main-col">
                    {/* Demographics Card */}
                    <div className="surface-card surface-card--lg village-details-card">
                        <div className="village-details-card__head">
                            <PieChart size={24} color="var(--accent-color)" />
                            <h2 className="village-details-card__title">الإحصائيات السكانية والديموغرافية</h2>
                        </div>
                        <div className="village-details-card__stats">
                            <StatBox label="إجمالي السكان" value={village.populationCount} color="var(--text-primary)" />
                            <StatBox label="المسلمون" value={village.muslimsCount} color="var(--success-color)" />
                            <StatBox label="غير المسلمين" value={village.nonMuslimsCount} color="var(--danger-color)" />
                        </div>
                        
                        <div className="village-details-new-muslims">
                            <h3 className="village-details-new-muslims__title">المهتدون والمسلمون القدامى (يُسجَّلون كطلاب)</h3>
                            <div className="village-details-new-muslims__summary">
                                <div><strong><User size={14} /> مهتدون — رجال:</strong> {menCount}</div>
                                <div><strong><Users size={14} /> مهتدون — نساء:</strong> {womenCount}</div>
                                <div><strong><Baby size={14} /> مهتدون — أطفال:</strong> {childrenCount}</div>
                                <div style={{ marginTop: 8, opacity: 0.9 }}><strong>مسلمون قدامى — رجال:</strong> {bornMen}</div>
                                <div><strong>مسلمون قدامى — نساء:</strong> {bornWomen}</div>
                                <div><strong>مسلمون قدامى — أطفال:</strong> {bornChildren}</div>
                            </div>
                            <div className="village-details-new-muslims__body">
                              {schools.length > 0 && (
                                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                                  <span style={{ width: '100%', fontSize: '0.9rem', fontWeight: 600 }}>المدارس (قائمة الطلاب المسجلين):</span>
                                  {schools.map((sch) => (
                                    <label key={sch.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                                      <input
                                        type="checkbox"
                                        checked={addMuslimSchoolIds.includes(sch.id)}
                                        onChange={() => toggleAddMuslimSchool(sch.id)}
                                        disabled={saving}
                                      />
                                      <span>{sch.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className="village-details-new-muslims__entry">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  placeholder="الاسم"
                                  className="app-input"
                                />
                                <AppSelect
                                  value={newType}
                                  onChange={(e) => setNewType(e.target.value)}
                                  className=""
                                >
                                  <option value="رجل">رجل</option>
                                  <option value="امرأة">امرأة</option>
                                  <option value="طفل">طفل</option>
                                </AppSelect>
                                <AppSelect
                                  value={newMuslimCategory}
                                  onChange={(e) => setNewMuslimCategory(normalizeMuslimCategory(e.target.value))}
                                  className=""
                                >
                                  <option value="convert">مهتد</option>
                                  <option value="born">مسلم قديم</option>
                                </AppSelect>
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') && (
                                  <button type="button" className="icon-btn" onClick={handleAddNewMuslim} disabled={saving} title="إضافة">
                                    <Plus size={16} />
                                  </button>
                                )}
                              </div>
                              {newMuslims.length === 0 ? (
                                <p className="village-details-new-muslims__empty">لا توجد سجلات بعد.</p>
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
                                            <AppSelect
                                              value={editingType}
                                              onChange={(e) => setEditingType(e.target.value)}
                                              className=""
                                            >
                                              <option value="رجل">رجل</option>
                                              <option value="امرأة">امرأة</option>
                                              <option value="طفل">طفل</option>
                                            </AppSelect>
                                            <AppSelect
                                              value={editingMuslimCategory}
                                              onChange={(e) => setEditingMuslimCategory(normalizeMuslimCategory(e.target.value))}
                                              className=""
                                            >
                                              <option value="convert">مهتد</option>
                                              <option value="born">مسلم قديم</option>
                                            </AppSelect>
                                          </div>
                                          <div className="village-details-new-muslims__item-actions">
                                            {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') && (
                                              <button type="button" className="icon-btn" onClick={handleSaveEdit} disabled={saving} title="حفظ"><Save size={14} /></button>
                                            )}
                                            <button type="button" className="icon-btn" onClick={cancelEdit} title="إلغاء"><X size={14} /></button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{m.name}</span>
                                          <div className="village-details-new-muslims__item-actions">
                                            <span className="village-details-new-muslims__item-type">
                                              {m.type}
                                              {isBornRow(m) ? ' · مسلم قديم' : ' · مهتد'}
                                              {(m.enrolledSchoolIds?.length || 0) > 0 && (
                                                <span style={{ opacity: 0.85 }}> · {(m.enrolledSchoolIds?.length || 0)} مدرسة</span>
                                              )}
                                            </span>
                                            {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_edit') && (
                                              <button type="button" className="icon-btn" onClick={() => startEdit(m)} title="تعديل"><Edit2 size={14} /></button>
                                            )}
                                            {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_delete') && (
                                              <button type="button" className="icon-btn" onClick={() => setPendingDelete(m)} title="حذف"><Trash2 size={14} color="var(--danger-color)" /></button>
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
                            <h2 className="village-details-card__title">المدارس والمراكز التعليمية في القرية</h2>
                        </div>
                        {schools.length === 0 ? <p className="village-details-card__empty">لا توجد مدارس مسجلة في هذه القرية حالياً.</p> : (
                            <div className="village-details-schools-list">
                                {schools.map(sch => (
                                    <div key={sch.id} className="village-details-schools-item">
                                        <div>
                                            <h4 className="village-details-schools-item__name">{sch.name}</h4>
                                            <p className="village-details-schools-item__id"><Hash size={14} /> {sch.id}</p>
                                        </div>
                                        {can(PERMISSION_PAGE_IDS.villages, 'village_school_view') && (
                                          <button onClick={() => navigate(`/schools/${sch.id}`)} className="icon-btn"><Info size={18}/></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="village-details-side-col">
                    <div className="surface-card surface-card--lg village-details-side-card">
                        <h3 className="village-details-side-card__title"><MapPin size={18} color="var(--accent-color)"/> التصنيف الميداني</h3>
                        <div className="village-details-side-card__rows">
                            <div className="village-details-side-card__row">
                                <span className="village-details-side-card__label">اسم المجموعة:</span><br/>
                                <strong>{village.groupName || 'غير محدد'}</strong>
                            </div>
                            <div className="village-details-side-card__row">
                                <span className="village-details-side-card__label">تصنيف LTI:</span><br/>
                                <strong>{village.ltiName || 'غير محدد'}</strong>
                            </div>
                            <div className="village-details-side-card__row">
                                <span className="village-details-side-card__label">معرف المنطقة:</span><br/>
                                <strong>{village.regionId}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
              open={!!pendingDelete}
              title="تأكيد حذف السجل"
              message={`سيتم حذف «${pendingDelete?.name || ''}» من السجل وإزالة حساب الطالب وارتباطاته.`}
              confirmLabel="حذف نهائي"
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
