import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ChevronRight, FileDown, FileSpreadsheet, School, Users, FileText, MapPin, BookOpen, Printer } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
import { normalizeMuslimCategory, MUSLIM_CATEGORY_BORN } from '../../services/villageStudentEnrollment';
import { loadSchoolReportExport } from '../../utils/loadSchoolReportExport';
import { buildComprehensiveReportBodyHtml } from '../../utils/schoolReportHtml';
import LazyReportPrintPreviewModal from '../../components/LazyReportPrintPreviewModal';
import { formatDailyLogSubjects, schoolReportSummaryLine } from '../../utils/reportLabels';
import { normalizeSchoolReportForDisplay } from '../../utils/schoolReportStars';
import useAppTranslation from '../../hooks/useAppTranslation';

const SchoolComprehensiveReportPage = () => {
  const { t } = useAppTranslation();
  const { id: schoolId } = useParams();
  const navigate = useNavigate();
  const [pdfExporting, setPdfExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const [allSchools, allReports, allDaily, allNewMuslims, allVillages] = await Promise.all([
        api.getCollectionGroupDocuments('schools'),
        api.getCollectionGroupDocuments('reports'),
        api.getCollectionGroupDocuments('teacher_daily_logs'),
        api.getDocuments(api.getNewMuslimsCollection()),
        api.getCollectionGroupDocuments('villages'),
      ]);

      const schDoc = allSchools.find((s) => s.id === schoolId);
      if (!schDoc) return;
      const school = { id: schDoc.id, ...schDoc.data() };

      const villageDoc = allVillages.find((v) => v.id === school.villageId);
      const villageName = villageDoc?.data()?.villageName || school.villageName || '';

      const schoolReports = allReports
        .filter((r) => (r.data()?.schoolId || '') === schoolId && r.data()?.reportType === 'school_supervision')
        .map((r) => ({ id: r.id, ...r.data() }))
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

      const fieldVisits = allReports
        .filter((r) => (r.data()?.schoolId || '') === schoolId && r.data()?.reportType !== 'school_supervision')
        .map((r) => ({ id: r.id, ...r.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const dailyLogs = allDaily
        .filter((r) => (r.data()?.schoolId || '') === schoolId)
        .map((r) => ({ id: r.id, ...r.data() }))
        .sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));

      const villageConverts = allNewMuslims
        .filter((d) => (d.data()?.villageId || '') === school.villageId)
        .map((d) => d.data())
        .filter((m) => normalizeMuslimCategory(m.muslimCategory) !== MUSLIM_CATEGORY_BORN);

      setData({
        schoolName: school.name,
        villageName,
        schoolReports,
        fieldVisits,
        dailyLogs,
        newConvertsCount: villageConverts.length,
        newConverts: villageConverts,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="loading-spinner page-loading-lg" />;
  if (!data) return <div className="empty-state">{t('pages.SchoolComprehensiveReportPage.المدرسة_غير_موجودة', 'المدرسة غير موجودة')}</div>;

  const schoolScope = pageDataScope(PERMISSION_PAGE_IDS.schools);
  if (ready && !membershipLoading && schoolScope === DATA_SCOPE_MEMBERSHIP && schoolId && !membershipGroupIds.has(schoolId)) {
    return <Navigate to="/schools" replace />;
  }

  const exportData = {
    schoolName: data.schoolName,
    villageName: data.villageName,
    schoolReports: data.schoolReports.map(normalizeSchoolReportForDisplay),
    fieldVisits: data.fieldVisits,
    dailyLogs: data.dailyLogs,
    newConvertsCount: data.newConvertsCount,
  };

  return (
    <div className="comprehensive-report-page portal-page">
      <PageHeader
        topRow={
          <button type="button" className="page-nav-back" onClick={() => navigate(`/schools/${schoolId}`)}>
            <ChevronRight size={20} aria-hidden /> العودة لتفاصيل المدرسة
          </button>
        }
        title={t('pages.SchoolComprehensiveReportPage.تقرير_شامل_عن_المدرسة', 'تقرير شامل عن المدرسة')}
        subtitle={data.schoolName}
      >
        <div className="school-report-page__toolbar">
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => setPreviewOpen(true)}>
            <Printer size={16} />
            <span className="portal-toolbar__long">{t('pages.ReportDetailsPage.معاينة', 'معاينة')}</span>
            <span className="portal-toolbar__short">{t('pages.ReportDetailsPage.معاينة', 'معاينة')}</span>
          </button>
          <BusyButton
            type="button"
            className="google-btn google-btn--toolbar"
            busy={pdfExporting}
            onClick={async () => {
              setPdfExporting(true);
              try {
                const { exportComprehensivePdf } = await loadSchoolReportExport();
                await exportComprehensivePdf(exportData);
              } finally {
                setPdfExporting(false);
              }
            }}
          >
            <FileDown size={16} /> PDF
          </BusyButton>
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={async () => {
              const { exportComprehensiveExcel } = await loadSchoolReportExport();
              exportComprehensiveExcel(exportData);
            }}
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          {can(PERMISSION_PAGE_IDS.schools, 'school_report_create') && (
            <button type="button" className="google-btn google-btn--filled google-btn--toolbar" onClick={() => navigate(`/schools/${schoolId}/report`)}>
              <span className="portal-toolbar__long">{t('pages.SchoolComprehensiveReportPage.إضافة_تقرير_جديد', 'إضافة تقرير جديد')}</span>
              <span className="portal-toolbar__short">{t('pages.SchoolComprehensiveReportPage.تقرير_جديد', 'تقرير جديد')}</span>
            </button>
          )}
        </div>
      </PageHeader>

      <div className="comprehensive-report-stats">
        <div className="comprehensive-report-stat">
          <FileText size={22} color="var(--md-primary)" />
          <div>
            <p>{t('utils.schoolReportExport.تقارير_الإشراف', 'تقارير الإشراف')}</p>
            <h3>{data.schoolReports.length}</h3>
          </div>
        </div>
        <div className="comprehensive-report-stat">
          <MapPin size={22} color="#f59e0b" />
          <div>
            <p>{t('pages.SchoolComprehensiveReportPage.الزيارات_الميدانية', 'الزيارات الميدانية')}</p>
            <h3>{data.fieldVisits.length}</h3>
          </div>
        </div>
        <div className="comprehensive-report-stat">
          <BookOpen size={22} color="var(--success-color)" />
          <div>
            <p>{t('pages.SchoolComprehensiveReportPage.سجلات_التحضير', 'سجلات التحضير')}</p>
            <h3>{data.dailyLogs.length}</h3>
          </div>
        </div>
        <div className="comprehensive-report-stat">
          <Users size={22} color="#ec4899" />
          <div>
            <p>{t('pages.SchoolComprehensiveReportPage.المهتدون_الجدد_القرية', 'المهتدون الجدد (القرية)')}</p>
            <h3>{data.newConvertsCount}</h3>
          </div>
        </div>
      </div>

      <div className="comprehensive-report-grid">
        <section className="surface-card comprehensive-report-section">
          <h3><School size={18} /> {t('pages.SchoolComprehensiveReportPage.تقارير_إشراف_المدرسة', 'تقارير إشراف المدرسة')}</h3>
          {data.schoolReports.length === 0 ? (
            <p className="comprehensive-report-empty">{t('pages.SchoolComprehensiveReportPage.لا_توجد_تقارير_إشراف', 'لا توجد تقارير إشراف.')}</p>
          ) : (
            <div className="comprehensive-report-list">
              {data.schoolReports.map((r) => (
                <div key={r.id} className="comprehensive-report-row">
                  <div>
                    <strong>{r.reportTitle || t('pages.SchoolComprehensiveReportPage.تقرير_إشراف', 'تقرير إشراف')}</strong>
                    <p>{r.date || r.timestamp?.split('T')[0]} • {r.supervisorName} • {schoolReportSummaryLine(r)}</p>
                    {r.absenceReview && <span className="comprehensive-report-tag">مراجعة الغياب: {r.absenceReview}</span>}
                  </div>
                  <button type="button" className="google-btn" onClick={() => navigate(`/schools/${schoolId}/report/${r.id}?ownerId=${r.supervisorId || ''}`)}>
                    عرض
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card comprehensive-report-section">
          <h3><MapPin size={18} /> {t('pages.SchoolComprehensiveReportPage.الزيارات_الميدانية', 'الزيارات الميدانية')}</h3>
          {data.fieldVisits.length === 0 ? (
            <p className="comprehensive-report-empty">{t('pages.SchoolComprehensiveReportPage.لا_توجد_زيارات', 'لا توجد زيارات.')}</p>
          ) : (
            <div className="comprehensive-report-list">
              {data.fieldVisits.map((v) => (
                <div key={v.id} className="comprehensive-report-row">
                  <div>
                    <strong>{v.subjectName || t('pages.ReportDetailsPage.زيارة_ميدانية', 'زيارة ميدانية')}</strong>
                    <p>{v.timestamp?.split('T')[0]} • {v.supervisorName} {v.week ? `• أسبوع ${v.week}` : ''}</p>
                    {v.generalNotes && <p className="comprehensive-report-notes">{v.generalNotes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card comprehensive-report-section">
          <h3><BookOpen size={18} /> {t('pages.SchoolComprehensiveReportPage.سجلات_التحضير', 'سجلات التحضير')}</h3>
          {data.dailyLogs.length === 0 ? (
            <p className="comprehensive-report-empty">{t('pages.SchoolComprehensiveReportPage.لا_توجد_سجلات_تحضير', 'لا توجد سجلات تحضير.')}</p>
          ) : (
            <div className="comprehensive-report-list">
              {data.dailyLogs.map((l) => (
                <div key={l.id} className="comprehensive-report-row">
                  <div>
                    <strong>{l.subjectName || t('pages.SchoolComprehensiveReportPage.تحضير', 'تحضير')}</strong>
                    <p>
                      {l.date} • {l.prepPeriod === 'weekly' ? t('pages.SchoolComprehensiveReportPage.أسبوعي', 'أسبوعي') : l.prepPeriod === 'monthly' ? t('pages.SchoolComprehensiveReportPage.شهري', 'شهري') : t('pages.SchoolComprehensiveReportPage.يومي', 'يومي')}
                      {l.periodLabel ? ` (${l.periodLabel})` : ''}
                      {' '}• حاضرون {l.totalPresent}/{l.totalStudents}
                    </p>
                    {(formatDailyLogSubjects(l) || l.lessonName) && (
                      <span className="comprehensive-report-tag">{formatDailyLogSubjects(l) || l.lessonName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <LazyReportPrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('pages.SchoolComprehensiveReportPage.معاينة_التقرير_الشامل', 'معاينة التقرير الشامل')}
        bodyHtml={buildComprehensiveReportBodyHtml(exportData, t)}
        pdfExporting={pdfExporting}
        onDownloadPdf={async () => {
          setPdfExporting(true);
          try {
            const { exportComprehensivePdf } = await loadSchoolReportExport();
            await exportComprehensivePdf(exportData);
          } finally {
            setPdfExporting(false);
          }
        }}
        onDownloadExcel={async () => {
          const { exportComprehensiveExcel } = await loadSchoolReportExport();
          exportComprehensiveExcel(exportData);
        }}
      />
    </div>
  );
};

export default SchoolComprehensiveReportPage;
