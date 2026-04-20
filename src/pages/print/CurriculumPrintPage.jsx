import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import FirestoreApi from '../../services/firestoreApi';
import PrintDocumentShell from '../../components/PrintDocumentShell';

function normalizeWeeks(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return Array.from({ length: 50 }, (_, i) => ({ week: i + 1, lesson: '' }));
  }
  if (raw.length >= 50) {
    return raw.map((w, i) => ({
      week: typeof w.week === 'number' ? w.week : i + 1,
      lesson: w.lesson ?? '',
    }));
  }
  const byWeek = raw.reduce((acc, w) => {
    const n = typeof w.week === 'number' ? w.week : 0;
    if (n >= 1 && n <= 50) acc[n] = w.lesson ?? '';
    return acc;
  }, {});
  return Array.from({ length: 50 }, (_, i) => ({
    week: i + 1,
    lesson: byWeek[i + 1] ?? '',
  }));
}

export default function CurriculumPrintPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoPrint = location.state?.autoPrint === true;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState(null);

  const weeks = useMemo(() => normalizeWeeks(subject?.weeks), [subject]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!subjectId) {
        setError('معرّف المادة غير صالح');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const data = await api.getData(api.getCurriculumDoc(subjectId));
        if (cancelled) return;
        if (!data) {
          setSubject(null);
          setError('المادة غير موجودة');
        } else {
          setSubject({ id: subjectId, ...data });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('تعذر تحميل المنهج');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  useEffect(() => {
    if (loading || error || !subject || !autoPrint) return undefined;
    const id = window.requestAnimationFrame(() => {
      window.print();
    });
    return () => window.cancelAnimationFrame(id);
  }, [loading, error, subject, autoPrint]);

  const printedAt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date());
    } catch {
      return new Date().toLocaleString('ar-SA');
    }
  }, []);

  const handleBack = () => {
    navigate('/curriculum');
  };

  if (loading) {
    return (
      <div className="print-shell print-shell--plain">
        <div className="loading-spinner" style={{ margin: '4rem auto', width: 48, height: 48 }} />
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="print-shell print-shell--plain">
        <div className="surface-card" style={{ maxWidth: 480, margin: '3rem auto', padding: '2rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{error || 'لا توجد بيانات'}</p>
          <button type="button" className="google-btn google-btn--filled" onClick={handleBack}>
            العودة إلى المناهج
          </button>
        </div>
      </div>
    );
  }

  return (
    <PrintDocumentShell
      documentTitle={subject.name}
      subtitle="خطة التوزيع الأسبوعي — خمسون أسبوعاً"
      metaLines={[`تاريخ إصدار العرض: ${printedAt}`, `معرّف المادة: ${subject.id}`]}
      onBack={handleBack}
    >
      <table className="print-table print-table--curriculum">
        <thead>
          <tr>
            <th scope="col" className="print-table__col-week">
              الأسبوع
            </th>
            <th scope="col">الدرس / الهدف التعليمي</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week} className="print-table__row-week">
              <td className="print-table__cell-week">{w.week}</td>
              <td className="print-table__cell-lesson">{w.lesson?.trim() ? w.lesson : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintDocumentShell>
  );
}
