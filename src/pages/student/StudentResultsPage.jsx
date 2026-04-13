import React, { useEffect, useMemo, useState } from 'react';
import { FileText, School, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const StudentResultsPage = ({ user }) => {
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
            schoolName: report.schoolName || 'غير محدد',
            subjectName: report.subjectName || 'غير محدد',
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

  if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <PageHeader icon={FileText} title="نتائجي واختباراتي" subtitle="عرض جميع نتائج الزيارات والتقييمات الخاصة بك" />

      <div className="surface-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <label className="app-label">تصفية حسب المدرسة</label>
        <select className="app-select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
          <option value="">كل المدارس</option>
          {schools.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">لا توجد نتائج مسجلة لك حتى الآن.</div>
      ) : (
        <div className="surface-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="md-table-scroll">
            <table className="md-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>المدرسة</th>
                  <th>المادة</th>
                  <th>التاريخ</th>
                  <th>الحضور</th>
                  <th>الاختبار</th>
                  <th>ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.id}-${r.date}`}>
                    <td><School size={14} style={{ marginLeft: 6 }} /> {r.schoolName}</td>
                    <td>{r.subjectName}</td>
                    <td><Calendar size={14} style={{ marginLeft: 6 }} /> {r.date ? new Date(r.date).toLocaleDateString('ar-EG') : '-'}</td>
                    <td>{r.isPresent ? <span style={{ color: 'var(--success-color)' }}><CheckCircle2 size={14} /> حاضر</span> : <span style={{ color: 'var(--danger-color)' }}><XCircle size={14} /> غائب</span>}</td>
                    <td>{r.isTested ? 'تم الاختبار' : 'لم يتم'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResultsPage;
