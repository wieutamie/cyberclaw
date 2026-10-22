import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Cpu, GraduationCap, GitBranch, Mail, Sparkles, User, FileText, ExternalLink } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Shield, title: t('about.featureScanTitle'), desc: t('about.featureScanDesc') },
    { icon: Cpu, title: t('about.featureEnginesTitle'), desc: t('about.featureEnginesDesc') },
    { icon: Sparkles, title: t('about.featurePrivacyTitle'), desc: t('about.featurePrivacyDesc') },
  ];

  const specs = [
    { label: t('about.specFileSize'), value: t('about.specFileSizeValue') },
    { label: t('about.specEngines'), value: t('about.specEnginesValue') },
    { label: t('about.specApi'), value: t('about.specApiValue') },
    { label: t('about.specStorage'), value: t('about.specStorageValue') },
    { label: t('about.specRetention'), value: t('about.specRetentionValue') },
    { label: t('about.specLanguages'), value: t('about.specLanguagesValue') },
  ];

  const stack = ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Express', 'Supabase', 'VirusTotal API'];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-rise">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-surface-alt">
        <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center shrink-0">
          <img src="/LogoCC.svg" alt="Cyber Claw" className="w-8 h-7 object-contain brightness-0 invert" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('about.title')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-brand/20 border border-brand-accent/40 text-[11px] font-semibold text-brand-accent">
              {t('about.versionBadge')}
            </span>
          </div>
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

      {/* Technical specifications */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card">
        <div className="flex items-center gap-2 text-brand-accent mb-4">
          <FileText className="w-4 h-4" />
          <h2 className="text-base font-bold text-white">{t('about.specsTitle')}</h2>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {specs.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-surface-alt/60 pb-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-xs font-semibold text-white text-right">{value}</dd>
            </div>
          ))}
        </dl>
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

      {/* Developer */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card">
        <div className="flex items-center gap-2 text-brand-accent mb-3">
          <User className="w-4 h-4" />
          <h2 className="text-base font-bold text-white">{t('about.devTitle')}</h2>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center shrink-0 text-brand-accent font-bold">
            {t('about.devName').charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">{t('about.devName')}</span>
            <span className="text-xs text-brand-accent">{t('about.devRole')}</span>
            <p className="text-xs text-muted leading-relaxed mt-1.5">{t('about.devDesc')}</p>
          </div>
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
          <span className="inline-flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            {t('about.licenseLabel')}: <span className="text-gray-200 font-medium">{t('about.licenseValue')}</span>
          </span>
          <a
            href="https://github.com/wieutamie/cyberclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-brand-accent transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('about.repoUrl')}
          </a>
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
