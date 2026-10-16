import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Cpu, GraduationCap, GitBranch, Mail, Sparkles } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Shield, title: t('about.featureScanTitle'), desc: t('about.featureScanDesc') },
    { icon: Cpu, title: t('about.featureEnginesTitle'), desc: t('about.featureEnginesDesc') },
    { icon: Sparkles, title: t('about.featurePrivacyTitle'), desc: t('about.featurePrivacyDesc') },
  ];

  const stack = ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Express', 'Supabase', 'VirusTotal API v3'];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-rise">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-surface-alt">
        <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center shrink-0">
          <img src="/LogoCC.svg" alt="Cyber Claw" className="w-8 h-7 object-contain brightness-0 invert" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('about.title')}</h1>
          <span className="text-xs text-muted">{t('about.subtitle')}</span>
        </div>
      </div>

      {/* Intro */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card">
        <h2 className="text-base font-bold text-white mb-2">{t('about.introTitle')}</h2>
        <p className="text-sm text-gray-300 leading-relaxed">{t('about.introDesc')}</p>
      </section>

      {/* What it does */}
      <section className="grid sm:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-surface border border-surface-alt rounded-card p-5 shadow-card hover:border-brand-accent/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-brand-accent" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
            <p className="text-xs text-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Tech stack */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card">
        <h2 className="text-base font-bold text-white mb-3">{t('about.stackTitle')}</h2>
        <div className="flex flex-wrap gap-2">
          {stack.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 rounded-full bg-surface-alt border border-white/10 text-xs font-medium text-gray-200"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Project credits */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-brand-accent">
          <GraduationCap className="w-4 h-4" />
          <h2 className="text-base font-bold text-white">{t('about.projectTitle')}</h2>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{t('about.projectDesc')}</p>
        <div className="flex flex-col gap-2 pt-1 text-xs text-muted">
          <span className="inline-flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5" />
            {t('about.org')}
          </span>
          <a
            href="https://www.virustotal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-brand-accent transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            virustotal.com
          </a>
        </div>
      </section>
    </div>
  );
};
