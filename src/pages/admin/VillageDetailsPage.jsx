import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { School, ChevronRight, Info, PieChart, MapPin, Edit2, Trash2, Plus, Save, X } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

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
    const [editingMuslimId, setEditingMuslimId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingType, setEditingType] = useState('رجل');
    const [pendingDelete, setPendingDelete] = useState(null);
    const { can } = usePermissions();

    useEffect(() => {
        const fetchVillageDetails = async () => {
            if (!id) return;
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
                  .map((doc) => ({ id: doc.id, ...doc.data() }))
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

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!village) return <div className="empty-state">القرية غير موجودة</div>;

    const StatBox = ({ label, value, color }) => (
        <div className="surface-card village-details-statbox">
            <p className="village-details-statbox__label">{label}</p>
            <h3 className="village-details-statbox__value" style={{ color }}>{value}</h3>
        </div>
    );

    const menCount = newMuslims.filter((m) => m.type === 'رجل').length;
    const womenCount = newMuslims.filter((m) => m.type === 'امرأة').length;
    const childrenCount = newMuslims.filter((m) => m.type === 'طفل').length;

    const syncVillageCounters = async (nextList) => {
      if (!village?.regionId || !id) return;
      const api = FirestoreApi.Api;
      const docRef = api.getVillageDoc(village.regionId, id);
      await api.updateData({
        docRef,
        data: {
          newMuslimsMen: nextList.filter((m) => m.type === 'رجل').length,
          newMuslimsWomen: nextList.filter((m) => m.type === 'امرأة').length,
          newMuslimsChildren: nextList.filter((m) => m.type === 'طفل').length,
        },
      });
    };

    const handleAddNewMuslim = async () => {
      if (!newName.trim() || !id) return;
      try {
        setSaving(true);
        const api = FirestoreApi.Api;
        const docId = api.getNewId('new_muslims');
        await api.setData({
          docRef: api.getNewMuslimDoc(docId),
          data: { villageId: id, name: newName.trim(), type: newType },
        });
        const next = [...newMuslims, { id: docId, villageId: id, name: newName.trim(), type: newType }];
        setNewMuslims(next);
        await syncVillageCounters(next);
        setNewName('');
        setNewType('رجل');
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

    const startEdit = (m) => {
      setEditingMuslimId(m.id);
      setEditingName(m.name || '');
      setEditingType(m.type || 'رجل');
    };

    const cancelEdit = () => {
      setEditingMuslimId(null);
      setEditingName('');
      setEditingType('رجل');
    };

    const handleSaveEdit = async () => {
      if (!editingMuslimId || !editingName.trim()) return;
      try {
        setSaving(true);
        const api = FirestoreApi.Api;
        await api.updateData({
          docRef: api.getNewMuslimDoc(editingMuslimId),
          data: { name: editingName.trim(), type: editingType },
        });
        const next = newMuslims.map((m) =>
          m.id === editingMuslimId ? { ...m, name: editingName.trim(), type: editingType } : m
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
        await api.deleteData(api.getNewMuslimDoc(m.id));
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
                            <h3 className="village-details-new-muslims__title">المهتدون الجدد (New Muslims)</h3>
                            <div className="village-details-new-muslims__summary">
                                <div><strong>👨 رجال:</strong> {menCount}</div>
                                <div><strong>👩 نساء:</strong> {womenCount}</div>
                                <div><strong>👧 أطفال:</strong> {childrenCount}</div>
                            </div>
                            <div className="village-details-new-muslims__body">
                              <div className="village-details-new-muslims__entry">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  placeholder="اسم المهتدي الجديد"
                                  className="app-input"
                                />
                                <select
                                  value={newType}
                                  onChange={(e) => setNewType(e.target.value)}
                                  className="app-select"
                                >
                                  <option value="رجل">رجل</option>
                                  <option value="امرأة">امرأة</option>
                                  <option value="طفل">طفل</option>
                                </select>
                                {can(PERMISSION_PAGE_IDS.villages, 'village_new_muslim_add') && (
                                  <button type="button" className="icon-btn" onClick={handleAddNewMuslim} disabled={saving} title="إضافة">
                                    <Plus size={16} />
                                  </button>
                                )}
                              </div>
                              {newMuslims.length === 0 ? (
                                <p className="village-details-new-muslims__empty">لا توجد سجلات مهتدين مضافة بعد.</p>
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
                                            <select
                                              value={editingType}
                                              onChange={(e) => setEditingType(e.target.value)}
                                              className="app-select"
                                            >
                                              <option value="رجل">رجل</option>
                                              <option value="امرأة">امرأة</option>
                                              <option value="طفل">طفل</option>
                                            </select>
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
                                            <span className="village-details-new-muslims__item-type">{m.type}</span>
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
                                            <p className="village-details-schools-item__id">🆔 {sch.id}</p>
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
              message={`سيتم حذف السجل "${pendingDelete?.name || ''}" من قائمة المهتدين الجدد.`}
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
