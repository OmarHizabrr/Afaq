import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const SupervisorVisitStudentCard = ({ record, onTrackingChange }) => (
  <article
    className={`visit-student-card${record.isPresent ? '' : ' visit-student-card--absent'}${record.isTested ? ' visit-student-card--tested' : ''}`}
  >
    <header className="visit-student-card__head">
      <button
        type="button"
        onClick={() => onTrackingChange(record.studentId, 'isPresent', !record.isPresent)}
        className="visit-student-card__presence"
        title={record.isPresent ? 'تعديل لغائب' : 'حاضر'}
        aria-label={record.isPresent ? 'حاضر — اضغط للغياب' : 'غائب — اضغط للحضور'}
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
        {record.isTested ? 'اختُبر' : 'اختبار'}
      </button>
    </header>

    <label className="visit-student-card__note">
      <span>ملاحظة التقييم</span>
      <input
        type="text"
        placeholder="ملاحظات قراءته..."
        value={record.note}
        onChange={(e) => onTrackingChange(record.studentId, 'note', e.target.value)}
        disabled={!record.isPresent || !record.isTested}
        className={`app-input visit-note-input${record.isPresent && record.isTested ? '' : ' visit-note-input--disabled'}`}
      />
    </label>
  </article>
);

export default SupervisorVisitStudentCard;
