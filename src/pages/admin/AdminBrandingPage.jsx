import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import useSiteContent from '../../context/useSiteContent';
import { saveBranding } from '../../services/siteConfigService';

export default function AdminBrandingPage({ user }) {
  const { branding } = useSiteContent();
  const [siteName, setSiteName] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [logoText, setLogoText] = useState('');
  const [adminSubtitle, setAdminSubtitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    setSiteName(branding.siteName || '');
    setSiteTitle(branding.siteTitle || '');
    setLogoText(branding.logoText || '');
    setAdminSubtitle(branding.adminSubtitle || '');
  }, [branding]);

  const onSave = async () => {
    setStatus({ type: '', text: '' });
    setSaving(true);
    try {
      await saveBranding(user, { siteName, siteTitle, logoText, adminSubtitle });
      setStatus({ type: 'success', text: 'تم حفظ هوية الموقع بنجاح.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'تعذر حفظ الهوية حالياً، حاول مرة أخرى.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="هوية الموقع"
        subtitle="تعديل اسم المنصة والعنوان والنص الظاهر في رأس لوحة التحكم."
        icon={Palette}
      />

      <div className="surface-card admin-branding-card">
        {status.text && (
          <div className={`app-alert ${status.type === 'success' ? 'app-alert--success' : 'app-alert--error'} admin-settings-alert`}>
            {status.text}
          </div>
        )}

        <label className="app-field app-field--grow">
          <span className="app-label">اسم المنصة</span>
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="app-input" />
        </label>
        <label className="app-field app-field--grow">
          <span className="app-label">عنوان الصفحات</span>
          <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} className="app-input" />
        </label>
        <label className="app-field app-field--grow">
          <span className="app-label">نص الشعار المختصر</span>
          <input value={logoText} onChange={(e) => setLogoText(e.target.value)} className="app-input" />
        </label>
        <label className="app-field app-field--grow">
          <span className="app-label">النص الفرعي في الشريط الجانبي</span>
          <input value={adminSubtitle} onChange={(e) => setAdminSubtitle(e.target.value)} className="app-input" />
        </label>

        <button type="button" className="google-btn google-btn--filled admin-settings-save-btn" onClick={onSave} disabled={saving}>
          {saving && <span className="btn-loading-spinner" aria-hidden />}
          <span>{saving ? 'جاري حفظ الهوية...' : 'حفظ الهوية'}</span>
        </button>
      </div>
    </div>
  );
}

