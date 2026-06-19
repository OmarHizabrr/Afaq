import React, { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import useSiteContent from '../../context/useSiteContent';
import { saveStrings } from '../../services/siteConfigService';
import BusyButton from '../../components/BusyButton';
import useAppTranslation from '../../hooks/useAppTranslation';

const getCopyKeys = (t) => [
  { key: 'layout.nav_dashboard', label: t('pages.AdminSiteCopyPage.عنوان_الرئيسية', 'عنوان: الرئيسية') },
  { key: 'layout.nav_users', label: t('pages.AdminSiteCopyPage.عنوان_المستخدمين', 'عنوان: المستخدمين') },
  { key: 'layout.nav_notifications', label: t('pages.AdminSiteCopyPage.عنوان_الإشعارات', 'عنوان: الإشعارات') },
  { key: 'layout.nav_settings', label: t('pages.AdminSiteCopyPage.عنوان_الإعدادات', 'عنوان: الإعدادات') },
  { key: 'dashboard.subtitle', label: t('pages.AdminSiteCopyPage.وصف_لوحة_التحكم', 'وصف: لوحة التحكم') },
];

export default function AdminSiteCopyPage({ user }) {
  const { t } = useAppTranslation();
  const copyKeys = useMemo(() => getCopyKeys(t), [t]);
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
      setStatus({ type: 'success', text: t('pages.AdminSiteCopyPage.تم_حفظ_النص_بنجاح', 'تم حفظ النص بنجاح.') });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: t('pages.AdminSiteCopyPage.تعذر_حفظ_النص_حالياً', 'تعذر حفظ النص حالياً.') });
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="admin-site-copy-page">
      <PageHeader
        title={t('config.appNavItems.النصوص_الثابتة', 'النصوص الثابتة')}
        subtitle={t('pages.AdminSiteCopyPage.عدّل_النصوص_الثابتة_للواجهة_بدون_تغيير_الكود', 'عدّل النصوص الثابتة للواجهة بدون تغيير الكود.')}
        icon={FileText}
      />
      <div className="surface-card admin-site-copy-card">
        {status.text && (
          <div className={`app-alert ${status.type === 'success' ? 'app-alert--success' : 'app-alert--error'} admin-settings-alert`}>
            {status.text}
          </div>
        )}
        {copyKeys.map((item) => (
          <div key={item.key} className="admin-site-copy-item">
            <div className="admin-site-copy-item__title">{item.label}</div>
            <div className="admin-site-copy-item__key">{item.key}</div>
            <textarea
              rows={2}
              value={valueOf(item.key)}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))}
              className="app-textarea"
            />
            <BusyButton
              type="button"
              className="google-btn google-btn--filled admin-site-copy-item__save-btn"
              onClick={() => saveOne(item.key)}
              busy={savingKey === item.key}
              disabled={savingKey !== '' && savingKey !== item.key}
            >
              حفظ النص
            </BusyButton>
          </div>
        ))}
      </div>
    </div>
  );
}

