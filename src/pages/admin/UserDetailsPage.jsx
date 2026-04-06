import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Calendar, BookOpen, Clock, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const UserDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!id) return;
            try {
                const api = FirestoreApi.Api;
                const userDoc = await api.getData(api.getDocument('users', id));
                if (!userDoc) return;
                setProfile({ id, ...userDoc });

                // Fetch dynamic activity based on role
                if (userDoc.role === 'student') {
                    // Fetch results/attendance from reports (Collection Group)
                    const allReports = await api.getCollectionGroupDocuments('reports');
                    const studentData = [];
                    allReports.forEach(rep => {
                        const data = rep.data();
                        const record = data.studentsTracking?.find(s => s.studentId === id);
                        if (record) {
                            studentData.push({
                                id: rep.id,
                                date: data.timestamp?.split('T')[0],
                                subject: data.subjectName,
                                school: data.schoolName,
                                ...record
                            });
                        }
                    });
                    setActivity(studentData.sort((a,b) => new Date(b.date) - new Date(a.date)));
                } else if (userDoc.role === 'teacher') {
                    // Fetch daily logs / weekly reports
                    const logs = await api.getDocuments(api.getSubCollection('daily-logs', id, 'logs'));
                    setActivity(logs.map(l => ({ id: l.id, ...l.data() })).sort((a,b) => new Date(b.date) - new Date(a.date)));
                } else if (userDoc.role?.includes('supervisor')) {
                    // Fetch visit history (reports created by him)
                    const allReports = await api.getCollectionGroupDocuments('reports');
                    const supReports = allReports
                        .filter(r => r.data().supervisorId === id)
                        .map(r => ({ id: r.id, ...r.data() }))
                        .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setActivity(supReports);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id]);

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!profile) return <div style={{ padding: '2rem', textAlign: 'center' }}>المستخدم غير موجود</div>;

    const ROLE_LABELS = {
        admin: 'مدير النظام',
        supervisor_arab: 'مشرف عام (عربي)',
        supervisor_local: 'مشرف منطقة (محلي)',
        teacher: 'معلم مدرسة',
        student: 'طالب / دارس',
        unassigned: 'صلاحية معلقه'
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/users')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={20} /> إدارة المستخدمين
                </button>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>عرض ملف: <span style={{ color: 'var(--accent-color)' }}>{profile.displayName}</span></h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Profile Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'var(--panel-color)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <img 
                          src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&size=128`} 
                          alt="Profile" 
                          style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--accent-glow)', marginBottom: '1.5rem' }}
                        />
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{profile.displayName}</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 700, background: 'var(--accent-glow)', padding: '4px 12px', borderRadius: '20px', marginTop: '10px', display: 'inline-block' }}>
                            {ROLE_LABELS[profile.role] || profile.role}
                        </span>
                        
                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Mail size={16} /> {profile.email}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Phone size={16} /> {profile.phoneNumber || 'لا يوجد رقم'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Shield size={16} /> المعرف: {profile.id.substring(0, 8)}...
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role-Specific Activity */}
                <div style={{ background: 'var(--panel-color)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Activity size={24} color="var(--accent-color)" />
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>السجل والنشاطات</h2>
                    </div>

                    {activity.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                           لا يوجد سجلات نشطة لهذا الحساب حالياً.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                           {profile.role === 'student' && activity.map(item => (
                              <div key={item.id} style={{ padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                 <div>
                                    <h4 style={{ margin: 0 }}>{item.subject}</h4>
                                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.date} • {item.school}</p>
                                 </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', background: item.isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: item.isPresent ? 'var(--success-color)' : 'var(--danger-color)', padding: '4px 10px', borderRadius: '12px' }}>
                                       {item.isPresent ? 'حاضر' : 'غائب'}
                                    </span>
                                    {item.isTested && <TrendingUp size={16} color="var(--success-color)" />}
                                 </div>
                              </div>
                           ))}

                           {profile.role === 'teacher' && activity.map(item => (
                              <div key={item.id} style={{ padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                       <Calendar size={14} color="var(--accent-color)" />
                                       <span style={{ fontWeight: 600 }}>{item.date}</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.subject}</span>
                                 </div>
                                 <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📖 {item.lessonTitle}</p>
                              </div>
                           ))}

                           {profile.role?.includes('supervisor') && activity.map(item => (
                              <div key={item.id} style={{ padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div>
                                    <h4 style={{ margin: 0 }}>زيارة: {item.schoolName}</h4>
                                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.timestamp?.split('T')[0]} • {item.subjectName}</p>
                                 </div>
                                 <button onClick={() => navigate(`/reports/${item.id}`)} className="icon-btn"><Info size={18}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDetailsPage;
