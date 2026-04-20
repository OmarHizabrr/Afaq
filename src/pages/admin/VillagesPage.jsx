import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Home, UserPlus, X, Eye, Save, ChevronDown, ChevronUp } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';

const VillagesPage = () => {
  const navigate = useNavigate();
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
  const [nmEditingId, setNmEditingId] = useState(null);
  const [nmEditingName, setNmEditingName] = useState('');
  const [nmEditingType, setNmEditingType] = useState('رجل');
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

  const normalizeNewMuslims = (items) =>
    items
      .map((m) => ({ id: m.id, name: (m.name || '').trim(), type: m.type || 'رجل' }))
      .filter((m) => m.name.length > 0);

  const calculateNewMuslimsCounts = (items) => ({
    newMuslimsMen: items.filter((m) => m.type === 'رجل').length,
    newMuslimsWomen: items.filter((m) => m.type === 'امرأة').length,
    newMuslimsChildren: items.filter((m) => m.type === 'طفل').length,
  });

  const syncVillageNewMuslims = async (api, villageId, nextItems, currentItems) => {
    const currentById = new Map(currentItems.filter((m) => m.id).map((m) => [m.id, m]));
    const nextWithIds = nextItems.filter((m) => m.id);
    const nextIds = new Set(nextWithIds.map((m) => m.id));

    const toDelete = currentItems.filter((m) => m.id && !nextIds.has(m.id));
    const deletions = toDelete.map((m) => api.deleteData(api.getNewMuslimDoc(m.id)));

    const upserts = nextItems.map((m) => {
      const docId = m.id || api.getNewId('new_muslims');
      const old = currentById.get(docId);
      if (old && old.name === m.name && old.type === m.type) return null;
      return api.setData({
        docRef: api.getNewMuslimDoc(docId),
        data: { villageId, name: m.name, type: m.type },
      });
    }).filter(Boolean);

    await Promise.all([...deletions, ...upserts]);
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
    setNewMuslims(prev => [...prev, { name: muslimName.trim(), type: muslimType }]);
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
      const counters = calculateNewMuslimsCounts(normalizedNewMuslims);

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
      setError('حدث خطأ أثناء الحفظ');
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
    setNewMuslims((newMuslimsDocsByVillage[vil.id] || []).map((m) => ({ ...m })));
  };

  const handleDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      const villageDoc = villages.find(v => v.id === id);
      if (!villageDoc) return;

      const linkedNewMuslims = newMuslimsDocsByVillage[id] || [];
      if (linkedNewMuslims.length > 0) {
        await Promise.all(
          linkedNewMuslims.map((m) => api.deleteData(api.getNewMuslimDoc(m.id)))
        );
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
      data: {
        newMuslimsMen: items.filter((m) => m.type === 'رجل').length,
        newMuslimsWomen: items.filter((m) => m.type === 'امرأة').length,
        newMuslimsChildren: items.filter((m) => m.type === 'طفل').length,
      },
    });
  };

  const patchVillageNewMuslims = (villageId, nextItems) => {
    setNewMuslimsDocsByVillage((prev) => ({ ...prev, [villageId]: nextItems }));
  };

  const cancelNmQuickEdit = () => {
    setNmEditingId(null);
    setNmEditingName('');
    setNmEditingType('رجل');
  };

  const toggleQuickNewMuslims = (vilId) => {
    setNmQuickVillageId((v) => (v === vilId ? null : vilId));
    setNmDraftName('');
    setNmDraftType('رجل');
    cancelNmQuickEdit();
  };

  const startNmQuickEdit = (m) => {
    setNmEditingId(m.id);
    setNmEditingName(m.name || '');
    setNmEditingType(m.type || 'رجل');
  };

  const handleQuickAddNewMuslim = async (vil) => {
    if (!nmDraftName.trim() || nmQuickVillageId !== vil.id) return;
    setNmSaving(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const docId = api.getNewId('new_muslims');
      await api.setData({
        docRef: api.getNewMuslimDoc(docId),
        data: { villageId: vil.id, name: nmDraftName.trim(), type: nmDraftType },
      });
      const list = [
        ...(newMuslimsDocsByVillage[vil.id] || []),
        { id: docId, villageId: vil.id, name: nmDraftName.trim(), type: nmDraftType },
      ];
      patchVillageNewMuslims(vil.id, list);
      await syncVillageNewMuslimCounters(vil.regionId, vil.id, list);
      setNmDraftName('');
      setNmDraftType('رجل');
      setSuccess('تمت إضافة المهتدي.');
    } catch (err) {
      console.error(err);
      setError('تعذر إضافة السجل.');
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
      await api.updateData({
        docRef: api.getNewMuslimDoc(nmEditingId),
        data: { name: nmEditingName.trim(), type: nmEditingType },
      });
      const list = (newMuslimsDocsByVillage[vil.id] || []).map((m) =>
        m.id === nmEditingId ? { ...m, name: nmEditingName.trim(), type: nmEditingType } : m
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
      await api.deleteData(api.getNewMuslimDoc(m.id));
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
            setNmQuickVillageId(null);
            cancelNmQuickEdit();
          }}
        >
          <Plus size={18} />
          <span>إضافة قرية جديدة</span>
        </button>
      </PageHeader>

      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="app-alert app-alert--success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Complex Add/Edit Modal */}
      <FormModal
        open={isAdding}
        title={null}
        size="lg"
        onClose={() => setIsAdding(false)}
      >
          <form onSubmit={handleAdd} style={{ maxWidth: '960px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--accent-color)' }}>البيانات الأساسية</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المنطقة التابعة لها</label>
              <select value={selectedRegId} onChange={(e) => setSelectedRegId(e.target.value)} className="app-select" required>
                <option value="">-- اختر المنطقة --</option>
                {regions.map(reg => (
                  <option key={reg.id} value={reg.id}>{reg.name} ({getRegionName(reg.id)})</option> // Simplified
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم القرية</label>
              <input name="villageName" type="text" value={formData.villageName} onChange={handleInputChange} className="app-input" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم الجروب</label>
              <input name="groupName" type="text" value={formData.groupName} onChange={handleInputChange} className="app-input" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم الـ LTI</label>
              <input name="ltiName" type="text" value={formData.ltiName} onChange={handleInputChange} className="app-input" />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--accent-color)' }}>الإحصائيات السكانية</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>إجمالي السكان</label>
              <input name="populationCount" type="number" min="0" value={formData.populationCount} onChange={handleInputChange} className="app-input" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>عدد المسلمين</label>
              <input name="muslimsCount" type="number" min="0" value={formData.muslimsCount} onChange={handleInputChange} className="app-input" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>عدد غير المسلمين</label>
              <input name="nonMuslimsCount" type="number" min="0" value={formData.nonMuslimsCount} onChange={handleInputChange} className="app-input" />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-color)' }}>سجل المهتدين الجدد (يضاف للمجموعة المنفصلة)</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
              الإجمالي: {newMuslims.length}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم المهتدي</label>
              <input type="text" value={muslimName} onChange={(e) => setMuslimName(e.target.value)} className="app-input" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewMuslimToList())} />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الفئة</label>
              <select value={muslimType} onChange={(e) => setMuslimType(e.target.value)} className="app-select">
                <option value="رجل">رجل</option>
                <option value="امرأة">امرأة</option>
                <option value="طفل">طفل</option>
              </select>
            </div>
            <button type="button" onClick={addNewMuslimToList} className="google-btn google-btn--toolbar" style={{ marginTop: 0, width: 'auto' }}>
              <UserPlus size={16} /> إضافة
            </button>
          </div>

          {newMuslims.length > 0 && (
            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
              {newMuslims.map((m, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: index !== newMuslims.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <span style={{ fontSize: '0.9rem' }}>{m.name} - <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{m.type}</span></span>
                  <X size={16} color="var(--danger-color)" style={{ cursor: 'pointer' }} onClick={() => removeMuslimFromList(index)} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="button" onClick={() => setIsAdding(false)} className="google-btn" style={{ width: 'auto', marginTop: 0 }}>
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="google-btn google-btn--filled" style={{ marginTop: 0, width: 'auto', padding: '12px 32px' }}>
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
          {villages.map(vil => (
            <div key={vil.id} className="surface-card surface-card--village">
              <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', display: 'flex', gap: '8px' }}>
                <button className="icon-btn" onClick={() => navigate(`/villages/${vil.id}`)} title="عرض التفاصيل الكاملة">
                  <Eye size={16} color="var(--accent-color)" />
                </button>
                <button className="icon-btn" onClick={() => handleEditClick(vil)} title="تعديل القرية">
                  <Edit2 size={16} />
                </button>
                <button className="icon-btn" onClick={() => setPendingDelete({ id: vil.id, name: vil.villageName })} title="حذف القرية">
                  <Trash2 size={16} color="var(--danger-color)" />
                </button>
              </div>
              
              <h3 style={{ margin: 0, fontSize: '1.2rem', marginBottom: '8px', color: 'var(--accent-color)' }}>{vil.villageName}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                المنطقة: {getRegionName(vil.regionId)}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', background: 'var(--bg-color)', padding: '10px', borderRadius: '8px' }}>
                <div>👥 السكان: {vil.populationCount}</div>
                <div>مسلمين: {vil.muslimsCount}</div>
                <div style={{ color: 'var(--danger-color)' }}>غير المسلمين: {vil.nonMuslimsCount}</div>
                <div style={{ color: 'var(--success-color)' }}>مهتدين (رجال): {(newMuslimsDocsByVillage[vil.id] || []).filter(m => m.type === 'رجل').length}</div>
                <div style={{ color: 'var(--success-color)' }}>مهتدين (نساء): {(newMuslimsDocsByVillage[vil.id] || []).filter(m => m.type === 'امرأة').length}</div>
                <div style={{ color: 'var(--success-color)' }}>مهتدين (أطفال): {(newMuslimsDocsByVillage[vil.id] || []).filter(m => m.type === 'طفل').length}</div>
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>جروب: {vil.groupName || '-'}</span>
                <span>LTI: {vil.ltiName || '-'}</span>
              </div>

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
                    <span>طي إدارة المهتدين</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} aria-hidden />
                    <span>إدارة المهتدين من البطاقة</span>
                  </>
                )}
              </button>

              {nmQuickVillageId === vil.id && (
                <div
                  className="surface-card"
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--panel-color)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    إضافة أو تعديل أو حذف دون فتح صفحة التفاصيل. العدادات تُحدَّث على القرية تلقائياً.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '8px', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={nmDraftName}
                      onChange={(e) => setNmDraftName(e.target.value)}
                      placeholder="اسم المهتدي"
                      className="app-input"
                      style={{ marginBottom: 0 }}
                      disabled={nmSaving}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddNewMuslim(vil);
                        }
                      }}
                    />
                    <select
                      value={nmDraftType}
                      onChange={(e) => setNmDraftType(e.target.value)}
                      className="app-select"
                      disabled={nmSaving}
                    >
                      <option value="رجل">رجل</option>
                      <option value="امرأة">امرأة</option>
                      <option value="طفل">طفل</option>
                    </select>
                    <button
                      type="button"
                      className="google-btn google-btn--filled"
                      style={{ marginTop: 0, width: 'auto', padding: '0 12px' }}
                      disabled={nmSaving}
                      onClick={() => handleQuickAddNewMuslim(vil)}
                    >
                      إضافة
                    </button>
                  </div>
                  <div
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-color)',
                    }}
                  >
                    {(newMuslimsDocsByVillage[vil.id] || []).length === 0 ? (
                      <p style={{ margin: 0, padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        لا توجد سجلات بعد.
                      </p>
                    ) : (
                      (newMuslimsDocsByVillage[vil.id] || []).map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: nmEditingId === m.id ? '1fr 90px auto auto' : '1fr auto',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '8px 10px',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {nmEditingId === m.id ? (
                            <>
                              <input
                                type="text"
                                value={nmEditingName}
                                onChange={(e) => setNmEditingName(e.target.value)}
                                className="app-input"
                                style={{ marginBottom: 0 }}
                                disabled={nmSaving}
                              />
                              <select
                                value={nmEditingType}
                                onChange={(e) => setNmEditingType(e.target.value)}
                                className="app-select"
                                disabled={nmSaving}
                              >
                                <option value="رجل">رجل</option>
                                <option value="امرأة">امرأة</option>
                                <option value="طفل">طفل</option>
                              </select>
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
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({m.type})</span>
                              </span>
                              <span style={{ display: 'flex', gap: '4px' }}>
                                <button type="button" className="icon-btn" title="تعديل" disabled={nmSaving} onClick={() => startNmQuickEdit(m)}>
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="حذف"
                                  disabled={nmSaving}
                                  onClick={() => setPendingNewMuslimDelete({ vil, m })}
                                >
                                  <Trash2 size={16} color="var(--danger-color)" />
                                </button>
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
          ))}
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
        title="حذف المهتدي"
        message={
          pendingNewMuslimDelete
            ? `حذف "${pendingNewMuslimDelete.m.name}" من سجل قرية «${pendingNewMuslimDelete.vil.villageName}»؟`
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
