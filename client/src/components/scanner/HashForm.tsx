import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Hash, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HashFormProps {
  onScan: (hash: string) => void;
  disabled?: boolean;
}

export const HashForm: React.FC<HashFormProps> = ({ onScan, disabled = false }) => {
  const { t } = useTranslation();
  const [hash, setHash] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detectHashType = (val: string): 'MD5' | 'SHA-1' | 'SHA-256' | null => {
    const clean = val.trim();
    if (/^[a-fA-F0-9]{32}$/.test(clean)) return 'MD5';
    if (/^[a-fA-F0-9]{40}$/.test(clean)) return 'SHA-1';
    if (/^[a-fA-F0-9]{64}$/.test(clean)) return 'SHA-256';
    return null;
  };

  const detectedType = detectHashType(hash);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = hash.trim().toLowerCase();

    if (!detectedType) {
      setError('Invalid hash format. Use MD5 (32 hex), SHA-1 (40 hex), or SHA-256 (64 hex).');
      return;
    }

    onScan(clean);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-accent" />
            <span>{t('dashboard.hashLabel')}</span>
          </label>
          {detectedType && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/20 text-brand-accent border border-brand-accent/40 animate-in fade-in">
              <CheckCircle2 className="w-3 h-3" />
              <span>{detectedType}</span>
            </span>
          )}
        </div>

        <input
          type="text"
          value={hash}
          onChange={(e) => {
            setHash(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('dashboard.hashPlaceholder')}
          className={`w-full px-4 py-3 rounded-btn bg-surface-alt border text-white font-mono text-sm placeholder:text-muted focus:outline-none transition-colors ${
            error
              ? 'border-status-danger focus:ring-2 focus:ring-status-danger'
              : 'border-surface-alt focus:border-brand-accent focus:ring-2 focus:ring-brand-accent'
          }`}
        />

        <p className="text-xs text-muted leading-relaxed">
          {t('dashboard.hashHelp')}
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
        disabled={!detectedType || disabled}
        className="w-full py-3.5 rounded-btn bg-[#FF4F79] text-white font-bold text-base tracking-wide uppercase shadow-soft hover:bg-[#d62a63] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all mt-2"
      >
        {t('dashboard.scanNow')}
      </button>
    </form>
  );
};
