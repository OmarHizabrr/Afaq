import React, { useEffect, useState } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import useSiteContent from '../../context/useSiteContent';
import { saveBranding, saveContacts } from '../../services/siteConfigService';

export default function AdminBrandingPage({ user }) {
  const { branding, contacts, contactsMessage } = useSiteContent();
  const [siteName, setSiteName] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [logoText, setLogoText] = useState('');
  const [adminSubtitle, setAdminSubtitle] = useState('');
  const [contactsMessageDraft, setContactsMessageDraft] = useState('');
  const [contactsDraft, setContactsDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    setSiteName(branding.siteName || '');
    setSiteTitle(branding.siteTitle || '');
    setLogoText(branding.logoText || '');
    setAdminSubtitle(branding.adminSubtitle || '');
  }, [branding]);

  useEffect(() => {
    setContactsMessageDraft(contactsMessage || '');
  }, [contactsMessage]);

  useEffect(() => {
    setContactsDraft(Array.isArray(contacts) ? contacts : []);
  }, [contacts]);

  const onSave = async () => {
    setStatus({ type: '', text: '' });
    setSaving(true);
    try {
      await Promise.all([
        saveBranding(user, { siteName, siteTitle, logoText, adminSubtitle }),
        saveContacts(user, contactsDraft, contactsMessageDraft),
      ]);
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

        <div className="admin-branding-contacts">
          <div className="admin-branding-contacts__head">
            <strong>وسائل تواصل الإدارة</strong>
            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                setContactsDraft((prev) => [
                  ...prev,
                  { id: `c_${Date.now()}`, label: '', channel: 'whatsapp', value: '' },
                ])
              }
              title="إضافة وسيلة تواصل"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="admin-branding-contacts__list">
            <label className="app-field app-field--grow">
              <span className="app-label">رسالة توضيحية للمستخدم</span>
              <textarea
                className="app-textarea"
                rows={3}
                placeholder="مثال: يرجى التواصل مع الإدارة عبر الوسائل التالية لتفعيل الصلاحيات."
                value={contactsMessageDraft}
                onChange={(e) => setContactsMessageDraft(e.target.value)}
              />
            </label>
            {contactsDraft.map((item, idx) => (
              <div key={item.id || idx} className="admin-branding-contacts__row">
                <input
                  className="app-input"
                  placeholder="المسمى (مثال: مدير المنصة)"
                  value={item.label || ''}
                  onChange={(e) =>
                    setContactsDraft((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                    )
                  }
                />
                <AppSelect
                  className="app-select"
                  value={item.channel || 'whatsapp'}
                  onChange={(e) =>
                    setContactsDraft((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, channel: e.target.value } : x)),
                    )
                  }
                >
                  <option value="whatsapp">واتساب</option>
                  <option value="telegram">تلجرام</option>
                  <option value="phone">اتصال هاتفي</option>
                  <option value="email">بريد إلكتروني</option>
                  <option value="instagram">انستغرام</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="x">X / تويتر</option>
                  <option value="other">أخرى</option>
                </AppSelect>
                <input
                  className="app-input"
                  placeholder="رقم أو رابط الحساب"
                  value={item.value || ''}
                  onChange={(e) =>
                    setContactsDraft((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  title="حذف"
                  onClick={() => setContactsDraft((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={17} color="var(--danger-color)" />
                </button>
              </div>
            ))}
            {contactsDraft.length === 0 && (
              <p className="admin-branding-contacts__empty">لا توجد وسائل تواصل بعد. أضف وسيلة من زر +.</p>
            )}
          </div>
        </div>

        <button type="button" className="google-btn google-btn--filled admin-settings-save-btn" onClick={onSave} disabled={saving}>
          {saving && <span className="btn-loading-spinner" aria-hidden />}
          <span>{saving ? 'جاري حفظ الهوية...' : 'حفظ الهوية'}</span>
        </button>
      </div>
    </div>
  );
}

