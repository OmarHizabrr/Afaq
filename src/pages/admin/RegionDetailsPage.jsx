import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, School, Users, ChevronRight, UserPlus, Info, Search, X, Check } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const RegionDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [region, setRegion] = useState(null);
    const [schools, setSchools] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [assigning, setAssigning] = useState(false);

    const fetchRegionDetails = async () => {
        if (!id) return;
        try {
            const api = FirestoreApi.Api;
            
            // 1. Fetch Region
            const allRegions = await api.getCollectionGroupDocuments('regions');
            const regDoc = allRegions.find(r => r.id === id);
            if (!regDoc) return;
            setRegion({ id: regDoc.id, ...regDoc.data() });

            // 2. Fetch Schools in this Region
            const allSchools = await api.getCollectionGroupDocuments('schools');
            const regSchools = allSchools.filter(s => s.data().regionId === id).map(s => ({ id: s.id, ...s.data() }));
            setSchools(regSchools);

            // 3. Fetch Supervisors assigned to this region
            const usersDocs = await api.getDocuments(api.getCollection('users'));
            const users = usersDocs.map(u => ({ id: u.id, ...u.data() }));
            setAllUsers(users);

            const regSupervisors = users.filter(u => u.role === 'supervisor' && u.regionId === id);
            setSupervisors(regSupervisors);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegionDetails();
    }, [id]);

    const handleAssignSupervisor = async (userToAssign) => {
        if (!userToAssign || assigning) return;
        setAssigning(true);
        try {
            const api = FirestoreApi.Api;
            // Update user's region assignment
            const userRef = api.getDocument('users', userToAssign.id);
            await api.updateData({
                docRef: userRef,
                data: { regionId: id }
            });

            setIsModalOpen(false);
            fetchRegionDetails();
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء التعيين');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!region) return <div style={{ padding: '2rem', textAlign: 'center' }}>المنطقة غير موجودة</div>;

    const filteredUsers = allUsers.filter(u => {
        const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const alreadySupervisor = supervisors.find(s => s.id === u.id);
        return matchesSearch && u.role === 'supervisor' && !alreadySupervisor;
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/regions')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={20} /> إدارة المناطق
                </button>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>منطقة: <span style={{ color: 'var(--accent-color)' }}>{region.name}</span></h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Schools Section */}
                <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <School size={18} color="var(--accent-color)" /> المدارس في هذه المنطقة
                        </h2>
                    </div>
                    {schools.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا توجد مدارس مضافة لهذه المنطقة.</p> : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                           {schools.map(sch => (
                              <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <h4 style={{ margin: 0 }}>{sch.name}</h4>
                                 <button onClick={() => navigate(`/schools/${sch.id}`)} className="icon-btn"><Info size={16}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>

                {/* Supervisors Section */}
                <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <Users size={18} color="var(--success-color)" /> المشرفون الميدانيون
                        </h2>
                        <button className="icon-btn" title="تعيين مشرف" onClick={() => setIsModalOpen(true)}><UserPlus size={18} /></button>
                    </div>
                    {supervisors.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا يوجد مشرفون معينون لهذه المنطقة حالياً.</p> : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                           {supervisors.map(sup => (
                              <div key={sup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={sup.photoURL || `https://ui-avatars.com/api/?name=${sup.displayName}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    <h4 style={{ margin: 0 }}>{sup.displayName}</h4>
                                 </div>
                                 <button onClick={() => navigate(`/users/${sup.id}`)} className="icon-btn"><Info size={16}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Assign Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setIsModalOpen(false)}>
                    <div style={{ background: 'var(--panel-color)', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>تعيين مشرف للمنطقة</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <Search size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                            <input 
                              type="text" 
                              placeholder="بحث عن مشرف..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                            {filteredUsers.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>لا يوجد مشرفون متاحون للتعيين.</p> : filteredUsers.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{u.displayName}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>مشرف متاح</div>
                                        </div>
                                    </div>
                                    <button 
                                      onClick={() => handleAssignSupervisor(u)}
                                      disabled={assigning}
                                      style={{ padding: '6px 12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'check' }}
                                    >
                                        <Check size={14} /> تعيين
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegionDetailsPage;
