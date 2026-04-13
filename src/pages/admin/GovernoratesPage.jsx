import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Map, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';

const GovernoratesPage = () => {
  const navigate = useNavigate();
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null); // stores gubernorate object being edited
  const [govName, setGovName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

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
      setSuccess('تمت إضافة المحافظة بنجاح.');
      setError('');
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
      setSuccess('تم تحديث المحافظة بنجاح.');
      setError('');
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
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getDocument('governorates', id);
      await api.deleteData(docRef);
      setSuccess('تم حذف المحافظة بنجاح.');
      setError('');
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
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

      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="app-alert app-alert--success" style={{ marginBottom: '1rem' }}>{success}</div>}

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
            className="app-input"
            style={{ flex: 1 }}
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
        <div className="empty-state">
          لا توجد محافظات مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid">
          {governorates.map(gov => (
            <div key={gov.id} className="surface-card surface-card--entity">
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
                <button className="icon-btn" onClick={() => setPendingDelete({ id: gov.id, name: gov.name })} title="حذف">
                  <Trash2 size={16} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف المحافظة"
        message={`سيتم حذف المحافظة "${pendingDelete?.name || ''}" نهائياً.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id, item.name);
        }}
      />
    </div>
  );
};

export default GovernoratesPage;
