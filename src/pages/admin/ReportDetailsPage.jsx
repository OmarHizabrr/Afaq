import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, User, School, MapPin, Calendar, Star, Info, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const ReportDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            if (!id) return;
            try {
                const api = FirestoreApi.Api;
                // Since there are multiple report types (daily, weekly, visit), we try to find it.
                // For simplicity, we'll search the 'reports' (visits) first.
                const allVisits = await api.getCollectionGroupDocuments('reports');
                const visit = allVisits.find(r => r.id === id);
                
                if (visit) {
                    setReport({ id, ...visit.data(), type: 'visit' });
                } else {
                    // Check other types if needed (teacher_daily_logs etc)
                    const allDaily = await api.getCollectionGroupDocuments('teacher_daily_logs');
                    const daily = allDaily.find(r => r.id === id);
                    if (daily) setReport({ id, ...daily.data(), type: 'daily' });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!report) return <div className="empty-state" style={{ margin: '2rem auto', maxWidth: '480px' }}>التقرير غير موجود</div>;

    const renderStatus = (val) => {
        if (val === true || val === 'isActive') return <CheckCircle size={16} color="var(--success-color)" />;
        return <XCircle size={16} color="var(--danger-color)" />;
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <PageHeader
              topRow={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="page-nav-back" onClick={() => navigate(-1)}>
                    <ChevronRight size={20} aria-hidden /> رجوع
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>تفاصيل التقرير: <span style={{ color: 'var(--md-primary)' }}>{id.substring(0, 8)}</span></>}
            />

            <div className="surface-card surface-card--lg" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المشرف / المعلم</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                           <User size={18} color="var(--accent-color)" />
                           <strong style={{ fontSize: '1.1rem' }}>{report.supervisorName || report.teacherName || 'غير محدد'}</strong>
                        </div>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المدرسة</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                           <School size={18} color="var(--accent-color)" />
                           <strong style={{ fontSize: '1.1rem' }}>{report.schoolName}</strong>
                        </div>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>التاريخ والوقت</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                           <Calendar size={18} color="var(--accent-color)" />
                           <strong style={{ fontSize: '1.1rem' }}>{report.timestamp?.split('T')[0] || report.date}</strong>
                        </div>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>نوع التقرير</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--accent-color)' }}>
                           <Info size={18} />
                           <strong style={{ fontSize: '1.1rem' }}>{report.type === 'visit' ? 'زيارة ميدانية' : 'تحضير يومي'}</strong>
                        </div>
                    </div>
                </div>

                {report.type === 'visit' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div className="stat-tile">
                                <Star size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>تقييم المعلم</p>
                                <h2 style={{ margin: '8px 0 0', fontSize: '2rem', color: '#f59e0b' }}>{report.teacherRating}/10</h2>
                            </div>
                            <div className="stat-tile">
                                <Star size={24} color="var(--success-color)" style={{ marginBottom: '8px' }} />
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>تقييم القرية / الموقع</p>
                                <h2 style={{ margin: '8px 0 0', fontSize: '2rem', color: 'var(--success-color)' }}>{report.villageRating}/10</h2>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <FileText size={20} color="var(--accent-color)" /> ملاحظات وتوصيات المشرف
                            </h3>
                            <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                {report.generalNotes || 'لا توجد ملاحظات عامة مسجلة لهذه الزيارة.'}
                            </div>
                        </div>

                        {report.studentsTracking && (
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>تتبع أداء الطلاب أثناء الزيارة</h3>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {report.studentsTracking.map((st, i) => (
                                        <div key={i} className="activity-list-item activity-list-item--split" style={{ padding: '1.25rem' }}>
                                            <div>
                                                <h4 style={{ margin: 0 }}>{st.name || 'طالب مجهول'}</h4>
                                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{st.note || 'لا توجد ملاحظات'}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                {st.isPresent ? <span style={{ color: 'var(--success-color)', fontSize: '0.85rem' }}>حاضر ✅</span> : <span style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>غائب ❌</span>}
                                                <div style={{ padding: '4px 12px', background: 'var(--accent-glow)', color: 'var(--accent-color)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                                                   {st.points || 0} نقطة
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {report.type === 'daily' && (
                    <div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>سجل الحضور والغياب اليومي</h3>
                        <div className="surface-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                          <div className="md-table-scroll">
                            <table className="md-table" style={{ minWidth: 'unset' }}>
                            <thead>
                                <tr>
                                    <th>اسم الطالب</th>
                                    <th>الحالة</th>
                                    <th>الحفظ</th>
                                    <th>المراجعة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.records?.map(r => (
                                    <tr key={r.studentId} className={!r.isPresent ? 'md-table__row--absent' : ''}>
                                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                                        <td>{r.isPresent ? '✅ حاضر' : '❌ غائب'}</td>
                                        <td>{r.memorization || '—'}</td>
                                        <td>{r.review || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                          </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="surface-card surface-card--lg" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <MapPin size={20} color="var(--text-secondary)" />
                <div style={{ fontSize: '0.9rem' }}>
                   <strong>الموقع الجغرافي:</strong> {report.gpsLocation ? `${report.gpsLocation.lat}, ${report.gpsLocation.lng}` : 'لم يتم تسجيل إحداثيات GPS'}
                </div>
            </div>
        </div>
    );
};

export default ReportDetailsPage;
