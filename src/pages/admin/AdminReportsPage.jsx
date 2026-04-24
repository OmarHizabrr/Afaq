import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ClipboardList,
  MapPin,
  Eye,
  Calendar,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  Printer,
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import MapLocationOpen from '../../components/MapLocationOpen';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { formatVisitRatingLabel } from '../../utils/visitRating';

const TAB_LABELS = {
  daily: 'التحضير اليومي',
  weekly: 'التقارير الأسبوعية',
  visits: 'زيارات المشرفين',
};

const PRESET_KEYS = [
  { key: 'week', label: 'أسبوع' },
  { key: 'month', label: 'شهر' },
  { key: 'quarter', label: '3 أشهر' },
  { key: 'halfyear', label: '6 أشهر' },
  { key: 'year', label: 'سنة' },
  { key: 'all', label: 'كل الفترات' },
];

const PRESET_DAYS = {
  week: 7,
  month: 30,
  quarter: 90,
  halfyear: 180,
  year: 365,
};

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdToLocalStartMs(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function ymdToLocalEndMs(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function getReportTimeMs(r) {
  const raw = r.date || r.submissionDate || r.timestamp;
  if (raw == null || raw === '') return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('daily');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchool, setFilterSchool] = useState('');

  const [datePreset, setDatePreset] = useState('month');
  const [dateFrom, setDateFrom] = useState(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    return toYMD(start);
  });
  const [dateTo, setDateTo] = useState(() => toYMD(new Date()));

  const applyPreset = useCallback((key) => {
    if (key === 'all') {
      setDateFrom('');
      setDateTo('');
      setDatePreset('all');
      return;
    }
    const days = PRESET_DAYS[key];
    if (!days) return;
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    setDateFrom(toYMD(start));
    setDateTo(toYMD(end));
    setDatePreset(key);
  }, []);

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
        ...d.data(),
      }));

      data.sort(
        (a, b) =>
          new Date(b.date || b.submissionDate || b.timestamp) -
          new Date(a.date || a.submissionDate || a.timestamp)
      );

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

  const filteredReports = useMemo(() => {
    const qName = searchTerm.trim();
    const qSchool = filterSchool.trim();

    const inRange = (t) => {
      if (datePreset === 'all') return true;
      if (t == null) return false;
      const fromMs = dateFrom ? ymdToLocalStartMs(dateFrom) : null;
      const toMs = dateTo ? ymdToLocalEndMs(dateTo) : null;
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      return true;
    };

    return reports.filter((r) => {
      const nameHay = r.teacherName || r.supervisorName || '';
      const schoolHay = r.schoolName || '';
      if (qName && !nameHay.includes(qName)) return false;
      if (qSchool && !schoolHay.includes(qSchool)) return false;
      return inRange(getReportTimeMs(r));
    });
  }, [reports, searchTerm, filterSchool, dateFrom, dateTo, datePreset]);

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
    if (val === true || val === 'isActive')
      return (
        <span style={{ color: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} /> منجز
        </span>
      );
    return (
      <span style={{ color: 'var(--danger-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <XCircle size={14} /> لم ينجز
      </span>
    );
  };

  const periodLabel =
    datePreset === 'all' ? 'كل الفترات' : dateFrom && dateTo ? `${dateFrom} ← ${dateTo}` : '—';

  return (
    <div className="admin-reports-page">
      <PageHeader
        className="no-print"
        icon={FileText}
        title="مراجعة التقارير الميدانية"
        subtitle="متابعة أداء المعلمين والمشرفين من لوحة واحدة"
      />

      <div className="admin-reports-print-header print-only">
        <h1>مراجعة التقارير — {TAB_LABELS[activeTab]}</h1>
        <p>الفترة: {periodLabel}</p>
        <p>عدد السجلات المعروضة: {filteredReports.length}</p>
        <p>تاريخ الطباعة: {new Date().toLocaleString('ar-SA', { hour12: true })}</p>
      </div>

      <div className="admin-reports-tabs no-print">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`admin-reports-tabs__btn ${activeTab === 'daily' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <Calendar size={18} style={{ marginLeft: '6px' }} /> التحضير اليومي
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`admin-reports-tabs__btn ${activeTab === 'weekly' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <ClipboardList size={18} style={{ marginLeft: '6px' }} /> التقارير الأسبوعية
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('visits')}
          className={`admin-reports-tabs__btn ${activeTab === 'visits' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <MapPin size={18} style={{ marginLeft: '6px' }} /> زيارات المشرفين
        </button>
      </div>

      <div className="surface-card admin-reports-filters no-print">
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

      <div className="surface-card admin-reports-filters no-print" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className="admin-reports-filters__row--dates">
          <div className="admin-reports-preset-chips">
            <span className="admin-reports-preset-chips__label">فترة جاهزة:</span>
            {PRESET_KEYS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`admin-reports-preset-chip ${datePreset === key ? 'admin-reports-preset-chip--active' : ''}`}
                onClick={() => applyPreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="admin-reports-filters__date-field">
            <span className="app-label">من تاريخ</span>
            <input
              type="date"
              className="app-input"
              value={dateFrom}
              disabled={datePreset === 'all'}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset('custom');
              }}
            />
          </div>
          <div className="admin-reports-filters__date-field">
            <span className="app-label">إلى تاريخ</span>
            <input
              type="date"
              className="app-input"
              value={dateTo}
              disabled={datePreset === 'all'}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset('custom');
              }}
            />
          </div>
          <button
            type="button"
            className="google-btn google-btn--filled"
            style={{ marginInlineStart: 'auto', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={() => window.print()}
          >
            <Printer size={18} /> طباعة القائمة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>
      ) : error ? (
        <div className="app-alert app-alert--error admin-reports-error">{error}</div>
      ) : reports.length === 0 ? (
        <div className="empty-state empty-state--lg">لا توجد تقارير في هذا القسم بعد.</div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-state empty-state--lg">لا توجد تقارير مطابقة للفترة أو الفلاتر الحالية.</div>
      ) : (
        <div className="admin-reports-list">
          {filteredReports.map((rpt) => (
            <div key={`${rpt._ownerId}-${rpt.id}`} className="surface-card report-row-card">
              <div
                className="report-row-card__accent"
                style={{
                  background:
                    activeTab === 'visits'
                      ? 'var(--md-primary)'
                      : activeTab === 'weekly'
                        ? 'var(--md-primary)'
                        : 'var(--success-color)',
                }}
              />

              <div className="admin-reports-list__meta-wrap">
                <div className="admin-reports-list__meta-block">
                  <p className="admin-reports-list__meta-label">التاريخ</p>
                  <p className="admin-reports-list__meta-value">
                    {rpt.date || rpt.submissionDate?.split('T')[0] || rpt.timestamp?.split('T')[0]}
                  </p>
                </div>
                <div className="admin-reports-list__meta-block">
                  <p className="admin-reports-list__meta-label">{activeTab === 'visits' ? 'المشرف' : 'المعلم'}</p>
                  <p className="admin-reports-list__meta-value">
                    {rpt.supervisorName ||
                      rpt.teacherName ||
                      'ID: ' + (rpt.teacherId || rpt.supervisorId || '').substring(0, 8)}
                  </p>
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
                    {activeTab === 'daily'
                      ? `الحضور: ${rpt.totalPresent}/${rpt.totalStudents}`
                      : activeTab === 'weekly'
                        ? 'تقرير أعمال أسبوعي'
                        : `تقييم الأداء: ${formatVisitRatingLabel(rpt.teacherRating)}`}
                  </p>
                </div>
              </div>
              <div className="admin-reports-list__actions no-print">
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

      {selectedReport && (
        <div
          className="modal-overlay no-print"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setSelectedReport(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                left: '1.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              إغلاق (X)
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>تفاصيل التقرير</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <strong>المعرف:</strong> {selectedReport.teacherId || selectedReport.supervisorId}
              </div>
              <div>
                <strong>المدرسة:</strong> {selectedReport.schoolName || 'مدرسة غير محددة'}
              </div>
              <div>
                <strong>المادة:</strong> {selectedReport.subjectName || '-'}
              </div>
              <div>
                <strong>الأسبوع:</strong> {selectedReport.week || '-'}
              </div>
            </div>

            {activeTab === 'daily' && (
              <div className="md-table-scroll">
                <table className="md-table" style={{ minWidth: 'unset' }}>
                  <thead>
                    <tr>
                      <th>الطالب</th>
                      <th>حفظ</th>
                      <th>مراجعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.records?.map((r) => (
                      <tr key={r.studentId} className={!r.isPresent ? 'md-table__row--absent' : ''}>
                        <td>
                          {r.name} {!r.isPresent && '(غائب)'}
                        </td>
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
                {selectedReport.reportData &&
                  Object.entries(selectedReport.reportData).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: 'var(--bg-color)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>{key}</strong>
                        {renderStatus(val.isActive)}
                      </div>
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
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{formatVisitRatingLabel(selectedReport.teacherRating)}</p>
                  </div>
                  <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تقييم القرية</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{formatVisitRatingLabel(selectedReport.villageRating)}</p>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <MapLocationOpen gpsLocation={selectedReport.gpsLocation} label="الموقع الجغرافي (GPS)" subtitle="غير متوفر" />
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
