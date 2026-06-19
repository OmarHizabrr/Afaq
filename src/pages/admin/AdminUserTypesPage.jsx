import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getPermissionPages } from '../../config/permissionRegistry';
import FirestoreApi from '../../services/firestoreApi';
import {
  subscribePermissionProfiles,
  savePermissionProfile,
  deletePermissionProfile,
} from '../../services/permissionProfilesService';
import { DATA_SCOPE_ALL, DATA_SCOPE_MEMBERSHIP, normalizeDataScope } from '../../utils/permissionDataScope';
import BusyButton from '../../components/BusyButton';
import useAppTranslation from '../../hooks/useAppTranslation';

export default function AdminUserTypesPage({ user }) {
  const { t } = useAppTranslation();
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [pages, setPages] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    const unsub = subscribePermissionProfiles(setList, () => {});
    return () => unsub();
  }, []);

  const selected = useMemo(() => list.find((x) => x.id === selectedId) || null, [list, selectedId]);
  const permissionPages = useMemo(() => getPermissionPages(t), [t]);

  useEffect(() => {
    if (!selected) {
      setName('');
      setPages({});
      return;
    }
    setName(selected.name || '');
    setPages(selected.pages || {});
  }, [selected]);

  const createNew = () => {
    const id = FirestoreApi.Api.getNewId('permission_profiles');
    setSelectedId(id);
    setName(t('pages.AdminUserTypesPage.نوع_جديد', 'نوع جديد'));
    setPages({});
  };

  const setPageAllowed = (pageId, allowed) => {
    setPages((prev) => {
      const next = { ...prev };
      if (!allowed) {
        delete next[pageId];
        return next;
      }
      next[pageId] = {
        dataScope: normalizeDataScope(prev[pageId]?.dataScope) || DATA_SCOPE_ALL,
        actions: { ...(prev[pageId]?.actions || {}) },
      };
      return next;
    });
  };

  const setPageDataScope = (pageId, scope) => {
    setPages((prev) => {
      if (!prev[pageId]) return prev;
      return {
        ...prev,
        [pageId]: {
          ...prev[pageId],
          dataScope: normalizeDataScope(scope),
        },
      };
    });
  };

  const setActionAllowed = (pageId, actionId, allowed) => {
    setPages((prev) => {
      const cur = prev[pageId] || { actions: {}, dataScope: DATA_SCOPE_ALL };
      return {
        ...prev,
        [pageId]: {
          dataScope: normalizeDataScope(cur.dataScope),
          actions: {
            ...(cur.actions || {}),
            [actionId]: allowed,
          },
        },
      };
    });
  };

  const save = async () => {
    if (!selectedId || !name.trim()) return;
    setStatus({ type: '', text: '' });
    setSaving(true);
    try {
      await savePermissionProfile(user, selectedId, {
        name,
        pages,
      });
      setStatus({ type: 'success', text: t('pages.AdminUserTypesPage.تم_حفظ_نوع_المستخدم_والصلاحيات', 'تم حفظ نوع المستخدم والصلاحيات.') });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: t('pages.AdminUserTypesPage.تعذر_حفظ_نوع_المستخدم_حالياً', 'تعذر حفظ نوع المستخدم حالياً.') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    setStatus({ type: '', text: '' });
    setSaving(true);
    try {
      await deletePermissionProfile(selectedId);
      setSelectedId('');
      setStatus({ type: 'success', text: t('pages.AdminUserTypesPage.تم_حذف_نوع_المستخدم', 'تم حذف نوع المستخدم.') });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: t('pages.AdminUserTypesPage.تعذر_حذف_نوع_المستخدم', 'تعذر حذف نوع المستخدم.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`admin-user-types-page${selectedId ? ' admin-user-types-page--has-mobile-save' : ''}`}>
      <PageHeader
        title={t('config.permissionRegistry.أنواع_المستخدمين_والصلاحيات', 'أنواع المستخدمين والصلاحيات')}
        subtitle={t('pages.AdminUserTypesPage.أنشئ_نوعاً،_ثم_فعّل_الصفحات_والإجراءات_التي_تظهر_له', 'أنشئ نوعاً، ثم فعّل الصفحات والإجراءات التي تظهر له.')}
        icon={Shield}
      />

      {status.text && (
        <div className={`app-alert ${status.type === 'success' ? 'app-alert--success' : 'app-alert--error'} admin-settings-alert`}>
          {status.text}
        </div>
      )}

      <div className="admin-user-types-layout">
        <section className="surface-card admin-user-types-sidebar">
          <div className="admin-user-types-sidebar__head">
            <strong>{t('config.appNavItems.الأنواع', 'الأنواع')}</strong>
            <button type="button" className="icon-btn" onClick={createNew} title={t('pages.AdminUserTypesPage.نوع_جديد', 'نوع جديد')}>+</button>
          </div>
          <div className="admin-user-types-sidebar__list">
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`admin-user-types-sidebar__item ${selectedId === item.id ? 'admin-user-types-sidebar__item--active' : ''}`}
              >
                {item.name || item.id}
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card admin-user-types-content">
          {!selectedId ? (
            <p className="admin-user-types-content__empty">{t('pages.AdminUserTypesPage.اختر_نوعاً_من_القائمة_أو_أنشئ_نوعاً_جديداً', 'اختر نوعاً من القائمة أو أنشئ نوعاً جديداً.')}</p>
          ) : (
            <>
              <label className="app-field app-field--grow admin-user-types-content__name-field">
                <span className="app-label">{t('pages.AdminUserTypesPage.اسم_النوع', 'اسم النوع')}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="app-input"
                />
              </label>
              <div className="admin-user-types-content__actions admin-user-types-content__actions--desktop">
                <BusyButton type="button" className="google-btn google-btn--filled" onClick={save} busy={saving}>
                  حفظ النوع
                </BusyButton>
                {selected && (
                  <BusyButton type="button" className="icon-btn" onClick={remove} title={t('pages.AdminUserTypesPage.حذف_النوع', 'حذف النوع')} busy={saving}>
                    <Trash2 size={18} color="var(--danger-color)" />
                  </BusyButton>
                )}
              </div>

              <div className="admin-user-types-content__pages">
                {permissionPages.map((pg) => {
                  const pageAllowed = Boolean(pages[pg.id]);
                  return (
                    <div key={pg.id} className="admin-user-types-page-card">
                      <label className="admin-user-types-page-card__label">
                        <input
                          type="checkbox"
                          checked={pageAllowed}
                          onChange={(e) => setPageAllowed(pg.id, e.target.checked)}
                        />
                        {pg.label}
                      </label>
                      {pageAllowed && pg.actions?.length > 0 && (
                        <div className="admin-user-types-page-card__actions">
                          {pg.actions.map((a) => (
                            <label key={a.id} className="admin-user-types-page-card__action-item">
                              <input
                                type="checkbox"
                                checked={pages?.[pg.id]?.actions?.[a.id] === true}
                                onChange={(e) => setActionAllowed(pg.id, a.id, e.target.checked)}
                              />
                              {a.label}
                            </label>
                          ))}
                        </div>
                      )}
                      {pageAllowed && pg.supportsDataScope && (
                        <div className="admin-user-types-page-card__scope">
                          <span className="app-label admin-user-types-page-card__scope-label">
                            {t('utils.permissionDataScope.نطاق_عرض_البيانات_في_هذه_الصفحة', 'نطاق عرض البيانات في هذه الصفحة')}
                          </span>
                          <label className="admin-user-types-page-card__action-item admin-user-types-page-card__scope-item">
                            <input
                              type="radio"
                              name={`data-scope-${pg.id}`}
                              checked={normalizeDataScope(pages?.[pg.id]?.dataScope) === DATA_SCOPE_ALL}
                              onChange={() => setPageDataScope(pg.id, DATA_SCOPE_ALL)}
                            />
                            {t('utils.permissionDataScope.كل_السجلات_عرض_شامل', 'كل السجلات (عرض شامل)')}
                          </label>
                          <label className="admin-user-types-page-card__action-item admin-user-types-page-card__scope-item">
                            <input
                              type="radio"
                              name={`data-scope-${pg.id}`}
                              checked={normalizeDataScope(pages?.[pg.id]?.dataScope) === DATA_SCOPE_MEMBERSHIP}
                              onChange={() => setPageDataScope(pg.id, DATA_SCOPE_MEMBERSHIP)}
                            />
                            {t('utils.permissionDataScope.ما_يرتبط_بي_فقط', 'ما يرتبط بي فقط (مدارس/مناطق/مجموعات أنا عضو فيها)')}
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {selectedId ? (
        <div className="admin-user-types-mobile-save-bar">
          <BusyButton
            type="button"
            className="google-btn google-btn--filled admin-user-types-mobile-save-bar__btn"
            onClick={save}
            busy={saving}
          >
            حفظ النوع
          </BusyButton>
          {selected ? (
            <BusyButton
              type="button"
              className="icon-btn admin-user-types-mobile-save-bar__delete"
              onClick={remove}
              title={t('pages.AdminUserTypesPage.حذف_النوع', 'حذف النوع')}
              busy={saving}
            >
              <Trash2 size={18} color="var(--danger-color)" />
            </BusyButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

