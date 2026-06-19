import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import useAppTranslation from '../hooks/useAppTranslation';

const SupervisorVisitStudentCard = ({ record, onTrackingChange }) => {
  const { t } = useAppTranslation();
  return (
  <article
    className={`visit-student-card${record.isPresent ? '' : ' visit-student-card--absent'}${record.isTested ? ' visit-student-card--tested' : ''}`}
  >
    <header className="visit-student-card__head">
      <button
        type="button"
        onClick={() => onTrackingChange(record.studentId, 'isPresent', !record.isPresent)}
        className="visit-student-card__presence"
        title={record.isPresent ? t('components.SupervisorVisitStudentCard.تعديل_لغائب', 'تعديل لغائب') : t('components.SupervisorVisitStudentCard.حاضر', 'حاضر')}
        aria-label={record.isPresent ? t('components.SupervisorVisitStudentCard.حاضر_اضغط_للغياب', 'حاضر — اضغط للغياب') : t('components.SupervisorVisitStudentCard.غائب_اضغط_للحضور', 'غائب — اضغط للحضور')}
      >
        {record.isPresent ? (
          <CheckCircle size={24} color="var(--success-color)" />
        ) : (
          <XCircle size={24} color="var(--danger-color)" />
        )}
      </button>

      <span className={`visit-student-card__name${record.isPresent ? '' : ' visit-student-card__name--absent'}`}>
        {record.name}
      </span>

      <button
        type="button"
        onClick={() => onTrackingChange(record.studentId, 'isTested', !record.isTested)}
        disabled={!record.isPresent}
        className={`visit-test-chip visit-student-card__test${record.isTested ? ' visit-test-chip--active' : ''}${!record.isPresent ? ' visit-test-chip--disabled' : ''}`}
      >
        {record.isTested ? t('components.SupervisorVisitStudentCard.اختُبر', 'اختُبر') : t('components.SupervisorVisitStudentCard.اختبار', 'اختبار')}
      </button>
    </header>

    <label className="visit-student-card__note">
      <span>{t('components.SupervisorVisitStudentCard.ملاحظة_التقييم', 'ملاحظة التقييم')}</span>
      <input
        type="text"
        placeholder={t('components.SupervisorVisitStudentCard.ملاحظات_قراءته', 'ملاحظات قراءته...')}
        value={record.note}
        onChange={(e) => onTrackingChange(record.studentId, 'note', e.target.value)}
        disabled={!record.isPresent || !record.isTested}
        className={`app-input visit-note-input${record.isPresent && record.isTested ? '' : ' visit-note-input--disabled'}`}
      />
    </label>
  </article>
);

};

export default SupervisorVisitStudentCard;
