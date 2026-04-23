import React from 'react';
import { ShieldAlert } from 'lucide-react';
import useSiteContent from '../../context/useSiteContent';

function normalizeContactUrl(item, messageText = '') {
  const channel = String(item?.channel || '').toLowerCase();
  const raw = String(item?.value || '').trim();
  const encodedMessage = encodeURIComponent(messageText || 'السلام عليكم، أحتاج تفعيل الصلاحيات لحسابي.');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (channel === 'whatsapp') return `https://wa.me/${raw.replace(/[^\d]/g, '')}?text=${encodedMessage}`;
  if (channel === 'telegram') return `https://t.me/${raw.replace(/^@/, '')}?text=${encodedMessage}`;
  if (channel === 'email') return `mailto:${raw}?subject=${encodeURIComponent('طلب تفعيل الصلاحيات')}&body=${encodedMessage}`;
  if (channel === 'phone') return `tel:${raw}`;
  if (channel === 'instagram') return `https://instagram.com/${raw.replace(/^@/, '')}`;
  if (channel === 'facebook') return `https://facebook.com/${raw.replace(/^@/, '')}`;
  if (channel === 'x') return `https://x.com/${raw.replace(/^@/, '')}`;
  return raw;
}

export default function NoPermissionsPage() {
  const { contacts, contactsMessage } = useSiteContent();
  const list = (Array.isArray(contacts) ? contacts : []).filter((c) => c?.value);

  return (
    <div className="no-permissions-page">
      <div className="surface-card surface-card--lg no-permissions-card">
        <div className="no-permissions-card__icon">
          <ShieldAlert size={28} />
        </div>
        <h1 className="no-permissions-card__title">مرحباً بك</h1>
        <p className="no-permissions-card__text">
          لا توجد لديك أي صلاحية مفعّلة حالياً. يرجى طلب تحديد نوع الصلاحيات من الإدارة.
        </p>
        {contactsMessage && <p className="no-permissions-card__hint">{contactsMessage}</p>}

        {list.length > 0 && (
          <div className="no-permissions-card__contacts">
            <h3>التواصل مع الإدارة</h3>
            <div className="no-permissions-card__contacts-list">
              {list.map((item, idx) => {
                const href = normalizeContactUrl(item, contactsMessage);
                return (
                  <a
                    key={item.id || `${item.label}-${idx}`}
                    className="google-btn no-permissions-card__contact-btn"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{item.label || 'تواصل'}</span>
                    <span className="no-permissions-card__contact-meta">{item.channel || ''}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

