import { useNavigate } from 'react-router-dom';
import { Users, Map, School, FileText, UserCheck, Home, Activity, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div style={{
    background: 'var(--panel-color)',
    padding: '1.5rem',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    boxShadow: 'var(--shadow)',
    transition: 'transform 0.2s',
    cursor: 'default'
  }}>
    <div style={{
      width: '65px',
      height: '65px',
      borderRadius: '16px',
      background: `linear-gradient(135deg, ${color}20, ${color}40)`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 8px 16px -4px ${color}30`
    }}>
      <Icon size={34} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{title}</p>
      <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
        {loading ? '...' : value}
      </h3>
    </div>
  </div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    supervisors: 0,
    villages: 0,
    regions: 0,
    schools: 0,
    teachers: 0,
    students: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const api = FirestoreApi.Api;
        
        const [usersDocs, regionsDocs, villagesDocs, schoolsDocs, studentsDocs] = await Promise.all([
          api.getDocuments(api.getCollection('users')),
          api.getCollectionGroupDocuments('regions'),
          api.getCollectionGroupDocuments('villages'),
          api.getCollectionGroupDocuments('schools'),
          api.getCollectionGroupDocuments('students')
        ]);

        const users = usersDocs.map(d => d.data());
        
        setStats({
          villages: villagesDocs.length,
          supervisors: users.filter(u => u.role?.startsWith('supervisor')).length,
          teachers: users.filter(u => u.role === 'teacher').length,
          regions: regionsDocs.length,
          schools: schoolsDocs.length,
          students: studentsDocs.length
        });

        // 2. Fetch Recent Activities (Visits & Daily Logs)
        const [visitDocs, logsDocs] = await Promise.all([
            api.getCollectionGroupDocuments('reports'),
            api.getCollectionGroupDocuments('teacher_daily_logs')
        ]);

        const activities = [
            ...visitDocs.map(d => ({ id: d.id, type: 'visit', ...d.data() })),
            ...logsDocs.map(d => ({ id: d.id, type: 'daily', ...d.data() }))
        ];

        // Sort by timestamp/date descending
        activities.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
        setRecentActivity(activities.slice(0, 6)); // Top 6

      } catch (err) {
        console.error("Dashboard stats error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>لوحة التحكم الرئيسية</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>نظرة عامة على الإحصائيات الحيوية للمنصة</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard title="المشرفين" value={stats.supervisors} icon={Users} color="#10b981" loading={loading} />
        <StatCard title="القرى" value={stats.villages} icon={Home} color="#ec4899" loading={loading} />
        <StatCard title="المناطق" value={stats.regions} icon={Map} color="#3b82f6" loading={loading} />
        <StatCard title="المدارس" value={stats.schools} icon={School} color="#f59e0b" loading={loading} />
        <StatCard title="المدرسين" value={stats.teachers} icon={FileText} color="#8b5cf6" loading={loading} />
        <StatCard title="إجمالي الطلاب" value={stats.students} icon={UserCheck} color="var(--success-color)" loading={loading} />
      </div>

      {/* Recent Activity Section */}
      <div style={{
        background: 'var(--panel-color)',
        padding: '2rem',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <Activity size={24} color="var(--accent-color)" />
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>أحدث النشاطات الميدانية</h2>
        </div>

        {loading ? (
            <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
        ) : recentActivity.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد نشاطات مسجلة مؤخراً.</p>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {recentActivity.map((act) => (
                    <div key={act.id} style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative'
                    }}>
                        <div style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            background: act.type === 'visit' ? '#3b82f620' : 'var(--success-color)20',
                            color: act.type === 'visit' ? '#3b82f6' : 'var(--success-color)',
                            width: 'fit-content',
                            fontWeight: 700
                        }}>
                            {act.type === 'visit' ? 'زيارة ميدانية' : 'تحضير يومي'}
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{act.schoolName || 'مدرسة غير محددة'}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                           بواسطة: {act.supervisorName || act.teacherName || 'عضو غير معروف'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                           <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              📅 {act.date || act.timestamp?.split('T')[0]}
                           </p>
                           <button onClick={() => navigate(`/admin/reports/${act.id}`)} className="icon-btn" title="عرض التفاصيل">
                              <Eye size={16} color="var(--accent-color)" />
                           </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
