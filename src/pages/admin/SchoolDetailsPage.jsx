import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { School, Users, FileText, ChevronRight, UserPlus, Info, Search, X, Check } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const SchoolDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [school, setSchool] = useState(null);
    const [staff, setStaff] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [assigning, setAssigning] = useState(false);

    const fetchSchoolDetails = async () => {
        if (!id) return;
        try {
            const api = FirestoreApi.Api;
            
            // 1. Fetch School
            const allSchools = await api.getCollectionGroupDocuments('schools');
            const schDoc = allSchools.find(s => s.id === id);
            if (!schDoc) {
                console.error('School not found');
                return;
            }
            setSchool({ id: schDoc.id, ...schDoc.data() });

            // 2. Fetch Members (Teachers / Students)
            const membersRef = api.getSubCollection('members', id, 'members');
            const membersDocs = await api.getDocuments(membersRef);
            const memberData = membersDocs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Populate full user profiles
            const usersDocs = await api.getDocuments(api.getCollection('users'));
            const users = usersDocs.map(u => ({ id: u.id, ...u.data() }));
            setAllUsers(users);

            const userMap = {};
            users.forEach(u => userMap[u.id] = u);

            const detailedStaff = [];
            const detailedStudents = [];

            memberData.forEach(m => {
                const profile = userMap[m.userId];
                if (profile) {
                    if (profile.role === 'teacher') detailedStaff.push(profile);
                    else if (profile.role === 'student' || m.type === 'student') detailedStudents.push(profile);
                }
            });

            setStaff(detailedStaff);
            setStudents(detailedStudents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchoolDetails();
    }, [id]);

    const handleAssignUser = async (userToAssign) => {
        if (!userToAssign || assigning) return;
        setAssigning(true);
        try {
            const api = FirestoreApi.Api;
            
            // Bilateral Update:
            // 1. Update user document
            const userRef = api.getDocument('users', userToAssign.id);
            await api.updateData({
                docRef: userRef,
                data: {
                    schoolId: id,
                    regionId: school.regionId || null
                }
            });

            // 2. Add to school members subcollection
            const memberRef = api.getSubDocument('members', id, 'members', userToAssign.id);
            await api.setData({
                docRef: memberRef,
                data: {
                    userId: userToAssign.id,
                    type: userToAssign.role,
                    timestamp: new Date().toISOString()
                },
                Overwrite: true
            });

            // 3. If it's a student, we also mirror in schools/{id}/students for legacy compatibility
            if (userToAssign.role === 'student') {
                const legacyRef = api.getSubDocument('students', id, 'students', userToAssign.id);
                await api.setData({
                    docRef: legacyRef,
                    data: {
                        studentName: userToAssign.displayName,
                        age: userToAssign.age || 0,
                        schoolId: id
                    },
                    Overwrite: true
                });
            }

            setIsModalOpen(false);
            fetchSchoolDetails();
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء التعيين');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!school) return <div style={{ padding: '2rem', textAlign: 'center' }}>المدرسة غير موجودة</div>;

    const filteredUsers = allUsers.filter(u => {
        const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const alreadyMember = staff.find(s => s.id === u.id) || students.find(s => s.id === u.id);
        const validRole = u.role === 'teacher' || u.role === 'student';
        return matchesSearch && !alreadyMember && validRole;
    });

    const StatCard = ({ label, value, icon: Icon, color }) => (
        <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ padding: '12px', background: `${color}15`, color: color, borderRadius: '12px' }}>
                <Icon size={24} />
            </div>
            <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</p>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{value}</h3>
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/schools')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={20} /> إدارة المدارس
                </button>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>مدرسة: <span style={{ color: 'var(--accent-color)' }}>{school.name}</span></h1>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                <StatCard label="إجمالي الطلاب" value={students.length} icon={Users} color="#f59e0b" />
                <StatCard label="الكادر التعليمي" value={staff.length} icon={School} color="var(--success-color)" />
                <StatCard label="التقارير الميدانية" value="..." icon={FileText} color="var(--accent-color)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Teachers Section */}
                <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <School size={18} color="var(--success-color)" /> طاقم التدريس
                        </h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', opacity: 0.5 }} />
                                <input 
                                    type="text" 
                                    placeholder="بحث في الكادر..." 
                                    value={staffSearch}
                                    onChange={(e) => setStaffSearch(e.target.value)}
                                    style={{ padding: '6px 30px 6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontSize: '0.8rem' }}
                                />
                            </div>
                            <button className="icon-btn" title="إضافة معلم" onClick={() => setIsModalOpen(true)}><UserPlus size={18} /></button>
                        </div>
                    </div>
                    {staff.filter(t => t.displayName?.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا يوجد نتائج للبحث.</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           {staff.filter(t => t.displayName?.toLowerCase().includes(staffSearch.toLowerCase())).map(t => (
                              <div key={t.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                 <img src={t.photoURL || `https://ui-avatars.com/api/?name=${t.displayName}`} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                 <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{t.displayName}</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.email}</p>
                                 </div>
                                 <button onClick={() => navigate(`/admin/users/${t.id}`)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}><Info size={16}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>

                {/* Students Section */}
                <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <Users size={18} color="#f59e0b" /> قائمة الطلاب المسجلين
                        </h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', opacity: 0.5 }} />
                                <input 
                                    type="text" 
                                    placeholder="بحث في الطلاب..." 
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    style={{ padding: '6px 30px 6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontSize: '0.8rem' }}
                                />
                            </div>
                            <button className="icon-btn" title="إضافة طالب" onClick={() => setIsModalOpen(true)}><UserPlus size={18} /></button>
                        </div>
                    </div>
                    {students.filter(s => s.displayName?.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا يوجد نتائج للبحث.</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           {students.filter(s => s.displayName?.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                              <div key={s.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                 <img src={s.photoURL || `https://ui-avatars.com/api/?name=${s.displayName}`} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                 <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{s.displayName}</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.phoneNumber || 'لا يوجد هاتف'}</p>
                                 </div>
                                 <button onClick={() => navigate(`/admin/users/${s.id}`)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}><Info size={16}/></button>
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
                            <h3 style={{ margin: 0 }}>تعيين عضو جديد للمدرسة</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <Search size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                            <input 
                              type="text" 
                              placeholder="بحث عن مستخدم (الاسم أو البريد)..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                            {filteredUsers.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>لا يوجد مستخدمين متاحين للتعيين.</p> : filteredUsers.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{u.displayName}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{u.role === 'teacher' ? 'معلم' : 'طالب'} {u.schoolId ? '(لديه مدرسة حالية)' : '(غير محدد مدرسة)'}</div>
                                        </div>
                                    </div>
                                    <button 
                                      onClick={() => handleAssignUser(u)}
                                      disabled={assigning}
                                      style={{ padding: '6px 12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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

export default SchoolDetailsPage;
