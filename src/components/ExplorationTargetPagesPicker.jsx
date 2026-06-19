import React, { useMemo } from 'react';
import { LayoutGrid, CheckCheck, RotateCcw } from 'lucide-react';
import {
  EXPLORATION_TARGET_PAGES,
  normalizeAllowedPageIds,
} from '../utils/explorationTargetPages';
import useAppTranslation from '../hooks/useAppTranslation';

/**
 * منتقي صفحات ظهور نوع الاستكشاف.
 * مصفوفة فارغة = يظهر في جميع الصفحات.
 */
const ExplorationTargetPagesPicker = ({ value = [], onChange, disabled = false }) => {
  const { t } = useAppTranslation();
  const selected = useMemo(() => new Set(normalizeAllowedPageIds(value)), [value]);
  const allSelected = selected.size === EXPLORATION_TARGET_PAGES.length;
  const isGlobal = selected.size === 0;

  const groups = useMemo(() => {
    const map = new Map();
    for (const page of EXPLORATION_TARGET_PAGES) {
      const g = page.group || t('components.ExplorationTargetPagesPicker.أخرى', 'أخرى');
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(page);
    }
    return [...map.entries()];
  }, []);

  const toggle = (pageId) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(pageId)) next.delete(pageId);
    else next.add(pageId);
    onChange([...next]);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(EXPLORATION_TARGET_PAGES.map((p) => p.id));
  };

  const clearToGlobal = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <section className="exploration-target-pages" aria-labelledby="exploration-target-pages-title">
      <div className="exploration-target-pages__head">
        <div className="exploration-target-pages__title-wrap">
          <h4 id="exploration-target-pages-title" className="exploration-target-pages__title">
            <LayoutGrid size={18} aria-hidden />
            صفحات ظهور النموذج
          </h4>
          <p className="exploration-target-pages__lead">
            {isGlobal
              ? t('components.ExplorationTargetPagesPicker.بدون_تحديد_يظهر_هذا_النموذج_في_كل_الصفحات_التي_تدعم_إضافة_من', 'بدون تحديد: يظهر هذا النموذج في كل الصفحات التي تدعم «إضافة من الاستكشاف» وفي قسم الاستكشاف.')
              : `محدّد لـ ${selected.size} صفحة — لن يظهر في غيرها عند الإضافة.`}
          </p>
        </div>
        <div className="exploration-target-pages__toolbar">
          <button
            type="button"
            className="exploration-target-pages__tool-btn"
            onClick={selectAll}
            disabled={disabled || allSelected}
            title={t('components.ExplorationTargetPagesPicker.تحديد_كل_الصفحات', 'تحديد كل الصفحات')}
          >
            <CheckCheck size={15} aria-hidden />
            <span>{t('pages.RegionDetailsPage.الكل', 'الكل')}</span>
          </button>
          <button
            type="button"
            className="exploration-target-pages__tool-btn"
            onClick={clearToGlobal}
            disabled={disabled || isGlobal}
            title={t('components.ExplorationTargetPagesPicker.إلغاء_التحديد_جميع_الصفحات', 'إلغاء التحديد — جميع الصفحات')}
          >
            <RotateCcw size={15} aria-hidden />
            <span>{t('utils.explorationTargetPages.جميع_الصفحات', 'جميع الصفحات')}</span>
          </button>
        </div>
      </div>

      <div className="exploration-target-pages__groups">
        {groups.map(([groupName, pages]) => (
          <div key={groupName} className="exploration-target-pages__group">
            <span className="exploration-target-pages__group-label">{groupName}</span>
            <div className="exploration-target-pages__grid" role="group" aria-label={groupName}>
              {pages.map((page) => {
                const active = selected.has(page.id);
                return (
                  <label
                    key={page.id}
                    className={`exploration-target-pages__chip ${active ? 'exploration-target-pages__chip--active' : ''} ${disabled ? 'exploration-target-pages__chip--disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={disabled}
                      onChange={() => toggle(page.id)}
                    />
                    <span className="exploration-target-pages__chip-text">{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExplorationTargetPagesPicker;
