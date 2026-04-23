import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, MapPin, Eye, Calendar, User, School as SchoolIcon, Search, Filter, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import MapLocationOpen from '../../components/MapLocationOpen';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
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
      const data = docs.map((d) => ({
        id: d.id,
        _ownerId: d.ref.parent.parent?.id || '',
        ...d.data()
      }));
      
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

  const deleteReportDocRef = (rpt) => {
    const api = FirestoreApi.Api;
    const oid = rpt._ownerId;
    if (!oid || !rpt.id) return null;
    if (activeTab === 'visits') return api.getSupervisorReportDoc(oid, rpt.id);
    if (activeTab === 'daily') return api.getTeacherDailyLogDoc(oid, rpt.id);
    if (activeTab === 'weekly') return api.getTeacherReportDoc(oid, rpt.id);
    return null;
  };

  const handleDeleteReportRow = async (rpt) => {
    if (!window.confirm('حذف هذا التقرير نهائياً؟ لا يمكن التراجع.')) return;
    const docRef = deleteReportDocRef(rpt);
    if (!docRef) {
      setError('تعذر تحديد مسار المستند للحذف.');
      return;
    }
    try {
      await FirestoreApi.Api.deleteData(docRef);
      await fetchReports(activeTab);
    } catch (err) {
      console.error(err);
      setError('فشل حذف التقرير.');
    }
  };

  const renderStatus = (val) => {
      if (val === true || val === 'isActive') return <span style={{ color: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} /> منجز</span>;
      return <span style={{ color: 'var(--danger-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><XCircle size={14} /> لم ينجز</span>;
  };

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="مراجعة التقارير الميدانية"
        subtitle="متابعة أداء المعلمين والمشرفين من لوحة واحدة"
      />

      {/* Tabs */}
      <div className="admin-reports-tabs">
        <button 
          onClick={() => setActiveTab('daily')} 
          className={`admin-reports-tabs__btn ${activeTab === 'daily' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <Calendar size={18} style={{ marginLeft: '6px' }} /> التحضير اليومي
        </button>
        <button 
          onClick={() => setActiveTab('weekly')} 
          className={`admin-reports-tabs__btn ${activeTab === 'weekly' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <ClipboardList size={18} style={{ marginLeft: '6px' }} /> التقارير الأسبوعية
        </button>
        <button 
          onClick={() => setActiveTab('visits')} 
          className={`admin-reports-tabs__btn ${activeTab === 'visits' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <MapPin size={18} style={{ marginLeft: '6px' }} /> زيارات المشرفين
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="surface-card admin-reports-filters">
        <div className="admin-reports-filters__field">
          <input 
            type="text" 
            placeholder="البحث باسم المعلم أو المشرف..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="app-input admin-reports-filters__input"
          />
          <Search size={18} className="admin-reports-filters__icon" />
        </div>
        <div className="admin-reports-filters__field">
          <input 
            type="text" 
            placeholder="فلترة حسب المدرسة..." 
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="app-input admin-reports-filters__input"
          />
          <Filter size={18} className="admin-reports-filters__icon" />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>
      ) : error ? (
        <div className="app-alert app-alert--error admin-reports-error">{error}</div>
      ) : reports.length === 0 ? (
        <div className="empty-state empty-state--lg">لا توجد تقارير في هذا القسم بعد.</div>
      ) : (
        <div className="admin-reports-list">
          {reports
            .filter(r => (r.teacherName || r.supervisorName || '').includes(searchTerm) && (r.schoolName || '').includes(filterSchool))
            .map((rpt) => (
            <div key={rpt.id} className="surface-card report-row-card">
              <div className="report-row-card__accent" style={{ background: activeTab === 'visits' ? 'var(--md-primary)' : activeTab === 'weekly' ? 'var(--md-primary)' : 'var(--success-color)' }} />
              
              <div className="admin-reports-list__meta-wrap">
                <div className="admin-reports-list__meta-block">
                  <p className="admin-reports-list__meta-label">التاريخ</p>
                  <p className="admin-reports-list__meta-value">{rpt.date || rpt.submissionDate?.split('T')[0] || rpt.timestamp?.split('T')[0]}</p>
                </div>
                <div className="admin-reports-list__meta-block">
                    <p className="admin-reports-list__meta-label">{activeTab === 'visits' ? 'المشرف' : 'المعلم'}</p>
                    <p className="admin-reports-list__meta-value">{rpt.supervisorName || rpt.teacherName || 'ID: ' + (rpt.teacherId || rpt.supervisorId || '').substring(0,8)}</p>
                </div>
                {rpt.schoolName && (
                  <div className="admin-reports-list__meta-block">
                    <p className="admin-reports-list__meta-label">المدرسة</p>
                    <p className="admin-reports-list__meta-value admin-reports-list__meta-value--medium">{rpt.schoolName}</p>
                  </div>
                )}
                <div className="admin-reports-list__meta-block">
                    <p className="admin-reports-list__meta-label">ملخص النشاط</p>
                    <p className="admin-reports-list__summary">
                        {activeTab === 'daily' ? `الحضور: ${rpt.totalPresent}/${rpt.totalStudents}` :
                         activeTab === 'weekly' ? 'تقرير أعمال أسبوعي' :
                         `تقييم الأداء: ${rpt.teacherRating}/10`}
                    </p>
                </div>
              </div>
              <div className="admin-reports-list__actions">
                {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                  <button
                    type="button"
                    onClick={() => navigate(`/reports/${rpt.id}`)}
                    title="عرض التفاصيل الكاملة"
                    className="icon-btn admin-reports-list__view-btn"
                  >
                    <Eye size={22} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.reports, 'report_delete') && (
                  <button
                    type="button"
                    className="icon-btn admin-reports-list__delete-btn"
                    onClick={() => handleDeleteReportRow(rpt)}
                    title="حذف التقرير"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report View Modal (Overlay) */}
      {selectedReport && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setSelectedReport(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedReport(null)} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>إغلاق (X)</button>
            <h2 style={{ marginBottom: '1.5rem' }}>تفاصيل التقرير</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div><strong>المعرف:</strong> {selectedReport.teacherId || selectedReport.supervisorId}</div>
                <div><strong>المدرسة:</strong> {selectedReport.schoolName || 'مدرسة غير محددة'}</div>
                <div><strong>المادة:</strong> {selectedReport.subjectName || '-'}</div>
                <div><strong>الأسبوع:</strong> {selectedReport.week || '-'}</div>
            </div>

            {activeTab === 'daily' && (
                <div className="md-table-scroll">
                <table className="md-table" style={{ minWidth: 'unset' }}>
                    <thead><tr><th>الطالب</th><th>حفظ</th><th>مراجعة</th></tr></thead>
                    <tbody>
                        {selectedReport.records?.map(r => (
                            <tr key={r.studentId} className={!r.isPresent ? 'md-table__row--absent' : ''}>
                                <td>{r.name} {!r.isPresent && '(غائب)'}</td>
                                <td>{r.memorization}</td>
                                <td>{r.review}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
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
                        <MapLocationOpen
                          gpsLocation={selectedReport.gpsLocation}
                          label="الموقع الجغرافي (GPS)"
                          subtitle="غير متوفر"
                        />
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
