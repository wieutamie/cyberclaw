import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-surface border-2 border-brand/40 flex items-center justify-center mb-6 shadow-soft">
        <img src="/LogoCC.svg" alt="Cyber Claw" className="w-12 h-10 object-contain brightness-0 invert" />
      </div>
      <h1 className="text-6xl font-extrabold text-white font-mono mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-200 mb-3">{t('notFound.title')}</h2>
      <p className="text-sm text-muted max-w-sm mb-6 leading-relaxed">
        {t('notFound.description')}
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-btn bg-brand hover:bg-brand-accent text-white font-bold text-xs shadow-soft transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('common.backToDashboard')}</span>
      </Link>
    </div>
  );
};
