import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();


  return (
    <div className="min-h-screen bg-bg text-white py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-surface border border-surface-alt rounded-card p-6 sm:p-10 shadow-card">
        {/* The legal text is intentionally English-only (binding wording), so
            we surface that clearly instead of showing half-translated copy. */}
        <div className="flex items-start gap-2.5 mb-6 px-3.5 py-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30">
          <Globe className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-gray-300">
            {t('terms.englishOnly')}
          </p>
        </div>

        <div className="flex items-center gap-3 pb-6 border-b border-surface-alt mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center">
            <img src="/LogoCC.svg" alt="Cyber Claw" className="w-8 h-7 object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Terms of Service &amp; Privacy Notice
            </h1>
            <span className="text-xs text-muted">
              Cyber Claw — Version 1.1 (MVP) · PT Infinite Learning Indonesia
            </span>
          </div>
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Introduction</h2>
            <p>
              Cyber Claw is a web-based virus scanner application that leverages the VirusTotal API v3. It is designed for educational purposes and non-commercial use as part of the internship (PKL) project at PT Infinite Learning Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. File Policy &amp; Data Privacy</h2>
            <p>
              Files, URLs, and hashes you submit for scanning are forwarded directly to the VirusTotal service. Please understand that file samples uploaded to VirusTotal may be shared with the international cybersecurity research community in accordance with VirusTotal&apos;s privacy policy. <strong>Uploading files that contain confidential information, personal credentials, or sensitive data is prohibited.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Data Storage on Cyber Claw Servers</h2>
            <p>
              Cyber Claw <strong>does not store copies of your files</strong> on our servers. Files are only held temporarily in memory (RAM) while transmission to VirusTotal takes place and are released immediately afterward. We only store scan metadata (item name, size, hash, and vendor detection summary) for your history.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Limitation of Liability &amp; Accuracy (Disclaimer)</h2>
            <p>
              The analysis results presented are indicative, based on third-party antivirus engine definitions at the time of scanning. A &quot;Clean&quot; result is not an absolute guarantee that the file or link is 100% free of security threats. Users are fully responsible for any actions or decisions taken based on the scan results.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. User Rights Over Data</h2>
            <p>
              You have the right to export your scan history data (Export CSV/JSON) or delete your entire history at any time through the Preferences menu.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-alt flex justify-between items-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand-accent hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.backToDashboard')}</span>
          </Link>

          <span className="text-xs text-muted">
            Powered by VirusTotal API v3
          </span>
        </div>
      </div>
    </div>
  );
};
