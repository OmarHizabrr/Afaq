import React, { useState, useEffect } from 'react';
import { Users, Shield, MapPin, School, Edit2, X, CheckCircle } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const ROLE_LABELS = {
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام (عربي)',
  supervisor_local: 'مشرف منطقة (محلي)',
  teacher: 'معلم',
  unassigned: 'صلاحية معلقة'
};

const ROLE_COLORS = {
  admin: 'var(--danger-color)',
  supervisor_arab: 'var(--accent-color)',
  supervisor_local: '#3b82f6',
  teacher: 'var(--success-color)',
  unassigned: 'var(--text-secondary)'
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [schools, setSchools] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  // Form State for Assignments
  const [selectedRole, setSelectedRole] = useState('unassigned');
  
  // Supervisor Local logic
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [restrictedSchoolIds, setRestrictedSchoolIds] = useState([]); // Array of school IDs
  
  // Teacher logic
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      const [userDocs, regDocs, schDocs] = await Promise.all([
        api.getDocuments(api.getCollection('users')),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('schools')
      ]);

      setUsers(userDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRegions(regDocs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  const openEditModal = async (user) => {
    setEditingUser(user);
    setSelectedRole(user.role || 'unassigned');
    setSelectedRegionId('');
    setRestrictedSchoolIds([]);
    setSelectedSchoolId(user.schoolId || '');

    // Try to pre-load assignment if supervisor
    if (user.role?.includes('supervisor')) {
      const api = FirestoreApi.Api;
      const assignmentDoc = await api.getData(api.getDocument('supervisor_assignments', user.id));
      if (assignmentDoc) {
        setSelectedRegionId(assignmentDoc.regionId || '');
        setRestrictedSchoolIds(assignmentDoc.schoolIds || []);
      }
    }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    
    // Validations
    if (selectedRole === 'teacher' && !selectedSchoolId) {
      setError('يجب اختيار مدرسة للمعلم');
      return;
    }
    if (selectedRole === 'supervisor_local' && !selectedRegionId) {
      setError('يجب اختيار المنطقة للمشرف المحلي');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      
      // 1. Update Core User Role
      const userDataPatch = { role: selectedRole };
      if (selectedRole === 'teacher') {
        userDataPatch.schoolId = selectedSchoolId;
      }
      
      await api.updateData({
        docRef: api.getDocument('users', editingUser.id),
        data: userDataPatch
      });

      // 2. Handle Assignments
      if (selectedRole === 'supervisor_local' || selectedRole === 'supervisor_arab') {
        // Save to supervisor_assignments (using user.id as the doc ID for 1:1 relation)
        await api.setData({
          docRef: api.getDocument('supervisor_assignments', editingUser.id),
          data: {
            userId: editingUser.id,
            role: selectedRole,
            regionId: selectedRegionId, // Might be empty for Arab supervisor
            schoolIds: restrictedSchoolIds
          }
        });
      }

      setEditingUser(null);
      setError('');
      fetchData(); // Refresh
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ الصلاحيات');
      setLoading(false);
    }
  };

  const toggleSchoolRestriction = (schoolId) => {
    setRestrictedSchoolIds(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId) 
        : [...prev, schoolId]
    );
  };

  // UI Helpers
  const schoolsInSelRegion = schools.filter(s => {
    // This assumes we have a way to match school -> village -> region. 
    // Since school only has villageId, in a tight query we'd need villages list.
    // For simplicity, we assume we either add regionId to school or filter properly.
    // Let's just list all schools for now if we didn't store regionId on school.
    return true; 
  }); 

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={28} color="var(--accent-color)" />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>إدارة الكوادر والصلاحيات</h1>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {/* Users List */}
      {loading && !editingUser ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {users.map(user => (
            <div key={user.id} style={{
              background: 'var(--panel-color)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <img 
                src={user.photoURL || 'https://ui-avatars.com/api/?name=' + user.displayName} 
                alt={user.displayName}
                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user.displayName || 'بدون اسم'}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{user.email}</p>
                <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: `${ROLE_COLORS[user.role || 'unassigned']}20`, color: ROLE_COLORS[user.role || 'unassigned'] }}>
                  {ROLE_LABELS[user.role || 'unassigned']}
                </div>
              </div>
              <button 
                className="icon-btn" 
                onClick={() => openEditModal(user)}
                title="تعديل الصلاحيات"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                <Edit2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)'
        }}>
          <div style={{
            background: 'var(--panel-color)',
            width: '90%', maxWidth: '500px',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>تعديل صلاحيات ({editingUser.displayName})</h2>
              <button className="icon-btn" onClick={() => setEditingUser(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الرتبة / الصلاحية</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              >
                <option value="unassigned">-- غير معين (معلق) --</option>
                <option value="teacher">معلم</option>
                <option value="supervisor_local">مشرف منطقة (محلي)</option>
                <option value="supervisor_arab">مشرف عام (عربي)</option>
                <option value="admin">مدير النظام</option>
              </select>
            </div>

            {/* Teacher Settings */}
            {selectedRole === 'teacher' && (
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--accent-glow)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600, color: 'var(--success-color)' }}>
                  <School size={18} /> تعيين مدرسة المعلم
                </label>
                <select 
                  value={selectedSchoolId} 
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--panel-color)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- اختر المدرسة --</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Supervisor Local Settings */}
            {selectedRole === 'supervisor_local' && (
              <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--accent-glow)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '1rem', color: '#3b82f6', fontSize: '1.1rem' }}>
                  <MapPin size={18} /> النطاق الجغرافي للمشرف
                </h3>
                
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>تحديد المنطقة كاملة</label>
                <select 
                  value={selectedRegionId} 
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--panel-color)', color: 'var(--text-primary)', marginBottom: '1.5rem' }}
                >
                  <option value="">-- اختر المنطقة --</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>

                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>تقييد بمدارس معينة (اختياري، اتركها فارغة لجميع المدارس)</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px' }}>
                  {schools.map(school => (
                    <div 
                      key={school.id} 
                      onClick={() => toggleSchoolRestriction(school.id)}
                      style={{ 
                        padding: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        background: restrictedSchoolIds.includes(school.id) ? 'var(--accent-glow)' : 'transparent',
                        borderRadius: '4px',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', background: restrictedSchoolIds.includes(school.id) ? '#3b82f6' : 'transparent' }}>
                        {restrictedSchoolIds.includes(school.id) && <CheckCircle size={14} color="#fff" />}
                      </div>
                      <span style={{ fontSize: '0.9rem' }}>{school.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="google-btn" onClick={handleSaveRole} disabled={loading} style={{ width: '100%', justifyContent: 'center', background: 'var(--accent-color)', color: '#fff' }}>
                {loading ? 'الرجاء الانتظار...' : 'حفظ الصلاحيات والمهمة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
