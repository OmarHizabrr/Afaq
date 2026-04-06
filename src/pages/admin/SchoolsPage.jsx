import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, School } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const SchoolsPage = () => {
  const [schools, setSchools] = useState([]);
  const [regions, setRegions] = useState([]);
  const [villages, setVillages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [selectedRegId, setSelectedRegId] = useState('');
  const [selectedVilId, setSelectedVilId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [donorName, setDonorName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      const [regDocs, vilDocs, schDocs] = await Promise.all([
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getCollectionGroupDocuments('schools')
      ]);

      setRegions(regDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setVillages(vilDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSchools(schDocs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  // Filter villages based on selected region
  const filteredVillages = selectedRegId 
    ? villages.filter(v => v.regionId === selectedRegId) 
    : villages;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!schoolName.trim() || !selectedVilId) {
      setError('يرجى إدخال اسم المدرسة واختيار القرية');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      
      const newSchId = api.getNewId('schools');
      const schRef = api.getSubDocument('schools', selectedVilId, 'schools', newSchId);

      await api.setData({
        docRef: schRef,
        data: {
          name: schoolName.trim(),
          villageId: selectedVilId,
          donorName: donorName.trim() || '',
        }
      });

      // Reset
      setSchoolName('');
      setDonorName('');
      setSelectedVilId('');
      setSelectedRegId('');
      setIsAdding(false);
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الإضافة');
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف مدرسة "${name}"؟`)) return;
    try {
      const api = FirestoreApi.Api;
      const schoolDoc = schools.find(s => s.id === id);
      if (!schoolDoc) return;
      
      const docRef = api.getSubDocument('schools', schoolDoc.villageId, 'schools', id);
      await api.deleteData(docRef);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('لا يمكن الحذف في الوقت الحالي');
    }
  };

  const getVillageName = (vilId) => {
    const vil = villages.find(v => v.id === vilId);
    return vil ? vil.villageName : 'غير معروف';
  };

  const inputStyle = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <School size={28} color="var(--accent-color)" />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>إدارة المدارس</h1>
        </div>
        <button 
          className="google-btn" 
          onClick={() => setIsAdding(!isAdding)}
          style={{ width: 'auto', marginTop: 0, padding: '10px 16px' }}
        >
          <Plus size={18} />
          <span>إضافة مدرسة</span>
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} style={{
          background: 'var(--panel-color)',
          padding: '2rem',
          borderRadius: '12px',
          border: `1px solid var(--border-color)`,
          marginBottom: '2rem',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            
            {/* Cascading Dropdowns */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>تصفية حسب المنطقة</label>
              <select value={selectedRegId} onChange={(e) => { setSelectedRegId(e.target.value); setSelectedVilId(''); }} style={inputStyle}>
                <option value="">-- كل المناطق --</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>القرية (مطلوب)</label>
              <select value={selectedVilId} onChange={(e) => setSelectedVilId(e.target.value)} style={inputStyle} required>
                <option value="">-- اختر القرية --</option>
                {filteredVillages.map(v => <option key={v.id} value={v.id}>{v.villageName}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم المدرسة (مطلوب)</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} style={inputStyle} required placeholder="مثال: مدرسة النور" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>اسم المتبرع (اختياري)</label>
              <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} style={inputStyle} placeholder="فاعل خير" />
            </div>

          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '12px 24px' }}>
              إلغاء التغييرات
            </button>
            <button type="submit" disabled={loading} className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--accent-color)', color: '#fff', padding: '12px 32px' }}>
              حفظ المدرسة
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : schools.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          لا توجد مدارس مضافة حتى الآن.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {schools.map(sch => (
            <div key={sch.id} style={{
              background: 'var(--panel-color)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: 'var(--shadow)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{sch.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>📍 القرية: {getVillageName(sch.villageId)}</span>
                  {sch.donorName && <span style={{ color: 'var(--success-color)' }}>🤝 المتبرع: {sch.donorName}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-btn" onClick={() => handleDelete(sch.id, sch.name)} title="حذف">
                  <Trash2 size={16} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolsPage;
