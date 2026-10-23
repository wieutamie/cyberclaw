import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { HamburgerMenu } from './HamburgerMenu.js';
import { BrandLogo } from './BrandLogo.js';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header-sheen sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 shadow-[0_4px_20px_rgba(0,0,0,0.28)]">
      {/* Hairline highlight + soft bottom vignette for depth */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-black/15" />

      <div className="relative max-w-[1480px] mx-auto h-20 sm:h-24 flex items-center justify-between gap-4">
        {/* Left: Brand lockup — big mark beside a stacked CYBER/CLAW wordmark
            with the tagline tucked close under CLAW, matching the mockup header. */}
        <Link
          to="/dashboard"
          className="group flex items-center min-w-0 rounded-xl px-1.5 py-1 -ml-1.5 transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={t('common.homeAria')}
        >
          <BrandLogo
            stacked
            showTagline
            markClassName="w-[64px] h-[54px] sm:w-[88px] sm:h-[74px] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105"
            wordClassName="text-2xl sm:text-[28px]"
          />
        </Link>

        {/* Right: menu */}
        <div className="flex items-center gap-3 relative">
          {/* Hamburger: buka saat hover, tetap bisa diklik (sentuh/keyboard). */}
          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
          >
            <button
              type="button"
              data-menu-toggle
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="app-nav-menu"
              aria-haspopup="menu"
              aria-label={t('common.toggleMenuAria')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                menuOpen ? 'bg-black/30 rotate-90' : 'hover:bg-black/20'
              }`}
            >
              <Menu className="w-7 h-7" strokeWidth={2.5} />
            </button>

            <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      </div>
    </header>
  );
};
