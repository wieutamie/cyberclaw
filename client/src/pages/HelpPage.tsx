import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  KeyRound,
  FileUp,
  Link2,
  Hash,
  BarChart3,
  Gauge,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

/**
 * Official VirusTotal API v3 documentation base.
 * Every topic below deep-links to the matching reference page so the Help page
 * stays a thin, always-accurate index of the official docs.
 */
const VT_DOCS = 'https://docs.virustotal.com/reference';

interface HelpTopic {
  icon: React.ComponentType<{ className?: string }>;
  /** i18n suffix, e.g. "scanFile" -> help.scanFileTitle / help.scanFileDesc */
  key: string;
  url: string;
}

const topics: HelpTopic[] = [
  { icon: BookOpen, key: 'overview', url: `${VT_DOCS}/overview` },
  { icon: KeyRound, key: 'apiKey', url: `${VT_DOCS}/authentication` },
  { icon: FileUp, key: 'scanFile', url: `${VT_DOCS}/files-scan` },
  { icon: Link2, key: 'scanUrl', url: `${VT_DOCS}/scan-url` },
  { icon: Hash, key: 'scanHash', url: `${VT_DOCS}/file-info` },
  { icon: BarChart3, key: 'readResults', url: `${VT_DOCS}/analysis` },
  { icon: Gauge, key: 'rateLimits', url: `${VT_DOCS}/public-vs-premium-api` },
  { icon: AlertTriangle, key: 'errors', url: `${VT_DOCS}/errors` },
];

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-rise">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-surface-alt">
        <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center shrink-0">
          <img src="/LogoCC.svg" alt="Cyber Claw" className="w-8 h-7 object-contain brightness-0 invert" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('help.title')}</h1>
          <span className="text-xs text-muted">{t('help.subtitle')}</span>
        </div>
      </div>

      {/* Intro — points to the official VirusTotal API v3 docs */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-2 text-brand-accent">
          <BookOpen className="w-4 h-4" />
          <h2 className="text-base font-bold text-white">{t('help.introTitle')}</h2>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{t('help.introDesc')}</p>
        <a
          href={`${VT_DOCS}/overview`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-btn bg-brand hover:bg-brand-accent text-white font-semibold text-xs shadow-soft transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{t('help.overviewLink')}</span>
        </a>
      </section>

      {/* Documentation topics */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-white">{t('help.topicsTitle')}</h2>
          <p className="text-xs text-muted mt-0.5">{t('help.topicsDesc')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {topics.map(({ icon: Icon, key, url }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-surface border border-surface-alt rounded-card p-5 shadow-card hover:border-brand-accent/40 transition-colors flex flex-col"
            >
              <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-brand-accent" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{t(`help.${key}Title`)}</h3>
              <p className="text-xs text-muted leading-relaxed flex-1">{t(`help.${key}Desc`)}</p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-brand-accent">
                {t('help.openDocs')}
                <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* API key callout — direct link to the official key page */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-2 text-brand-accent">
          <KeyRound className="w-4 h-4" />
          <h2 className="text-base font-bold text-white">{t('help.apiKeyCalloutTitle')}</h2>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{t('help.apiKeyCalloutDesc')}</p>
        <a
          href="https://www.virustotal.com/gui/my-apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-btn bg-brand hover:bg-brand-accent text-white font-semibold text-xs shadow-soft transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{t('help.getApiKeyLink')}</span>
        </a>
      </section>

      {/* Footer note */}
      <p className="text-xs text-muted leading-relaxed text-center px-2">{t('help.footerNote')}</p>
    </div>
  );
};

