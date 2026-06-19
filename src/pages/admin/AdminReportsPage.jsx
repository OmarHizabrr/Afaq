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
  Printer,
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, reportMatchesScope } from '../../utils/permissionDataScope';
import { formatVisitRatingLabel } from '../../utils/visitRating';
import { isSchoolSupervisionReport, prepPeriodLabel, schoolReportViewPath, formatDailyLogSubjects, schoolReportSummaryLine } from '../../utils/reportLabels';
import { enrichDailyPrepReportsBatch } from '../../utils/enrichDailyPrepReport';
import useAppTranslation from '../../hooks/useAppTranslation';

const TAB_LABELS = {
  daily: t('config.appNavItems.التحضير', 'التحضير'),
  weekly: t('pages.AdminReportsPage.التقارير_الأسبوعية', 'التقارير الأسبوعية'),
  visits: t('pages.AdminReportsPage.زيارات_المشرفين', 'زيارات المشرفين'),
  school: t('pages.AdminReportsPage.تقارير_المدارس', 'تقارير المدارس'),
};

const PRESET_KEYS = [
  { key: 'week', label: t('pages.AdminReportsPage.أسبوع', 'أسبوع') },
  { key: 'month', label: t('pages.AdminReportsPage.شهر', 'شهر') },
  { key: 'quarter', label: t('pages.AdminReportsPage.3_أشهر', '3 أشهر') },
  { key: 'halfyear', label: t('pages.AdminReportsPage.6_أشهر', '6 أشهر') },
  { key: 'year', label: t('pages.AdminReportsPage.سنة', 'سنة') },
  { key: 'all', label: t('pages.AdminReportsPage.كل_الفترات', 'كل الفترات') },
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
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = perm;
  const [activeTab, setActiveTab] = useState('daily');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      else if (tab === 'visits' || tab === 'school') collectionName = 'reports';

      const docs = await api.getCollectionGroupDocuments(collectionName);
      let data = docs.map((d) => ({
        id: d.id,
        _ownerId: d.ref.parent.parent?.id || '',
        ...d.data(),
      }));

      if (tab === 'visits') {
        data = data.filter((r) => !isSchoolSupervisionReport(r));
      } else if (tab === 'school') {
        data = data.filter((r) => isSchoolSupervisionReport(r));
      }

      data.sort(
        (a, b) =>
          new Date(b.date || b.submissionDate || b.timestamp) -
          new Date(a.date || a.submissionDate || a.timestamp)
      );

      if (tab === 'daily') {
        data = await enrichDailyPrepReportsBatch(api, data);
      }

      setReports(data);
    } catch (err) {
      console.error(err);
      setError(t('pages.AdminReportsPage.حدث_خطأ_أثناء_جلب_التقارير', 'حدث خطأ أثناء جلب التقارير'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.reports) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchReports(activeTab);
  }, [activeTab, ready, membershipLoading, pageDataScope]);

  const filteredReports = useMemo(() => {
    const qName = searchTerm.trim();
    const qSchool = filterSchool.trim();
    const scope = pageDataScope(PERMISSION_PAGE_IDS.reports);
    const actorId = actorUser?.uid || actorUser?.id || '';

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
      if (ready && scope === DATA_SCOPE_MEMBERSHIP && membershipGroupIds.size > 0) {
        const enriched = {
          ...r,
          teacherId: r.teacherId || (activeTab === 'daily' || activeTab === 'weekly' ? r._ownerId : ''),
          supervisorId: r.supervisorId || (activeTab === 'visits' || activeTab === 'school' ? r._ownerId : r.supervisorId),
        };
        if (!reportMatchesScope(enriched, membershipGroupIds, actorId, scope)) return false;
      }
      const nameHay = r.teacherName || r.supervisorName || '';
      const schoolHay = r.schoolName || '';
      if (qName && !nameHay.includes(qName)) return false;
      if (qSchool && !schoolHay.includes(qSchool)) return false;
      return inRange(getReportTimeMs(r));
    });
  }, [
    reports,
    searchTerm,
    filterSchool,
    dateFrom,
    dateTo,
    datePreset,
    ready,
    activeTab,
    pageDataScope,
    membershipGroupIds,
    actorUser,
  ]);

  const deleteReportDocRef = (rpt) => {
    const api = FirestoreApi.Api;
    const oid = rpt._ownerId;
    if (!oid || !rpt.id) return null;
    if (activeTab === 'visits' || activeTab === 'school') return api.getSupervisorReportDoc(oid, rpt.id);
    if (activeTab === 'daily') return api.getTeacherDailyLogDoc(oid, rpt.id);
    if (activeTab === 'weekly') return api.getTeacherReportDoc(oid, rpt.id);
    return null;
  };

  const handleDeleteReportRow = async (rpt) => {
    if (!window.confirm('حذف هذا التقرير نهائياً؟ لا يمكن التراجع.')) return;
    const docRef = deleteReportDocRef(rpt);
    if (!docRef) {
      setError(t('pages.AdminReportsPage.تعذر_تحديد_مسار_المستند_للحذف', 'تعذر تحديد مسار المستند للحذف.'));
      return;
    }
    try {
      await FirestoreApi.Api.deleteData(docRef);
      await fetchReports(activeTab);
    } catch (err) {
      console.error(err);
      setError(t('pages.AdminReportsPage.فشل_حذف_التقرير', 'فشل حذف التقرير.'));
    }
  };

  const periodLabel =
    datePreset === 'all' ? t('pages.AdminReportsPage.كل_الفترات', 'كل الفترات') : dateFrom && dateTo ? `${dateFrom} ← ${dateTo}` : '—';

  return (
    <div className="admin-reports-page">
      <PageHeader
        className="no-print"
        icon={FileText}
        title={t('pages.AdminReportsPage.مراجعة_التقارير_الميدانية', 'مراجعة التقارير الميدانية')}
        subtitle={t('pages.AdminReportsPage.متابعة_أداء_المعلمين_والمشرفين_من_لوحة_واحدة', 'متابعة أداء المعلمين والمشرفين من لوحة واحدة')}
      />

      {ready && pageDataScope(PERMISSION_PAGE_IDS.reports) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info geo-page-alert no-print">
          عرض محدود: التقارير الظاهرة مرتبطة بمدارسك/مناطقك أو بأنشطتك كمعلم أو مشرف.
        </div>
      )}

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
          <Calendar size={18} className="admin-reports-tabs__btn-icon" /> التحضير
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('school')}
          className={`admin-reports-tabs__btn ${activeTab === 'school' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <FileText size={18} className="admin-reports-tabs__btn-icon" /> تقارير المدارس
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`admin-reports-tabs__btn ${activeTab === 'weekly' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <ClipboardList size={18} className="admin-reports-tabs__btn-icon" /> التقارير الأسبوعية
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('visits')}
          className={`admin-reports-tabs__btn ${activeTab === 'visits' ? 'admin-reports-tabs__btn--active' : ''}`}
        >
          <MapPin size={18} className="admin-reports-tabs__btn-icon" /> زيارات المشرفين
        </button>
      </div>

      <div className="surface-card admin-reports-filters no-print">
        <div className="admin-reports-filters__field">
          <input
            type="text"
            placeholder={t('pages.AdminReportsPage.البحث_باسم_المعلم_أو_المشرف', 'البحث باسم المعلم أو المشرف...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="app-input admin-reports-filters__input"
          />
          <Search size={18} className="admin-reports-filters__icon" />
        </div>
        <div className="admin-reports-filters__field">
          <input
            type="text"
            placeholder={t('pages.AdminReportsPage.فلترة_حسب_المدرسة', 'فلترة حسب المدرسة...')}
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="app-input admin-reports-filters__input"
          />
          <Filter size={18} className="admin-reports-filters__icon" />
        </div>
      </div>

      <div className="surface-card admin-reports-filters admin-reports-filters--dates no-print">
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
            className="google-btn google-btn--filled admin-reports-print-btn"
            onClick={() => window.print()}
          >
            <Printer size={18} /> طباعة القائمة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner page-loading-md"></div>
      ) : error ? (
        <div className="app-alert app-alert--error admin-reports-error">{error}</div>
      ) : reports.length === 0 ? (
        <div className="empty-state empty-state--lg">لا توجد تقارير في هذا القسم بعد.</div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-state empty-state--lg">لا توجد تقارير مطابقة للفترة أو الفلاتر الحالية.</div>
      ) : (
        <div className="admin-reports-list">
          {filteredReports.map((rpt) => {
            const openReport = () => {
              if (!can(PERMISSION_PAGE_IDS.reports, 'report_view')) return;
              const schoolPath = activeTab === 'school' ? schoolReportViewPath(rpt, { view: true }) : null;
              if (schoolPath) navigate(schoolPath);
              else navigate(`/reports/${rpt.id}`);
            };
            return (
            <div
              key={`${rpt._ownerId}-${rpt.id}`}
              className={`surface-card report-row-card${can(PERMISSION_PAGE_IDS.reports, 'report_view') ? ' report-row-card--clickable' : ''}`}
              onClick={openReport}
              onKeyDown={(e) => {
                if (can(PERMISSION_PAGE_IDS.reports, 'report_view') && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  openReport();
                }
              }}
              role={can(PERMISSION_PAGE_IDS.reports, 'report_view') ? 'button' : undefined}
              tabIndex={can(PERMISSION_PAGE_IDS.reports, 'report_view') ? 0 : undefined}
            >
              <div
                className={`report-row-card__accent report-row-card__accent--${
                  activeTab === 'school'
                    ? 'school'
                    : activeTab === 'visits'
                      ? 'visits'
                      : activeTab === 'weekly'
                        ? 'weekly'
                        : 'daily'
                }`}
              />

              <div className="admin-reports-list__meta-wrap">
                <div className="admin-reports-list__meta-block">
                  <p className="admin-reports-list__meta-label">{t('pages.SchoolReportPage.التاريخ', 'التاريخ')}</p>
                  <p className="admin-reports-list__meta-value">
                    {rpt.date || rpt.periodLabel || rpt.submissionDate?.split('T')[0] || rpt.timestamp?.split('T')[0]}
                    {activeTab === 'daily' && rpt.periodStart && rpt.periodEnd && rpt.periodStart !== rpt.periodEnd && (
                      <span className="admin-reports-list__meta-sub">
                        {rpt.periodStart} — {rpt.periodEnd}
                      </span>
                    )}
                  </p>
                </div>
                <div className="admin-reports-list__meta-block">
                  <p className="admin-reports-list__meta-label">
                    {activeTab === 'visits' || activeTab === 'school' ? t('pages.AdminReportsPage.المشرف', 'المشرف') : t('pages.AdminReportsPage.المعلم', 'المعلم')}
                  </p>
                  <p className="admin-reports-list__meta-value">
                    {rpt.supervisorName ||
                      rpt.teacherName ||
                      'ID: ' + (rpt.teacherId || rpt.supervisorId || '').substring(0, 8)}
                  </p>
                </div>
                {rpt.schoolName && (
                  <div className="admin-reports-list__meta-block">
                    <p className="admin-reports-list__meta-label">{t('components.DailyPrepEditor.المدرسة', 'المدرسة')}</p>
                    <p className="admin-reports-list__meta-value admin-reports-list__meta-value--medium">{rpt.schoolName}</p>
                  </div>
                )}
                <div className="admin-reports-list__meta-block">
                  <p className="admin-reports-list__meta-label">ملخص النشاط</p>
                  <p className="admin-reports-list__summary">
                    {activeTab === 'daily'
                      ? `${prepPeriodLabel(rpt.prepPeriod)} • ${rpt.attendanceSummary || `حضور ${rpt.totalPresent ?? '—'}/${rpt.totalStudents ?? '—'}`}${formatDailyLogSubjects(rpt) ? ` • ${formatDailyLogSubjects(rpt)}` : rpt.lessonName ? ` • ${rpt.lessonName}` : ''}${rpt.prepNotes ? ' • ملاحظات' : ''}`
                      : activeTab === 'weekly'
                        ? t('pages.AdminReportsPage.تقرير_أعمال_أسبوعي', 'تقرير أعمال أسبوعي')
                        : activeTab === 'school'
                          ? `${rpt.reportTitle || 'تقرير المدرسة'} • ${schoolReportSummaryLine(rpt)}`
                          : `تقييم الأداء: ${formatVisitRatingLabel(rpt.teacherRating)}`}
                  </p>
                </div>
              </div>
              <div className="admin-reports-list__actions no-print">
                {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const schoolPath = activeTab === 'school' ? schoolReportViewPath(rpt, { view: true }) : null;
                      if (schoolPath) navigate(schoolPath);
                      else navigate(`/reports/${rpt.id}`);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReportRow(rpt);
                    }}
                    title="حذف التقرير"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
