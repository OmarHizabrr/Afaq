import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  CheckCircle,
  FileText,
  Activity,
  Lightbulb,
  Rocket
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const StatCard = ({ title, value, icon, color, subtext }) => {
  const IconComponent = icon;
  return (
  <div className="surface-card surface-card--lg" style={{
    padding: '1.5rem',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      borderRadius: '16px',
      background: `${color}15`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 8px 30px ${color}20`
    }}>
      <IconComponent size={30} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{title}</p>
      <h3 style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 800 }}>{value}</h3>
      {subtext && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 600 }}>{subtext}</p>}
    </div>
  </div>
  );
};

const StudentDashboardPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
  const [stats, setStats] = useState({
    attendancePercent: 0,
    averageGrade: 0,
    schoolName: 'غير محدد',
    completedTests: 0,
    recentResults: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!actorId) return;
      try {
        const api = FirestoreApi.Api;
        
        // 1) Support multiple schools from memberships
        const assignedSchoolsDocs = await api.getDocuments(api.getUserMembershipMirrorCollection(actorId));
        const schoolIds = assignedSchoolsDocs.map((d) => d.data()?.schoolId).filter(Boolean);
        if (schoolIds.length > 0) {
          const allSchools = await api.getCollectionGroupDocuments('schools');
          const names = allSchools
            .filter((s) => schoolIds.includes(s.id))
            .map((s) => s.data()?.name)
            .filter(Boolean);
          setStats((prev) => ({ ...prev, schoolName: names.length > 0 ? names.join('، ') : 'غير محدد' }));
        }

        // 2. Fetch student performance from visits (collectionGroup)
        // Since students are ID'd in reports, we filter by studentId
        const visitDocs = await api.getCollectionGroupDocuments('reports');
        const myResults = [];
        let totalAttend = 0;
        let presentCount = 0;

        visitDocs.forEach(d => {
            const data = d.data();
            const record = data.studentsTracking?.find(s => s.studentId === actorId);
            if (record) {
                totalAttend++;
                if (record.isPresent) presentCount++;
                if (record.isTested) {
                    myResults.push({
                        date: data.timestamp?.split('T')[0],
                        subject: data.subjectName,
                        school: data.schoolName,
                        note: record.note
                    });
                }
            }
        });

        setStats(prev => ({
            ...prev,
            attendancePercent: totalAttend > 0 ? Math.round((presentCount / totalAttend) * 100) : 0,
            completedTests: myResults.length,
            recentResults: myResults.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
        }));

      } catch (err) {
        console.error('Error fetching student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [actorId]);

  if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        variant="hero"
        title={
          <>
            مرحباً يا{' '}
            <span style={{ color: 'var(--md-primary)' }}>{user?.displayName?.split(/\s+/)[0] || 'طالب'}</span>
          </>
        }
        subtitle={
          <>
            ملخص أدائك في مدرسة <strong style={{ color: 'var(--text-primary)' }}>{stats.schoolName}</strong>
          </>
        }
      />

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard title="نسبة الحضور" value={`${stats.attendancePercent}%`} icon={Calendar} color="var(--success-color)" subtext="انضباط ممتاز" />
        <StatCard title="الاختبارات المنجزة" value={stats.completedTests} icon={Award} color="#f59e0b" subtext="بانتظار التفوق" />
        <StatCard title="سجل المتابعة" value={stats.recentResults.length} icon={FileText} color="#3b82f6" subtext="تقييمات حديثة" />
        <StatCard title="الحالة الأكاديمية" value="منتظم" icon={TrendingUp} color="#8b5cf6" subtext="آفاق 2026" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Recent Results List */}
        <div className="surface-card surface-card--lg" style={{ padding: '2rem', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
             <Activity size={24} color="var(--accent-color)" />
             <h2 style={{ margin: 0, fontSize: '1.4rem' }}>أحدث تقييمات المشرفين</h2>
          </div>

          {stats.recentResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                لا توجد تقييمات مسجلة لك حتى الآن.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.recentResults.map((res, i) => (
                    <div key={i} style={{ 
                        padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-primary)' }}>
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>{res.subject}</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{res.date} • {res.school}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'var(--success-color)15', color: 'var(--success-color)', fontSize: '0.8rem', fontWeight: 700 }}>
                                {res.note || 'تم الاختبار بنجاح'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>

        {/* Small Progress / Tips Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)', padding: '2rem', borderRadius: '24px', color: '#fff', boxShadow: '0 15px 30px rgba(59, 130, 246, 0.3)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Lightbulb size={18} /> نصيحة اليوم</h3>
                <p style={{ marginTop: '1rem', opacity: 0.9, lineHeight: 1.6 }}>الاستمرار في الحضور اليومي والمراجعة المستمرة هو سر التفوق في حلقات آفاق التعليمية.</p>
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Rocket size={14} /> شعارنا: نتفكر في الآفاق</span>
                </div>
            </div>

            <div className="surface-card surface-card--lg" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>الخطة الحالية</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle size={16} color="var(--success-color)" /> مراجعة الجزء الثلاثون
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle size={16} color="var(--border-color)" /> اختبار القاعدة النورانية
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
