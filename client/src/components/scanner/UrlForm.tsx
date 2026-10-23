import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, AlertCircle } from 'lucide-react';

interface UrlFormProps {
  onScan: (url: string) => void;
  disabled?: boolean;
}

export const UrlForm: React.FC<UrlFormProps> = ({ onScan, disabled = false }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (rawInput: string): { valid: boolean; normalized?: string; msg?: string } => {
    let input = rawInput.trim();
    if (!input) {
      return { valid: false };
    }

    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'https://' + input;
    }

    try {
      const parsed = new URL(input);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, msg: 'Only the http:// or https:// scheme is supported.' };
      }

      const host = parsed.hostname.toLowerCase();
      // Block local/private hosts
      if (
        host === 'localhost' ||
        host.startsWith('127.') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
      ) {
        return { valid: false, msg: t('scanner.urlErrPrivate') };
      }

      if (!host.includes('.')) {
        return { valid: false, msg: t('scanner.urlErrHost') };
      }

      return { valid: true, normalized: input };
    } catch {
      return { valid: false, msg: t('scanner.urlErrFormat') };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    if (error) setError(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    const res = validateUrl(url);
    if (!res.valid || !res.normalized) {
      setError(res.msg || t('scanner.urlErrFormat'));
      return;
    }

    onScan(res.normalized);
  };

  const check = validateUrl(url);
  const isValid = url.trim().length > 0 && check.valid;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-accent" />
          <span>{t('dashboard.urlLabel')}</span>
        </label>

        <div className="relative">
          <input
            type="text"
            value={url}
            maxLength={2048}
            onChange={handleInputChange}
            placeholder={t('dashboard.urlPlaceholder')}
            className={`w-full px-4 py-3 rounded-btn bg-surface-alt border text-white font-mono text-sm placeholder:text-muted focus:outline-none transition-colors ${
              error
                ? 'border-status-danger focus:ring-2 focus:ring-status-danger'
                : 'border-surface-alt focus:border-brand-accent focus:ring-2 focus:ring-brand-accent'
            }`}
          />
        </div>

        <p className="text-xs text-muted leading-relaxed">
          {t('dashboard.urlHelp')}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-status-danger/15 border border-status-danger/40 text-status-danger text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || disabled}
        className="w-full py-3.5 rounded-btn bg-[#FF4F79] text-white font-bold text-base tracking-wide uppercase shadow-soft hover:bg-[#d62a63] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all mt-2"
      >
        {t('dashboard.scanNow')}
      </button>
    </form>
  );
};
