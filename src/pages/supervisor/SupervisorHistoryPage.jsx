import { useNavigate } from 'react-router-dom';
import { History, Eye, MapPin, Calendar, Star } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const SupervisorHistoryPage = ({ user }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyReports = async () => {
      setLoading(true);
      try {
        const api = FirestoreApi.Api;
        // Fetch specifically from this supervisor's subcollection
        const ref = api.getSubCollection('reports', user.id, 'reports');
        const docs = await api.getDocuments(ref);
        const data = docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort descending by timestamp
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setReports(data);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب سجل زياراتك');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchMyReports();
  }, [user]);

  if (loading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
        <History size={28} color="#3b82f6" />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>سجل زياراتي الميدانية</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>مراجعة التقارير والتقييمات التي قمت برفعها سابقاً</p>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--panel-color)', borderRadius: '16px' }}>
          لا توجد زيارات مسجلة باسمك حتى الآن. ابدأ بأول زيارة من شاشة "تسجيل زيارة ميدانية".
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {reports.map((rpt) => (
            <div key={rpt.id} style={{ 
              background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)',
              position: 'relative', boxShadow: 'var(--shadow)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> {rpt.timestamp?.split('T')[0]}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  <Star size={14} inline style={{ marginBottom: '-2px' }} /> {rpt.teacherRating}/10
                </span>
              </div>
              
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{rpt.schoolName}</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {rpt.subjectName} - أسبوع {rpt.week}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {rpt.mediaUrls?.length || 0} مرفقات
                 </div>
                 <button 
                  className="icon-btn" 
                  onClick={() => navigate(`/supervisor/reports/${rpt.id}`)}
                  style={{ background: '#3b82f6', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
                >
                  <Eye size={16} style={{ marginLeft: '4px' }} /> عرض التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default SupervisorHistoryPage;
