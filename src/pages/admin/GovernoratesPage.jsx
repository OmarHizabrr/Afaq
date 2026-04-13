import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Map, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const GovernoratesPage = () => {
  const navigate = useNavigate();
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null); // stores gubernorate object being edited
  const [govName, setGovName] = useState('');
  const [error, setError] = useState('');

  const fetchGovernorates = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const ref = api.getCollection('governorates');
      const docs = await api.getDocuments(ref);
      const data = docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGovernorates(data);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernorates();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!govName.trim()) return;

    try {
      const api = FirestoreApi.Api;
      const docId = api.getNewId('governorates');
      const docRef = api.getDocument('governorates', docId);
      
      await api.setData({
        docRef,
        data: { name: govName.trim() }
      });

      setGovName('');
      setIsAdding(false);
      fetchGovernorates(); // Refresh list
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الإضافة');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!govName.trim() || !isEditing) return;

    try {
      const api = FirestoreApi.Api;
      const docRef = api.getDocument('governorates', isEditing.id);
      
      await api.updateData({
        docRef,
        data: { name: govName.trim() }
      });

      setGovName('');
      setIsEditing(null);
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء التحديث');
    }
  };

  const startEdit = (gov) => {
      setIsEditing(gov);
      setGovName(gov.name);
      setIsAdding(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف محافظة "${name}"؟`)) return;
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getDocument('governorates', id);
      await api.deleteData(docRef);
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      alert('لا يمكن الحذف في الوقت الحالي');
    }
  };

  return (
    <div>
      <PageHeader icon={Map} title="إدارة المحافظات">
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} />
          <span>إضافة محافظة</span>
        </button>
      </PageHeader>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

      {/* Add/Edit Form */}
      {(isAdding || isEditing) && (
        <form onSubmit={isEditing ? handleEdit : handleAdd} className="surface-card" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <input 
            type="text" 
            placeholder="اسم المحافظة (مثال: صنعاء)"
            value={govName}
            onChange={(e) => setGovName(e.target.value)}
            autoFocus
            style={{
              flex: 1,
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
          <button type="button" onClick={() => { setIsAdding(false); setIsEditing(null); setGovName(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '12px' }}>
            إلغاء
          </button>
        </form>
      )}

      {/* Governorates List */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : governorates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          لا توجد محافظات مضافة حتى الآن.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {governorates.map(gov => (
            <div key={gov.id} style={{
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
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{gov.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {gov.id.substring(0,8)}...</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-btn" onClick={() => navigate(`/governorates/${gov.id}`)} title="عرض التفاصيل">
                  <Eye size={16} color="var(--accent-color)" />
                </button>
                <button className="icon-btn" onClick={() => startEdit(gov)} title="تعديل">
                  <Edit2 size={16} />
                </button>
                <button className="icon-btn" onClick={() => handleDelete(gov.id, gov.name)} title="حذف">
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

export default GovernoratesPage;
