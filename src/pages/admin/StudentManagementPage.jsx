import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Search, Activity, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const StudentManagementPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    const fetchStudentsData = async () => {
      setLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const [userDocs, schoolDocs, regionDocs, reportDocs] = await Promise.all([
          api.getDocuments(api.getUsersCollection()),
          api.getCollectionGroupDocuments('schools'),
          api.getCollectionGroupDocuments('regions'),
          api.getCollectionGroupDocuments('reports'),
        ]);

        const schoolsMap = Object.fromEntries(schoolDocs.map((d) => [d.id, d.data()?.name || d.id]));
        const regionsMap = Object.fromEntries(regionDocs.map((d) => [d.id, d.data()?.name || d.id]));
        const reports = reportDocs.map((d) => d.data() || {});

        const studentUsers = userDocs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === 'student');

        const rows = [];
        for (const student of studentUsers) {
          const mirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(student.id));
          const memberships = mirrors.map((m) => {
            const data = m.data() || {};
            return {
              schoolId: data.schoolId || '',
              schoolName: data.schoolId ? schoolsMap[data.schoolId] || data.schoolId : '',
              regionId: data.regionId || '',
              regionName: data.regionId ? regionsMap[data.regionId] || data.regionId : '',
            };
          });

          const studentActivity = reports.filter((r) =>
            Array.isArray(r.studentsTracking) && r.studentsTracking.some((s) => s.studentId === student.id)
          );
          const latest = studentActivity
            .map((r) => r.timestamp || '')
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0] || '';

          rows.push({
            ...student,
            memberships,
            membershipText: memberships
              .map((m) => (m.schoolName ? `مدرسة: ${m.schoolName}` : m.regionName ? `منطقة: ${m.regionName}` : ''))
              .filter(Boolean)
              .join('، '),
            activityCount: studentActivity.length,
            lastActivity: latest,
          });
        }

        setStudents(rows);
      } catch (err) {
        console.error(err);
        setError('تعذر تحميل بيانات إدارة الطلاب.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsData();
  }, []);

  const schoolOptions = useMemo(() => {
    const setVals = new Set();
    students.forEach((s) => s.memberships.forEach((m) => m.schoolName && setVals.add(m.schoolName)));
    return Array.from(setVals).sort();
  }, [students]);

  const regionOptions = useMemo(() => {
    const setVals = new Set();
    students.forEach((s) => s.memberships.forEach((m) => m.regionName && setVals.add(m.regionName)));
    return Array.from(setVals).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchQuery =
        !q ||
        s.displayName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.membershipText?.toLowerCase().includes(q);
      const matchSchool = !schoolFilter || s.memberships.some((m) => m.schoolName === schoolFilter);
      const matchRegion = !regionFilter || s.memberships.some((m) => m.regionName === regionFilter);
      return matchQuery && matchSchool && matchRegion;
    });
  }, [students, query, schoolFilter, regionFilter]);

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title="إدارة الطلاب"
        subtitle="عرض الارتباطات والتحركات لكل طالب بنمط عضويات المجموعات"
      />

      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="surface-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div className="app-form-row">
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', right: 12, top: 13, color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="app-input"
              style={{ paddingRight: 34 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو الارتباط..."
            />
          </div>
          <select className="app-select" style={{ minWidth: '180px' }} value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
            <option value="">كل المدارس</option>
            {schoolOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="app-select" style={{ minWidth: '180px' }} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">كل المناطق</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">لا يوجد طلاب مطابقون للفلاتر الحالية.</div>
      ) : (
        <div className="surface-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="md-table-scroll">
            <table className="md-table" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الارتباطات</th>
                  <th>عدد التحركات</th>
                  <th>آخر حركة</th>
                  <th style={{ textAlign: 'center' }}>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={s.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.displayName || '')}`}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.displayName || 'بدون اسم'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.email || 'بدون بريد'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {s.membershipText || 'غير مرتبط بأي مجموعة'}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={14} /> {s.activityCount}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('ar-EG') : 'لا يوجد'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {can(PERMISSION_PAGE_IDS.students_management, 'student_management_view_profile') && (
                        <button className="icon-btn" onClick={() => navigate(`/users/${s.id}`)} title="عرض ملف الطالب">
                          <Eye size={17} color="var(--accent-color)" />
                        </button>
                      )}
                    </td>
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

export default StudentManagementPage;
