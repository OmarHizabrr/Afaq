import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, School, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const SchoolsPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [schools, setSchools] = useState([]);
  const [regions, setRegions] = useState([]);
  const [villages, setVillages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

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
      
      const schoolData = {
        name: schoolName.trim(),
        villageId: selectedVilId,
        donorName: donorName.trim() || '',
      };

      if (isEditing) {
        const docRef = api.getSchoolDoc(isEditing.villageId, isEditing.id);
        await api.updateData({ docRef, data: schoolData });
      } else {
        const newSchId = api.getNewId('schools');
        const schRef = api.getSchoolDoc(selectedVilId, newSchId);
        await api.setData({ docRef: schRef, data: schoolData });
      }

      // Reset
      setSchoolName('');
      setDonorName('');
      setSelectedVilId('');
      setSelectedRegId('');
      setIsAdding(false);
      setIsEditing(null);
      setError('');
      setSuccess(isEditing ? 'تم تحديث المدرسة بنجاح.' : 'تمت إضافة المدرسة بنجاح.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الحفظ');
      setLoading(false);
    }
  };
  const handleEditClick = (sch) => {
    setIsEditing(sch);
    setIsAdding(true);
    setSelectedVilId(sch.villageId);
    // Find region of this village
    const vil = villages.find(v => v.id === sch.villageId);
    if (vil) setSelectedRegId(vil.regionId);
    setSchoolName(sch.name);
    setDonorName(sch.donorName || '');
  };

  const handleDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      const schoolDoc = schools.find(s => s.id === id);
      if (!schoolDoc) return;
      
      const docRef = api.getSchoolDoc(schoolDoc.villageId, id);
      await api.deleteData(docRef);
      setSuccess('تم حذف المدرسة بنجاح.');
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  const getVillageName = (vilId) => {
    const vil = villages.find(v => v.id === vilId);
    return vil ? vil.villageName : 'غير معروف';
  };

  return (
    <div>
      <PageHeader icon={School} title="إدارة المدارس">
        {can(PERMISSION_PAGE_IDS.schools, 'school_add') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => { setIsAdding(true); setIsEditing(null); }}>
            <Plus size={18} />
            <span>إضافة مدرسة</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error schools-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success schools-alert">{success}</div>}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding}
        title={isEditing ? 'تعديل المدرسة' : 'إضافة مدرسة'}
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd} className="schools-form">
          <label className="app-label">تصفية حسب المنطقة</label>
          <select value={selectedRegId} onChange={(e) => { setSelectedRegId(e.target.value); setSelectedVilId(''); }} className="app-select schools-form__field-gap">
            <option value="">-- كل المناطق --</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <label className="app-label">القرية (مطلوب)</label>
          <select value={selectedVilId} onChange={(e) => setSelectedVilId(e.target.value)} className="app-select schools-form__field-gap" required>
            <option value="">-- اختر القرية --</option>
            {filteredVillages.map(v => <option key={v.id} value={v.id}>{v.villageName}</option>)}
          </select>

          <label className="app-label">اسم المدرسة (مطلوب)</label>
          <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="app-input schools-form__field-gap" required placeholder="مثال: مدرسة النور" />

          <label className="app-label">اسم المتبرع (اختياري)</label>
          <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} className="app-input schools-form__field-gap-lg" placeholder="فاعل خير" />

          <div className="schools-form__actions">
            <button type="button" onClick={() => setIsAdding(false)} className="google-btn schools-form__action-btn">
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="google-btn google-btn--filled schools-form__action-btn">
              حفظ المدرسة
            </button>
          </div>
        </form>
      </FormModal>

      {/* List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : schools.length === 0 ? (
        <div className="empty-state">
          لا توجد مدارس مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {schools.map(sch => (
            <div key={sch.id} className="surface-card surface-card--entity">
              <div>
                <h3 className="schools-card__title">{sch.name}</h3>
                <div className="schools-card__meta">
                  <span>📍 القرية: {getVillageName(sch.villageId)}</span>
                  {sch.donorName && <span className="schools-card__donor">🤝 المتبرع: {sch.donorName}</span>}
                </div>
              </div>
              <div className="schools-card__actions">
                {can(PERMISSION_PAGE_IDS.schools, 'school_view') && (
                  <button className="icon-btn" onClick={() => navigate(`/schools/${sch.id}`)} title="عرض التفاصيل">
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.schools, 'school_edit') && (
                  <button className="icon-btn" onClick={() => handleEditClick(sch)} title="تعديل">
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.schools, 'school_delete') && (
                  <button className="icon-btn" onClick={() => setPendingDelete({ id: sch.id, name: sch.name })} title="حذف">
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف المدرسة"
        message={`سيتم حذف مدرسة "${pendingDelete?.name || ''}" نهائياً.`}
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

export default SchoolsPage;
