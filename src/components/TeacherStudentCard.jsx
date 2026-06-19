import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import ExplorationBadge from './ExplorationBadge';
import useAppTranslation from '../hooks/useAppTranslation';


const TeacherStudentCard = ({
  student,
  showExplorationBadge,
  onView,
  onEdit,
  onDelete,
  onExplorationView,
}) => {
  const { t } = useAppTranslation();

  return (
    <article className="teacher-student-card">
      <div className="teacher-student-card__head">
        <div className="teacher-student-avatar" aria-hidden>
          {(student.studentName || '?').charAt(0)}
        </div>
        <div className="teacher-student-card__identity">
          <h3 className="teacher-student-card__name">{student.studentName}</h3>
          <p className="teacher-student-card__age">
            {t('components.TeacherStudentCard.السن', 'السن')}: {student.age || '—'}
          </p>
        </div>
      </div>

      {showExplorationBadge ? (
        <div className="teacher-student-card__badge">
          <ExplorationBadge record={student} onClick={() => onExplorationView(student)} />
        </div>
      ) : null}

      <div className="teacher-student-card__actions">
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => onView(student.id)}>
          <Eye size={16} /> {t('components.TeacherStudentCard.الملف', 'الملف')}
        </button>
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => onEdit(student)}>
          <Edit2 size={16} /> {t('components.ExplorationListCard.تعديل', 'تعديل')}
        </button>
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => onDelete(student)}>
          <Trash2 size={16} color="var(--danger-color)" /> {t('components.ExplorationListCard.حذف', 'حذف')}
        </button>
      </div>
    </article>
  );
};

export default TeacherStudentCard;
