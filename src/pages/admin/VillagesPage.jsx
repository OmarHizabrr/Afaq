import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Home, UserPlus, X, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const VillagesPage = () => {
  const navigate = useNavigate();
  const [villages, setVillages] = useState([]);
  const [regions, setRegions] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [error, setError] = useState('');

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      // Fetch Governorates & Regions for relations
      const [govDocs, regDocs, vilDocs] = await Promise.all([
        api.getDocuments(api.getCollection('governorates')),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages')
      ]);

      setGovernorates(govDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRegions(regDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setVillages(vilDocs.map(doc => ({ id: doc.id, ...doc.data() })));
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

      if (isEditing) {
        const docRef = api.getSubDocument('villages', isEditing.regionId, 'villages', isEditing.id);
        await api.updateData({ docRef, data: villageData });
      } else {
        const newVilId = api.getNewId('villages');
        const vilRef = api.getSubDocument('villages', selectedRegId, 'villages', newVilId);
        
        await api.setData({
          docRef: vilRef,
          data: {
            ...villageData,
            newMuslimsMen: newMuslims.filter(m => m.type === 'رجل').length,
            newMuslimsWomen: newMuslims.filter(m => m.type === 'امرأة').length,
            newMuslimsChildren: newMuslims.filter(m => m.type === 'طفل').length,
          }
        });

        if (newMuslims.length > 0) {
          const promises = newMuslims.map(muslim => {
            const muslimId = api.getNewId('new_muslims');
            return api.setData({
              docRef: api.getDocument('new_muslims', muslimId),
              data: { villageId: newVilId, name: muslim.name, type: muslim.type }
            });
          });
          await Promise.all(promises);
        }
      }

      setFormData({ villageName: '', groupName: '', ltiName: '', populationCount: '', muslimsCount: '', nonMuslimsCount: '' });
      setSelectedRegId('');
      setNewMuslims([]);
      setIsAdding(false);
      setIsEditing(null);
      setError('');
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
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف قرية "${name}"؟`)) return;
    try {
      const api = FirestoreApi.Api;
      const villageDoc = villages.find(v => v.id === id);
      if (!villageDoc) return;
      
      const docRef = api.getSubDocument('villages', villageDoc.regionId, 'villages', id);
      await api.deleteData(docRef);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('لا يمكن الحذف في الوقت الحالي');
    }
  };

  const getRegionName = (regId) => {
    const reg = regions.find(r => r.id === regId);
    return reg ? reg.name : 'غير معروف';
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div>
      <PageHeader icon={Home} title="إدارة القرى" subtitle="البيانات الديموغرافية والمجموعات">
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} />
          <span>إضافة قرية جديدة</span>
        </button>
      </PageHeader>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {/* Complex Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="surface-card surface-card--lg" style={{
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--accent-color)' }}>البيانات الأساسية</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المنطقة التابعة لها</label>
              <select value={selectedRegId} onChange={(e) => setSelectedRegId(e.target.value)} style={inputStyle} required>
                <option value="">-- اختر المنطقة --</option>
                {regions.map(reg => (
                  <option key={reg.id} value={reg.id}>{reg.name} ({getRegionName(reg.id)})</option> // Simplified
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم القرية</label>
              <input name="villageName" type="text" value={formData.villageName} onChange={handleInputChange} style={inputStyle} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم الجروب</label>
              <input name="groupName" type="text" value={formData.groupName} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم الـ LTI</label>
              <input name="ltiName" type="text" value={formData.ltiName} onChange={handleInputChange} style={inputStyle} />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--accent-color)' }}>الإحصائيات السكانية</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>إجمالي السكان</label>
              <input name="populationCount" type="number" min="0" value={formData.populationCount} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>عدد المسلمين</label>
              <input name="muslimsCount" type="number" min="0" value={formData.muslimsCount} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>عدد غير المسلمين</label>
              <input name="nonMuslimsCount" type="number" min="0" value={formData.nonMuslimsCount} onChange={handleInputChange} style={inputStyle} />
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
              <input type="text" value={muslimName} onChange={(e) => setMuslimName(e.target.value)} style={inputStyle} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewMuslimToList())} />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الفئة</label>
              <select value={muslimType} onChange={(e) => setMuslimType(e.target.value)} style={inputStyle}>
                <option value="رجل">رجل</option>
                <option value="امرأة">امرأة</option>
                <option value="طفل">طفل</option>
              </select>
            </div>
            <button type="button" onClick={addNewMuslimToList} className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--panel-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
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
            <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '12px 24px' }}>
              إلغاء التغييرات
            </button>
            <button type="submit" disabled={loading} className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--accent-color)', color: '#fff', padding: '12px 32px' }}>
              {loading ? 'جاري الحفظ...' : 'حفظ القرية نهائياً'}
            </button>
          </div>
        </form>
      )}

      {/* Villages List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : villages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          لا توجد قرى مضافة حتى الآن.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {villages.map(vil => (
            <div key={vil.id} style={{
              background: 'var(--panel-color)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow)',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', display: 'flex', gap: '8px' }}>
                <button className="icon-btn" onClick={() => navigate(`/villages/${vil.id}`)} title="عرض التفاصيل الكاملة">
                  <Eye size={16} color="var(--accent-color)" />
                </button>
                <button className="icon-btn" onClick={() => handleEditClick(vil)} title="تعديل القرية">
                  <Edit2 size={16} />
                </button>
                <button className="icon-btn" onClick={() => handleDelete(vil.id, vil.villageName)} title="حذف القرية">
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
                <div style={{ color: 'var(--success-color)' }}>مهتدين (رجال): {vil.newMuslimsMen || 0}</div>
                <div style={{ color: 'var(--success-color)' }}>مهتدين (نساء): {vil.newMuslimsWomen || 0}</div>
                <div style={{ color: 'var(--success-color)' }}>مهتدين (أطفال): {vil.newMuslimsChildren || 0}</div>
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>جروب: {vil.groupName || '-'}</span>
                <span>LTI: {vil.ltiName || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VillagesPage;
