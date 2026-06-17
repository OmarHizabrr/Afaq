import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { useNotificationBadge } from '../context/NotificationsBadgeContext';
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry';
import { isMoreTabActive, isNavPathActive } from '../utils/mobileNavTabs';

const BottomTabBar = ({ tabs, onMoreClick }) => {
  const location = useLocation();
  const { unreadCount } = useNotificationBadge();
  const tabPaths = tabs.map((t) => t.path);
  const moreActive = isMoreTabActive(tabPaths, location.pathname);

  return (
    <nav className="bottom-tab-bar" aria-label="التنقل السريع">
      {tabs.map((item) => {
        const active = isNavPathActive(item.path, location.pathname, { end: item.end });
        const showBadge =
          (item.pageId === PERMISSION_PAGE_IDS.notifications ||
            item.path?.endsWith('/notifications')) &&
          unreadCount > 0;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={`bottom-tab-bar__item ${active ? 'bottom-tab-bar__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-tab-bar__icon-wrap">
              <item.icon size={22} strokeWidth={active ? 2.25 : 2} aria-hidden />
              {showBadge ? (
                <span className="bottom-tab-bar__badge" aria-label={`${unreadCount} غير مقروء`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </span>
            <span className="bottom-tab-bar__label">{item.shortName || item.name}</span>
          </NavLink>
        );
      })}

      <button
        type="button"
        className={`bottom-tab-bar__item bottom-tab-bar__item--more ${moreActive ? 'bottom-tab-bar__item--active' : ''}`}
        onClick={onMoreClick}
        aria-label="المزيد من القوائم"
        aria-expanded={moreActive}
      >
        <span className="bottom-tab-bar__icon-wrap">
          <LayoutGrid size={22} strokeWidth={moreActive ? 2.25 : 2} aria-hidden />
        </span>
        <span className="bottom-tab-bar__label">المزيد</span>
      </button>
    </nav>
  );
};

export default BottomTabBar;
