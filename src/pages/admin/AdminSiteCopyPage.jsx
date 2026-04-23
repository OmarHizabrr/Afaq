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

  const valueOf = (key) => (Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : (strings?.[key] || ''));

  const saveOne = async (key) => {
    setSavingKey(key);
    try {
      await saveStrings(user, { [key]: valueOf(key) });
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
      <div className="surface-card" style={{ padding: '1rem', display: 'grid', gap: '0.9rem' }}>
        {COPY_KEYS.map((item) => (
          <div key={item.key} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{item.label}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>{item.key}</div>
            <textarea
              rows={2}
              value={valueOf(item.key)}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))}
              style={{ width: '100%' }}
            />
            <button
              type="button"
              className="google-btn"
              style={{ marginTop: '0.5rem' }}
              onClick={() => saveOne(item.key)}
              disabled={savingKey !== '' && savingKey !== item.key}
            >
              {savingKey === item.key ? 'جاري الحفظ...' : 'حفظ النص'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

