import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Home, UserPlus, X, Eye } from 'lucide-react';
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
    </div>
  );
};

export default VillagesPage;
