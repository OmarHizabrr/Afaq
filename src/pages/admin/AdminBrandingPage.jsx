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

  useEffect(() => {
    setSiteName(branding.siteName || '');
    setSiteTitle(branding.siteTitle || '');
    setLogoText(branding.logoText || '');
    setAdminSubtitle(branding.adminSubtitle || '');
  }, [branding]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveBranding(user, { siteName, siteTitle, logoText, adminSubtitle });
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

      <div className="surface-card" style={{ padding: '1rem', maxWidth: '720px' }}>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          اسم المنصة
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} style={{ width: '100%', marginTop: '0.3rem' }} />
        </label>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          عنوان الصفحات
          <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} style={{ width: '100%', marginTop: '0.3rem' }} />
        </label>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          نص الشعار المختصر
          <input value={logoText} onChange={(e) => setLogoText(e.target.value)} style={{ width: '100%', marginTop: '0.3rem' }} />
        </label>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          النص الفرعي في الشريط الجانبي
          <input value={adminSubtitle} onChange={(e) => setAdminSubtitle(e.target.value)} style={{ width: '100%', marginTop: '0.3rem' }} />
        </label>

        <button type="button" className="google-btn" onClick={onSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ الهوية'}
        </button>
      </div>
    </div>
  );
}

