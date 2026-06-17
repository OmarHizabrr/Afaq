import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ChevronRight, User, Hash, School, Edit2, Trash2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import usePermissions from '../../context/usePermissions';
import { EXPLORATION_BRIDGE_ACTION_IDS } from '../../config/permissionRegistry';

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : '');

const TeacherStudentDetailPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { explorationBridgeAllowed } = usePermissions();
  const actorId = user?.uid || user?.id;
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [activeSchoolId, setActiveSchoolId] = useState('');
  const [pendingDelete, setPendingDelete] = useState(false);
  const [viewingExploration, setViewingExploration] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id || !actorId) return;
      setLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const ids = await api.listUserSchoolIdsFromMirrors(user);
        if (!ids.length) {
          setStudent(null);
          return;
        }
        const key = teacherSchoolStorageKey(actorId);
        let sid = (key && localStorage.getItem(key)) || ids[0];
        if (!ids.includes(sid)) sid = ids[0];

        const doc = await api.getData(api.getSchoolStudentDoc(sid, id));
        if (!doc) {
          setStudent(null);
          return;
        }

        const allSchools = await api.getCollectionGroupDocuments('schools');
        const schoolDoc = allSchools.find((s) => s.id === sid);

        setActiveSchoolId(sid);
        setSchoolName((schoolDoc?.data()?.name || '').trim() || sid);
        setStudent({ id, ...doc });
      } catch (err) {
        console.error(err);
        setError('تعذر تحميل بيانات الدارس.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, actorId, user]);

  const handleDelete = async () => {
    if (!activeSchoolId || !id) return;
    try {
      const api = FirestoreApi.Api;
      await Promise.all([
        api.deleteData(api.getSchoolStudentDoc(activeSchoolId, id)),
        api.deleteData(api.getGroupMemberDoc(activeSchoolId, id)),
        api.deleteData(api.getUserMembershipMirrorDoc(id, activeSchoolId)),
      ]);
      navigate('/teacher/students', { replace: true });
    } catch (err) {
      console.error(err);
      setError('تعذر حذف الدارس.');
    }
  };

  if (loading) return <div className="loading-spinner page-loading-lg" />;
  if (!student) return <Navigate to="/teacher/students" replace />;

  const showExploration = explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view);

  return (
    <div className="portal-page teacher-student-detail-page">
      <PageHeader
        topRow={(
          <div className="teacher-student-detail-page__top-row">
            <button type="button" className="page-nav-back" onClick={() => navigate('/teacher/students')}>
              <ChevronRight size={20} aria-hidden /> طلابي
            </button>
          </div>
        )}
        title={<>ملف الدارس: <span className="page-header-accent--success">{student.studentName}</span></>}
        subtitle={schoolName ? `المدرسة: ${schoolName}` : undefined}
      >
        <button
          type="button"
          className="google-btn google-btn--toolbar"
          onClick={() => navigate('/teacher/students', { state: { editStudent: student } })}
        >
          <Edit2 size={18} />
          <span className="portal-toolbar__long">تعديل البيانات</span>
          <span className="portal-toolbar__short">تعديل</span>
        </button>
      </PageHeader>

      {error && <div className="app-alert app-alert--error portal-page-alert">{error}</div>}

      <div className="surface-card surface-card--lg user-details-profile-card teacher-student-detail-page__card">
        <div className="teacher-student-avatar teacher-student-avatar--lg">
          {(student.studentName || '?').charAt(0)}
        </div>
        <h2 className="user-details-profile-card__name">{student.studentName}</h2>
        <span className="user-details-profile-card__role">دارس</span>

        <div className="user-details-profile-card__meta">
          <div className="user-details-profile-card__meta-row">
            <User size={16} aria-hidden /> {student.studentName}
          </div>
          <div className="user-details-profile-card__meta-row">
            <Hash size={16} aria-hidden /> السن: {student.age || '—'}
          </div>
          {schoolName ? (
            <div className="user-details-profile-card__meta-row">
              <School size={16} aria-hidden /> {schoolName}
            </div>
          ) : null}
        </div>

        {showExploration && student.explorationTypeId ? (
          <div className="teacher-student-detail-page__exploration">
            <ExplorationBadge record={student} onClick={() => setViewingExploration(true)} />
          </div>
        ) : null}

        <div className="teacher-student-detail-page__actions">
          <button
            type="button"
            className="google-btn google-btn--filled google-btn--success"
            onClick={() => navigate('/teacher/students', { state: { editStudent: student } })}
          >
            <Edit2 size={16} /> تعديل
          </button>
          <button
            type="button"
            className="google-btn"
            onClick={() => setPendingDelete(true)}
          >
            <Trash2 size={16} color="var(--danger-color)" /> حذف
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete}
        title="تأكيد حذف الدارس"
        message={`سيتم حذف «${student.studentName}» من السجل.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(false)}
        onConfirm={async () => {
          setPendingDelete(false);
          await handleDelete();
        }}
      />

      <ExplorationDataModal
        open={viewingExploration}
        onClose={() => setViewingExploration(false)}
        title={`بيانات النموذج — ${student.studentName || ''}`}
        record={student}
        actorUser={user}
        storageUserId={actorId}
        canEdit={explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)}
        fallbackName={student.studentName}
        onSave={async ({ fieldValues, derivedName, selectedType, controller }) => {
          const api = FirestoreApi.Api;
          const nextName = derivedName || student.studentName || '';
          const ageRaw = controller.getValueByType('number');
          const data = {
            studentName: nextName,
            age: ageRaw === '' ? (student.age || 0) : (parseInt(ageRaw, 10) || 0),
            schoolId: activeSchoolId,
            teacherId: actorId,
            explorationTypeId: selectedType?.id || student.explorationTypeId || '',
            explorationTypeName: selectedType?.name || student.explorationTypeName || '',
            explorationFieldValues: fieldValues,
          };
          await Promise.all([
            api.updateData({
              docRef: api.getSchoolStudentDoc(activeSchoolId, student.id),
              data,
              userData: user || {},
            }),
            api.setData({
              docRef: api.getGroupMemberDoc(activeSchoolId, student.id),
              data: { ...data, id: student.id, type: 'student' },
              userData: user || {},
            }),
            api.setData({
              docRef: api.getUserMembershipMirrorDoc(student.id, activeSchoolId),
              data: { schoolId: activeSchoolId, studentName: nextName },
              userData: user || {},
            }),
          ]);
          setStudent((prev) => ({ ...prev, ...data }));
          setViewingExploration(false);
        }}
      />
    </div>
  );
};

export default TeacherStudentDetailPage;
