import React, { useEffect, useMemo, useState } from 'react';
import { FileText, School, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import StudentResultCard from '../../components/StudentResultCard';

const StudentResultsPage = ({ user }) => {
  const { t } = useAppTranslation();
  const actorId = user?.uid || user?.id;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!actorId) return;
      setLoading(true);
      try {
        const api = FirestoreApi.Api;
        const reportDocs = await api.getCollectionGroupDocuments('reports');
        const data = [];

        reportDocs.forEach((doc) => {
          const report = doc.data() || {};
          const hit = Array.isArray(report.studentsTracking)
            ? report.studentsTracking.find((s) => s.studentId === actorId)
            : null;
          if (!hit) return;
          data.push({
            id: doc.id,
            schoolName: report.schoolName || t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد'),
            subjectName: report.subjectName || t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد'),
            date: report.timestamp || '',
            isPresent: !!hit.isPresent,
            isTested: !!hit.isTested,
            note: hit.note || '',
          });
        });

        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRows(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [actorId]);

  const schools = useMemo(() => Array.from(new Set(rows.map((r) => r.schoolName))), [rows]);
  const filtered = useMemo(
    () => rows.filter((r) => !schoolFilter || r.schoolName === schoolFilter),
    [rows, schoolFilter]
  );

  if (loading) return <div className="loading-spinner page-loading-lg" />;

  return (
    <div className="portal-page portal-page--results student-results-page">
      <PageHeader icon={FileText} title={t('pages.StudentResultsPage.نتائجي_واختباراتي', 'نتائجي واختباراتي')} subtitle={t('pages.StudentResultsPage.عرض_جميع_نتائج_الزيارات_والتقييمات_الخاصة_بك', 'عرض جميع نتائج الزيارات والتقييمات الخاصة بك')} />

      <div className="surface-card portal-filter-card">
        <label className="app-label">تصفية حسب المدرسة</label>
        <AppSelect className="app-select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
          <option value="">كل المدارس</option>
          {schools.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </AppSelect>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">لا توجد نتائج مسجلة لك حتى الآن.</div>
      ) : (
        <>
          <div className="surface-card portal-table-wrap student-results-desktop-only">
            <div className="md-table-scroll">
              <table className="md-table portal-table--wide">
                <thead>
                  <tr>
                    <th>{t('components.DailyPrepEditor.المدرسة', 'المدرسة')}</th>
                    <th>{t('utils.reportDetailsHtml.المادة', 'المادة')}</th>
                    <th>{t('pages.SchoolReportPage.التاريخ', 'التاريخ')}</th>
                    <th>{t('utils.schoolReportExport.الحضور', 'الحضور')}</th>
                    <th>الاختبار</th>
                    <th>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.id}-${r.date}`}>
                      <td><School size={14} className="table-cell-icon" /> {r.schoolName}</td>
                      <td>{r.subjectName}</td>
                      <td><Calendar size={14} className="table-cell-icon" /> {r.date ? new Date(r.date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td>
                        {r.isPresent ? (
                          <span className="status-text--success"><CheckCircle2 size={14} /> {t('components.SupervisorVisitStudentCard.حاضر', 'حاضر')}</span>
                        ) : (
                          <span className="status-text--danger"><XCircle size={14} /> {t('pages.StudentDetailsPage.غائب', 'غائب')}</span>
                        )}
                      </td>
                      <td>{r.isTested ? t('components.StudentResultCard.تم_الاختبار', 'تم الاختبار') : t('components.StudentResultCard.لم_يتم', 'لم يتم')}</td>
                      <td className="cell-muted">{r.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="student-results-mobile-only">
            {filtered.map((r) => (
              <StudentResultCard key={`${r.id}-${r.date}`} row={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentResultsPage;
