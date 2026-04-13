import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, MapPin, Map, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const RegionsPage = () => {
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  
  // Form State
  const [regionName, setRegionName] = useState('');
  const [selectedGovId, setSelectedGovId] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      // Fetch Governorates for the dropdown
      const govRef = api.getCollection('governorates');
      const govDocs = await api.getDocuments(govRef);
      const govData = govDocs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGovernorates(govData);

      // Fetch Regions via Collection Group
      const regDocs = await api.getCollectionGroupDocuments('regions');
      const regData = regDocs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegions(regData);

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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!regionName.trim() || !selectedGovId) {
      setError('يرجى إدخال اسم المنطقة واختيار المحافظة');
      return;
    }

    try {
      const api = FirestoreApi.Api;
      // The new ID is for the region document
      const regId = api.getNewId('regions');
      // The parent document in the 'regions' collection is named after the govId
      const docRef = api.getSubDocument('regions', selectedGovId, 'regions', regId);
      
      await api.setData({
        docRef,
        data: { 
          name: regionName.trim(),
          govId: selectedGovId 
        }
      });

      setRegionName('');
      setSelectedGovId('');
      setIsAdding(false);
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الإضافة');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!regionName.trim() || !selectedGovId || !isEditing) {
      setError('يرجى إدخال اسم المنطقة واختيار المحافظة');
      return;
    }

    try {
      const api = FirestoreApi.Api;
      const docRef = api.getSubDocument('regions', isEditing.govId, 'regions', isEditing.id);
      
      await api.updateData({
        docRef,
        data: { 
          name: regionName.trim(),
          govId: selectedGovId 
        }
      });

      setRegionName('');
      setSelectedGovId('');
      setIsEditing(null);
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء التحديث');
    }
  };

  const startEdit = (region) => {
      setIsEditing(region);
      setRegionName(region.name);
      setSelectedGovId(region.govId);
      setIsAdding(false);
  };

  const handleDelete = async (region) => {
    if (!window.confirm(`هل أنت متأكد من حذف منطقة "${region.name}"؟`)) return;
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getSubDocument('regions', region.govId, 'regions', region.id);
      await api.deleteData(docRef);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('لا يمكن الحذف في الوقت الحالي');
    }
  };

  const getGovName = (govId) => {
    const gov = governorates.find(g => g.id === govId);
    return gov ? gov.name : 'غير معروف';
  };

  return (
    <div>
      <PageHeader icon={MapPin} title="إدارة المناطق">
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} />
          <span>إضافة منطقة</span>
        </button>
      </PageHeader>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {/* Add/Edit Form */}
      {(isAdding || isEditing) && (
        <form onSubmit={isEditing ? handleEdit : handleAdd} className="surface-card" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <select 
            value={selectedGovId}
            onChange={(e) => setSelectedGovId(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              minWidth: '200px'
            }}
          >
            <option value="">-- اختر المحافظة --</option>
            {governorates.map(gov => (
              <option key={gov.id} value={gov.id}>{gov.name}</option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="اسم المنطقة (مثال: أزال)"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
          <button type="submit" className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--accent-color)', color: '#fff' }}>
            {isEditing ? 'تحديث' : 'حفظ'}
          </button>
          <button type="button" onClick={() => { setIsAdding(false); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '12px' }}>
            إلغاء
          </button>
        </form>
      )}

      {/* Regions List */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : regions.length === 0 ? (
        <div className="empty-state">
          لا توجد مناطق مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {regions.map(region => (
            <div key={region.id} className="surface-card surface-card--entity">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '4px' }}>{region.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Map size={14} />
                  <span>المحافظة: {getGovName(region.govId)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-btn" onClick={() => navigate(`/regions/${region.id}`)} title="عرض التفاصيل">
                  <Eye size={16} color="var(--accent-color)" />
                </button>
                <button className="icon-btn" onClick={() => startEdit(region)} title="تعديل">
                  <Edit2 size={16} />
                </button>
                <button className="icon-btn" onClick={() => handleDelete(region)} title="حذف">
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

export default RegionsPage;
