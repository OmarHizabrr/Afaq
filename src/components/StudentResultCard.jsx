import React from 'react';
import { School, Calendar, CheckCircle2, XCircle } from 'lucide-react';

const StudentResultCard = ({ row }) => (
  <article className={`student-result-card${row.isPresent ? '' : ' student-result-card--absent'}`}>
    <header className="student-result-card__head">
      <div className="student-result-card__lead">
        <h3 className="student-result-card__school">
          <School size={15} aria-hidden />
          {row.schoolName}
        </h3>
        <p className="student-result-card__subject">{row.subjectName}</p>
      </div>
      <time className="student-result-card__date" dateTime={row.date || undefined}>
        <Calendar size={14} aria-hidden />
        {row.date ? new Date(row.date).toLocaleDateString('ar-EG') : '-'}
      </time>
    </header>

    <div className="student-result-card__meta">
      {row.isPresent ? (
        <span className="status-text--success">
          <CheckCircle2 size={14} aria-hidden /> حاضر
        </span>
      ) : (
        <span className="status-text--danger">
          <XCircle size={14} aria-hidden /> غائب
        </span>
      )}
      <span className={`student-result-card__test${row.isTested ? ' student-result-card__test--done' : ''}`}>
        {row.isTested ? 'تم الاختبار' : 'لم يتم'}
      </span>
    </div>

    {row.note ? <p className="student-result-card__note">{row.note}</p> : null}
  </article>
);

export default StudentResultCard;
