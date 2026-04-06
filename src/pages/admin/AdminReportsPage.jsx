import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, MapPin, Eye, Calendar, User, School as SchoolIcon, Search, Filter } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'weekly', 'visits'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchool, setFilterSchool] = useState('');

  const fetchReports = async (tab) => {
    setLoading(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      let collectionName = '';
      if (tab === 'daily') collectionName = 'teacher_daily_logs';
      else if (tab === 'weekly') collectionName = 'teacher_reports';
      else if (tab === 'visits') collectionName = 'reports';

      const docs = await api.getCollectionGroupDocuments(collectionName);
      const data = docs.map(d => ({ id: d.id, ...d.data() }));
      
      data.sort((a, b) => new Date(b.date || b.submissionDate || b.timestamp) - new Date(a.date || a.submissionDate || a.timestamp));
      
      setReports(data);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب التقارير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(activeTab);
  }, [activeTab]);

  const renderStatus = (val) => {
      if (val === true || val === 'isActive') return <span style={{ color: 'var(--success-color)' }}>✅ منجز</span>;
      return <span style={{ color: 'var(--danger-color)' }}>❌ لم ينجز</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={28} color="var(--accent-color)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>مراجعة التقارير الميدانية</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>متابعة أداء المعلمين والمشرفين من لوحة واحدة</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('daily')} 
          style={{ 
            background: 'transparent', border: 'none', padding: '10px 20px', cursor: 'pointer',
            color: activeTab === 'daily' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'daily' ? 'bold' : 'normal',
            borderBottom: activeTab === 'daily' ? '3px solid var(--accent-color)' : 'none'
          }}
        >
          <Calendar size={18} style={{ marginLeft: '6px' }} /> التحضير اليومي
        </button>
        <button 
          onClick={() => setActiveTab('weekly')} 
          style={{ 
            background: 'transparent', border: 'none', padding: '10px 20px', cursor: 'pointer',
            color: activeTab === 'weekly' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'weekly' ? 'bold' : 'normal',
            borderBottom: activeTab === 'weekly' ? '3px solid var(--accent-color)' : 'none'
          }}
        >
          <ClipboardList size={18} style={{ marginLeft: '6px' }} /> التقارير الأسبوعية
        </button>
        <button 
          onClick={() => setActiveTab('visits')} 
          style={{ 
            background: 'transparent', border: 'none', padding: '10px 20px', cursor: 'pointer',
            color: activeTab === 'visits' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'visits' ? 'bold' : 'normal',
            borderBottom: activeTab === 'visits' ? '3px solid var(--accent-color)' : 'none'
          }}
        >
          <MapPin size={18} style={{ marginLeft: '6px' }} /> زيارات المشرفين
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        background: 'var(--panel-color)', 
        padding: '1rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color)',
        alignItems: 'center',
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="البحث باسم المعلم أو المشرف..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
                width: '100%', 
                padding: '12px 12px 12px 40px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-color)', 
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
            }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="فلترة حسب المدرسة..." 
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            style={{ 
                width: '100%', 
                padding: '12px 12px 12px 40px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-color)', 
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
            }}
          />
          <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>
      ) : error ? (
        <div style={{ color: 'var(--danger-color)', textAlign: 'center' }}>{error}</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>لا توجد تقارير في هذا القسم بعد.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          {reports
            .filter(r => (r.teacherName || r.supervisorName || '').includes(searchTerm) && (r.schoolName || '').includes(filterSchool))
            .map((rpt) => (
            <div key={rpt.id} style={{ 
              background: 'var(--panel-color)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color)',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              boxShadow: 'var(--shadow)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', background: activeTab === 'visits' ? '#3b82f6' : activeTab === 'weekly' ? 'var(--accent-color)' : 'var(--success-color)' }}></div>
              
              <div style={{ display: 'flex', gap: '2rem', flex: 1, flexWrap: 'wrap', marginRight: '1rem' }}>
                <div style={{ minWidth: '130px' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>التاريخ</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>{rpt.date || rpt.submissionDate?.split('T')[0] || rpt.timestamp?.split('T')[0]}</p>
                </div>
                <div style={{ minWidth: '150px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeTab === 'visits' ? 'المشرف' : 'المعلم'}</p>
                    <p style={{ margin: 0, fontWeight: 700 }}>{rpt.supervisorName || rpt.teacherName || 'ID: ' + (rpt.teacherId || rpt.supervisorId || '').substring(0,8)}</p>
                </div>
                {rpt.schoolName && (
                  <div style={{ minWidth: '150px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>المدرسة</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{rpt.schoolName}</p>
                  </div>
                )}
                <div style={{ minWidth: '160px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ملخص النشاط</p>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        {activeTab === 'daily' ? `الحضور: ${rpt.totalPresent}/${rpt.totalStudents}` :
                         activeTab === 'weekly' ? 'تقرير أعمال أسبوعي' :
                         `تقييم الأداء: ${rpt.teacherRating}/10`}
                    </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => navigate(`/admin/reports/${rpt.id}`)} title="عرض التفاصيل الكاملة" style={{ background: 'var(--bg-color)', color: 'var(--accent-color)', width: '44px', height: '44px', borderRadius: '12px' }}>
                <Eye size={22} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Report View Modal (Overlay) */}
      {selectedReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedReport(null)}>
          <div style={{ background: 'var(--panel-color)', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedReport(null)} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>إغلاق (X)</button>
            <h2 style={{ marginBottom: '1.5rem' }}>تفاصيل التقرير</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div><strong>المعرف:</strong> {selectedReport.teacherId || selectedReport.supervisorId}</div>
                <div><strong>المدرسة:</strong> {selectedReport.schoolName || 'مدرسة غير محددة'}</div>
                <div><strong>المادة:</strong> {selectedReport.subjectName || '-'}</div>
                <div><strong>الأسبوع:</strong> {selectedReport.week || '-'}</div>
            </div>

            {activeTab === 'daily' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--bg-color)' }}><th style={{ padding: '8px' }}>الطالب</th><th>حفظ</th><th>مراجعة</th></tr></thead>
                    <tbody>
                        {selectedReport.records?.map(r => (
                            <tr key={r.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px' }}>{r.name} {!r.isPresent && '(غائب)'}</td>
                                <td>{r.memorization}</td>
                                <td>{r.review}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {activeTab === 'weekly' && (
                <div>
                    {selectedReport.reportData && Object.entries(selectedReport.reportData).map(([key, val]) => (
                        <div key={key} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>{key}</strong>{renderStatus(val.isActive)}</div>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{val.details || 'لا توجد ملاحظات إضافية'}</p>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'visits' && (
                <div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تقييم المدرس</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{selectedReport.teacherRating}/10</p>
                        </div>
                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تقييم القرية</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{selectedReport.villageRating}/10</p>
                        </div>
                     </div>
                     <div style={{ marginBottom: '1.5rem' }}>
                        <strong>الموقع الجغرافي (GPS):</strong>
                        {selectedReport.gpsLocation ? <p>{selectedReport.gpsLocation.lat}, {selectedReport.gpsLocation.lng}</p> : <p>غير متوفر</p>}
                     </div>
                     <strong>ملاحظات المشرف:</strong>
                     <p style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', minHeight: '60px' }}>{selectedReport.generalNotes}</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
