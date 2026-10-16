import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { HamburgerMenu } from './HamburgerMenu.js';
import { BrandLogo } from './BrandLogo.js';

export const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header-sheen sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 shadow-[0_4px_20px_rgba(0,0,0,0.28)]">
      {/* Hairline highlight + soft bottom vignette for depth */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-black/15" />

      <div className="relative max-w-[1480px] mx-auto h-24 sm:h-32 flex items-center justify-between gap-4">
        {/* Left: Brand lockup — big mark beside a stacked CYBER/CLAW wordmark
            with the tagline tucked close under CLAW, matching the mockup header. */}
        <Link
          to="/dashboard"
          className="group flex items-center min-w-0 rounded-xl px-1.5 py-1 -ml-1.5 transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Cyber Claw — Dashboard"
        >
          <BrandLogo
            stacked
            showTagline
            markClassName="w-[76px] h-16 sm:w-[104px] sm:h-[88px] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105"
            wordClassName="text-3xl sm:text-4xl"
          />
        </Link>

        {/* Right: live status chip + menu */}
        <div className="flex items-center gap-3 relative">
          {/* Live "engine online" indicator — a subtle sign the app is alive */}
          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 border border-white/15 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-2 h-2 rounded-full bg-white/70 animate-live-dot" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
            </span>
            <span className="tracking-wide">Engines online</span>
          </span>

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
              aria-label="Toggle Navigation Menu"
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
