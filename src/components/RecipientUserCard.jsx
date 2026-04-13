import React from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

function avatarSrc(u) {
  if (u?.photoURL) return u.photoURL;
  const n = encodeURIComponent(u?.displayName || u?.email || u?.id || '?');
  return `https://ui-avatars.com/api/?name=${n}&background=1a73e8&color=fff`;
}

const RecipientUserCard = ({ user: u, checked, onToggle, profileHref, roleLabel }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`recipient-user-card ${checked ? 'recipient-user-card--selected' : ''}`}
      onClick={() => onToggle(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onToggle(e.target.checked);
        }}
        className="recipient-user-card__check"
        aria-label="تحديد"
      />
      <img className="recipient-user-card__avatar" src={avatarSrc(u)} alt="" />
      <div className="recipient-user-card__body">
        <div className="recipient-user-card__name">{u.displayName || u.email || u.id}</div>
        <div className="recipient-user-card__meta">
          {u.email && <span className="recipient-user-card__email">{u.email}</span>}
          <span className="recipient-user-card__role">{roleLabel || u.role || ''}</span>
          {u.phoneNumber && <span className="recipient-user-card__phone">{u.phoneNumber}</span>}
        </div>
      </div>
      {profileHref ? (
        <Link
          to={profileHref}
          className="recipient-user-card__profile"
          title="الملف الشخصي"
          aria-label="عرض الملف الشخصي"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye size={20} />
        </Link>
      ) : (
        <span className="recipient-user-card__profile recipient-user-card__profile--disabled" title="غير متاح">
          <Eye size={20} />
        </span>
      )}
    </div>
  );
};

export default RecipientUserCard;
