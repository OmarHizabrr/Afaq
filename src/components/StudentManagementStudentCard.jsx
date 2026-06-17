import React from 'react';
import { Activity, Eye, Edit2 } from 'lucide-react';
import ExplorationBadge from './ExplorationBadge';
import { EXPLORATION_BRIDGE_ACTION_IDS } from '../config/permissionRegistry';

const StudentManagementStudentCard = ({
  student,
  canView,
  canEdit,
  explorationBridgeAllowed,
  onView,
  onEdit,
  onExplorationView,
}) => (
  <article className="student-mgmt-card">
    <div className="student-mgmt-card__head">
      <img
        src={student.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.displayName || '')}`}
        alt=""
        className="student-mgmt-card__avatar"
      />
      <div className="student-mgmt-card__identity">
        <h3 className="student-mgmt-card__name">{student.displayName || 'بدون اسم'}</h3>
        <p className="student-mgmt-card__email">{student.email || 'بدون بريد'}</p>
      </div>
    </div>

    {explorationBridgeAllowed?.(EXPLORATION_BRIDGE_ACTION_IDS.view) ? (
      <div className="student-mgmt-card__badge">
        <ExplorationBadge record={student} onClick={() => onExplorationView(student)} />
      </div>
    ) : null}

    <dl className="student-mgmt-card__meta">
      <div>
        <dt>الارتباطات</dt>
        <dd>{student.membershipText || 'غير مرتبط بأي مجموعة'}</dd>
      </div>
      <div>
        <dt>التحركات</dt>
        <dd>
          <span className="student-management-activity-chip">
            <Activity size={14} /> {student.activityCount}
          </span>
        </dd>
      </div>
      <div>
        <dt>آخر حركة</dt>
        <dd>{student.lastActivity ? new Date(student.lastActivity).toLocaleDateString('ar-EG') : 'لا يوجد'}</dd>
      </div>
    </dl>

    <div className="student-mgmt-card__actions">
      {canView ? (
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => onView(student.id)}>
          <Eye size={16} /> الملف
        </button>
      ) : null}
      {canEdit ? (
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => onEdit(student)}>
          <Edit2 size={16} /> تعديل
        </button>
      ) : null}
    </div>
  </article>
);

export default StudentManagementStudentCard;
