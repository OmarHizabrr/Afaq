import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import useSiteContent from '../../context/useSiteContent';
import { saveStrings } from '../../services/siteConfigService';

const COPY_KEYS = [
  { key: 'layout.nav_dashboard', label: 'عنوان: الرئيسية' },
  { key: 'layout.nav_users', label: 'عنوان: المستخدمين' },
  { key: 'layout.nav_notifications', label: 'عنوان: الإشعارات' },
  { key: 'layout.nav_settings', label: 'عنوان: الإعدادات' },
  { key: 'dashboard.subtitle', label: 'وصف: لوحة التحكم' },
];

export default function AdminSiteCopyPage({ user }) {
  const { strings } = useSiteContent();
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });

  const valueOf = (key) => (Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : (strings?.[key] || ''));

  const saveOne = async (key) => {
    setStatus({ type: '', text: '' });
    setSavingKey(key);
    try {
      await saveStrings(user, { [key]: valueOf(key) });
      setStatus({ type: 'success', text: 'تم حفظ النص بنجاح.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'تعذر حفظ النص حالياً.' });
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div>
      <PageHeader
        title="النصوص الثابتة"
        subtitle="عدّل النصوص الثابتة للواجهة بدون تغيير الكود."
        icon={FileText}
      />
      <div className="surface-card admin-site-copy-card">
        {status.text && (
          <div className={`app-alert ${status.type === 'success' ? 'app-alert--success' : 'app-alert--error'} admin-settings-alert`}>
            {status.text}
          </div>
        )}
        {COPY_KEYS.map((item) => (
          <div key={item.key} className="admin-site-copy-item">
            <div className="admin-site-copy-item__title">{item.label}</div>
            <div className="admin-site-copy-item__key">{item.key}</div>
            <textarea
              rows={2}
              value={valueOf(item.key)}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))}
              className="app-textarea"
            />
            <button
              type="button"
              className="google-btn google-btn--filled admin-site-copy-item__save-btn"
              onClick={() => saveOne(item.key)}
              disabled={savingKey !== '' && savingKey !== item.key}
            >
              {savingKey === item.key && <span className="btn-loading-spinner" aria-hidden />}
              <span>{savingKey === item.key ? 'جاري حفظ النص...' : 'حفظ النص'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

