import React from 'react';
import { User, Phone, Mail, School } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const StudentProfilePage = ({ user }) => {
  const displayName = user?.displayName || 'طالب';
  const photoURL =
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a73e8&color=fff`;

  return (
    <div className="portal-page student-profile-page">
      <PageHeader icon={User} title="ملفي الشخصي" subtitle="بيانات حسابك في المنصة" />

      <div className="surface-card surface-card--lg user-details-profile-card student-profile-page__card">
        <img src={photoURL} alt="" className="user-details-profile-card__avatar" />
        <h2 className="user-details-profile-card__name">{displayName}</h2>
        <span className="user-details-profile-card__role">طالب / دارس</span>
        <div className="user-details-profile-card__meta">
          <div className="user-details-profile-card__meta-row">
            <User size={16} aria-hidden /> {displayName}
          </div>
          <div className="user-details-profile-card__meta-row">
            <Phone size={16} aria-hidden /> {user?.phoneNumber || 'لا يوجد رقم'}
          </div>
          <div className="user-details-profile-card__meta-row">
            <Mail size={16} aria-hidden /> {user?.email || 'لا يوجد بريد'}
          </div>
          {user?.schoolId ? (
            <div className="user-details-profile-card__meta-row">
              <School size={16} aria-hidden /> مدرسة: {user.schoolId}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
