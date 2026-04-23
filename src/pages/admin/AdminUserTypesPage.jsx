import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { PERMISSION_PAGES } from '../../config/permissionRegistry';
import FirestoreApi from '../../services/firestoreApi';
import {
  subscribePermissionProfiles,
  savePermissionProfile,
  deletePermissionProfile,
} from '../../services/permissionProfilesService';

export default function AdminUserTypesPage({ user }) {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [pages, setPages] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribePermissionProfiles(setList, () => {});
    return () => unsub();
  }, []);

  const selected = useMemo(() => list.find((x) => x.id === selectedId) || null, [list, selectedId]);

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
    setName('نوع جديد');
    setPages({});
  };

  const setPageAllowed = (pageId, allowed) => {
    setPages((prev) => {
      const next = { ...prev };
      if (!allowed) {
        delete next[pageId];
        return next;
      }
      next[pageId] = { actions: { ...(next[pageId]?.actions || {}) } };
      return next;
    });
  };

  const setActionAllowed = (pageId, actionId, allowed) => {
    setPages((prev) => {
      const cur = prev[pageId] || { actions: {} };
      return {
        ...prev,
        [pageId]: {
          ...cur,
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
    setSaving(true);
    try {
      await savePermissionProfile(user, selectedId, {
        name,
        pages,
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    await deletePermissionProfile(selectedId);
    setSelectedId('');
  };

  return (
    <div>
      <PageHeader
        title="أنواع المستخدمين والصلاحيات"
        subtitle="أنشئ نوعاً، ثم فعّل الصفحات والإجراءات التي تظهر له."
        icon={Shield}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem' }}>
        <section className="surface-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <strong>الأنواع</strong>
            <button type="button" className="icon-btn" onClick={createNew} title="نوع جديد">+</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  textAlign: 'right',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: selectedId === item.id ? 'var(--accent-muted)' : 'var(--bg-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {item.name || item.id}
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card" style={{ padding: '1rem' }}>
          {!selectedId ? (
            <p style={{ color: 'var(--text-secondary)' }}>اختر نوعاً من القائمة أو أنشئ نوعاً جديداً.</p>
          ) : (
            <>
              <label style={{ display: 'block', marginBottom: '0.75rem' }}>
                اسم النوع
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', marginTop: '0.3rem' }}
                />
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <button type="button" className="google-btn" onClick={save} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ النوع'}
                </button>
                {selected && (
                  <button type="button" className="icon-btn" onClick={remove} title="حذف النوع">
                    <Trash2 size={18} color="var(--danger-color)" />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {PERMISSION_PAGES.map((pg) => {
                  const pageAllowed = Boolean(pages[pg.id]);
                  return (
                    <div key={pg.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={pageAllowed}
                          onChange={(e) => setPageAllowed(pg.id, e.target.checked)}
                        />
                        {pg.label}
                      </label>
                      {pageAllowed && pg.actions?.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingRight: '1.2rem', display: 'grid', gap: '0.4rem' }}>
                          {pg.actions.map((a) => (
                            <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

