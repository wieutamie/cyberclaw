import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Header } from './Header.js';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-shell flex flex-col text-white">
      <Header />
      <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9">
        <Outlet />
      </main>
      <footer className="w-full py-7 px-6 text-center text-[11px] text-slate-500 leading-relaxed">
        <span>
          ©{new Date().getFullYear()} Cyber Claw. Crafted with precision by Wie Utami
        </span>
        <br />
        <span>SMK Negeri 6 Batam | Infinite Learning Program</span>
        <div className="flex justify-center gap-4 mt-3">
          <Link
            to="/terms"
            className="underline decoration-slate-600 underline-offset-4 hover:text-brand-accent hover:decoration-brand-accent transition-colors"
          >
            Terms &amp; Privacy
          </Link>
          <a
            href="https://www.virustotal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-600 underline-offset-4 hover:text-brand-accent hover:decoration-brand-accent transition-colors"
          >
            virustotal.com
          </a>
        </div>
      </footer>
    </div>
  );
};

