import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BarChart3, Sliders, Info, BookOpen } from 'lucide-react';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const items = [
    { path: '/dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
    { path: '/analytics', label: t('common.analytics'), icon: BarChart3 },
    { path: '/preferences', label: t('common.preferences'), icon: Sliders },
    { path: '/help', label: t('common.help'), icon: BookOpen },
    { path: '/about', label: t('common.about'), icon: Info },
  ];
  const total = items.length;

  // Close on Escape; close on outside pointerdown (ignoring the toggle button itself,
  // otherwise the toggle's own click would race the outside-close handler).
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      // Let the toggle button handle its own state change — don't double-fire.
      if (target instanceof Element && target.closest('[data-menu-toggle]')) return;
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, onClose]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (isOpen) {
      const firstActive = items.findIndex((i) => location.pathname.startsWith(i.path));
      itemRefs.current[firstActive >= 0 ? firstActive : 0]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keyboard navigation across menu items (Up/Down/Home/End).
  const handleMenuKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowDown') next = (index + 1) % total;
    else if (e.key === 'ArrowUp') next = (index - 1 + total) % total;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = total - 1;
    else return;
    e.preventDefault();
    itemRefs.current[next]?.focus();
  };

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      id="app-nav-menu"
      aria-label={t('nav.navigation')}
      className="absolute right-0 top-[calc(100%+10px)] w-60 bg-surface border border-white/10 rounded-card shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-1.5 z-50 origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
    >
      <div className="flex flex-col gap-0.5">
        {items.map((item, index) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              role="menuitem"
              type="button"
              ref={(el) => { itemRefs.current[index] = el; }}
              tabIndex={-1}
              onKeyDown={(e) => handleMenuKeyDown(e, index)}
              onClick={() => go(item.path)}
              aria-current={isActive ? 'page' : undefined}
              style={{ animationDelay: `${index * 45}ms` }}
              className={`group animate-in fade-in slide-in-from-right-2 duration-200 fill-mode-both flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
                isActive
                  ? 'bg-brand-accent/20 text-white'
                  : 'text-gray-300 hover:bg-surface-alt hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-brand-accent' : 'text-muted group-hover:text-brand-accent'
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
