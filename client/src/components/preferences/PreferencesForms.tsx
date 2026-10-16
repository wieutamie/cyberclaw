import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Sliders,
  Database,
  Trash2,
  Download,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.js';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.js';

export const GeneralPreferences: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useSettings();

  // Date & Time
  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Jakarta');
  const [dateFormat, setDateFormat] = useState(settings.date_format || 'DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState(settings.time_format || '24h');

  // Scan Preferences
  const [defaultTab, setDefaultTab] = useState(settings.default_tab || 'file');
  const [threshold, setThreshold] = useState(settings.danger_threshold || 3);
  const [showWarning, setShowWarning] = useState(settings.show_upload_warning);
  const [autoOpen, setAutoOpen] = useState(settings.auto_open_report);

  // History & Retention
  const [retentionDays, setRetentionDays] = useState<number | null>(settings.history_retention_days);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);

  // Status feedback toast/msg
  const [toast, setToast] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveDateTime = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      timezone,
      date_format: dateFormat as any,
      time_format: timeFormat as any,
    });
    showSuccessToast(t('common.saved'));
  };

  const handleSaveScanPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      default_tab: defaultTab as any,
      danger_threshold: Number(threshold),
      show_upload_warning: showWarning,
      auto_open_report: autoOpen,
    });
    showSuccessToast(t('common.saved'));
  };

  const handleLanguageChange = async (lang: 'id' | 'en') => {
    i18n.changeLanguage(lang);
    await updateSettings({ language: lang });
    showSuccessToast(t('common.saved'));
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportCsv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyberclaw_history_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export CSV error:', err);
    }
  };

  const handleClearHistory = async () => {
    if (deleteConfirmText === 'DELETE') {
      await api.clearAllHistory();
      setShowClearModal(false);
      setDeleteConfirmText('');
      showSuccessToast('All history has been deleted');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-status-clean text-bg font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-bg" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Date & Time */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
          <Clock className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-bold text-white">
            {t('preferences.dateTime')}
          </h3>
        </div>

        <form onSubmit={handleSaveDateTime} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Time Zone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none"
              >
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                <option value="UTC">UTC (Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Time Format
              </label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none"
              >
                <option value="24h">24 Jam (14:30)</option>
                <option value="12h">12 Jam AM/PM (02:30 PM)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-btn bg-brand hover:bg-brand-accent text-white font-bold text-xs shadow-soft transition-all"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </section>

      {/* 3. Scan Preferences */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
          <Sliders className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-bold text-white">
            {t('preferences.scanPreferences')}
          </h3>
        </div>

        <form onSubmit={handleSaveScanPrefs} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Tab Default Dashboard
              </label>
              <select
                value={defaultTab}
                onChange={(e) => setDefaultTab(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none"
              >
                <option value="file">Scan File</option>
                <option value="url">Scan URL</option>
                <option value="hash">Scan Hash</option>
                <option value="history">History</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                {t('preferences.dangerThreshold')}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted mt-1 block">
                {t('preferences.dangerThresholdHelp')}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showWarning}
                onChange={(e) => setShowWarning(e.target.checked)}
                className="w-4 h-4 rounded border-surface-alt bg-surface-alt text-brand focus:ring-brand-accent"
              />
              <span className="text-sm text-gray-200">
                {t('preferences.showWarningToggle')}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoOpen}
                onChange={(e) => setAutoOpen(e.target.checked)}
                className="w-4 h-4 rounded border-surface-alt bg-surface-alt text-brand focus:ring-brand-accent"
              />
              <span className="text-sm text-gray-200">
                {t('preferences.autoOpenReport')}
              </span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-btn bg-brand hover:bg-brand-accent text-white font-bold text-xs shadow-soft transition-all"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </section>

      {/* 4. Language */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
          <Globe className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-bold text-white">
            {t('preferences.language')}
          </h3>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleLanguageChange('id')}
            className={`flex-1 py-2.5 px-4 rounded-btn border text-sm font-semibold transition-all ${
              i18n.language === 'id'
                ? 'border-brand bg-brand/20 text-white shadow-soft'
                : 'border-surface-alt bg-surface-alt text-gray-300 hover:bg-surface-alt/80'
            }`}
          >
            🇮🇩 Bahasa Indonesia
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`flex-1 py-2.5 px-4 rounded-btn border text-sm font-semibold transition-all ${
              i18n.language === 'en'
                ? 'border-brand bg-brand/20 text-white shadow-soft'
                : 'border-surface-alt bg-surface-alt text-gray-300 hover:bg-surface-alt/80'
            }`}
          >
            🇬🇧 English (Default)
          </button>
        </div>
      </section>

      {/* 5. Scan History Management */}
      <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
          <Database className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-bold text-white">
            {t('preferences.historyRetention')}
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-1/2">
            <label className="text-xs font-semibold text-muted block mb-1.5">
              History Retention Period
            </label>
            <select
              value={retentionDays === null ? 'null' : String(retentionDays)}
              onChange={async (e) => {
                const val = e.target.value === 'null' ? null : Number(e.target.value);
                setRetentionDays(val);
                await updateSettings({ history_retention_days: val });
                showSuccessToast(t('common.saved'));
              }}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days (Default)</option>
              <option value="365">1 Year</option>
              <option value="null">Forever (never deleted)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-4 sm:pt-0">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-surface-alt border border-brand-accent text-white text-xs font-semibold hover:bg-brand-accent transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('preferences.exportCsv')}</span>
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-status-danger/20 border border-status-danger/40 text-status-danger text-xs font-semibold hover:bg-status-danger hover:text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('preferences.clearHistory')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal for Clear History */}
      <Modal
        isOpen={showClearModal}
        onClose={() => {
          setShowClearModal(false);
          setDeleteConfirmText('');
        }}
        labelledBy="clear-history-title"
        panelClassName="max-w-md border-status-danger"
      >
        <div className="flex items-center gap-3 text-status-danger">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 id="clear-history-title" className="text-lg font-bold">
            {t('preferences.clearHistory')}
          </h3>
        </div>

        <p className="text-sm text-gray-300">
          This action is permanent and will delete all scan data stored in your account.
        </p>

        <p className="text-xs text-muted font-medium">
          {t('preferences.clearHistoryConfirm')}:
        </p>

        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="DELETE"
          className="px-3.5 py-2.5 rounded-btn bg-surface-alt border border-status-danger font-mono text-center text-sm font-bold text-white focus:outline-none"
        />

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={() => {
              setShowClearModal(false);
              setDeleteConfirmText('');
            }}
            className="px-4 py-2 rounded-btn bg-surface-alt text-white text-xs font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={deleteConfirmText !== 'DELETE'}
            onClick={handleClearHistory}
            className="px-4 py-2 rounded-btn bg-status-danger text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-danger/80"
          >
            Delete Permanently
          </button>
        </div>
      </Modal>
    </div>
  );
};

export const ApiKeyPreferences: React.FC = () => {
  const { t } = useTranslation();
  const { apiKeyMeta, refreshApiKeyMeta } = useSettings();

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean } | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // The stored key is blurred by default; the eye toggle un-blurs it.
  const [revealKey, setRevealKey] = useState(false);

  const isFormatValid = /^[a-fA-F0-9]{64}$/.test(inputKey.trim());

  const handleSave = async () => {
    if (!inputKey.trim()) return;
    try {
      await api.saveApiKey(inputKey.trim());
      await refreshApiKeyMeta();
      setInputKey('');
      setMsg({ type: 'success', text: 'VirusTotal API Key saved and encrypted with AES-256-GCM.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save API Key' });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const valid = await api.testApiKey(inputKey.trim() || undefined);
      setTestResult({ valid });
    } catch {
      setTestResult({ valid: false });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove this API Key?')) {
      await api.removeApiKey();
      await refreshApiKeyMeta();
      setMsg({ type: 'success', text: 'API Key removed successfully.' });
    }
  };

  return (
    <div className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-surface-alt">
        <Key className="w-5 h-5 text-brand-accent" />
        <h3 className="text-base font-bold text-white">
          {t('preferences.vtApiKey')}
        </h3>
      </div>

      {/* Active Masked Key Info */}
      {apiKeyMeta.hasKey && (
        <div className="p-4 rounded-xl bg-surface-alt/70 border border-surface-alt flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted font-medium">Current Active Key:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`font-mono text-white text-sm font-semibold tracking-wider transition-all duration-200 ${
                  revealKey ? 'blur-0 select-text' : 'blur-[6px] select-none'
                }`}
                aria-hidden={!revealKey}
              >
                ••••••••••••••••••••••••{apiKeyMeta.last4 || '••••'}
              </span>
              <button
                type="button"
                onClick={() => setRevealKey((v) => !v)}
                aria-label={revealKey ? 'Hide key' : 'Show key'}
                aria-pressed={revealKey}
                className="text-muted hover:text-white transition-colors"
              >
                {revealKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-muted mt-1">
              Key is stored encrypted (AES-256-GCM) and hidden by default.
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="px-3.5 py-1.5 rounded-btn bg-status-danger/15 border border-status-danger/40 text-status-danger hover:bg-status-danger hover:text-white text-xs font-semibold transition-colors"
          >
            {t('preferences.removeKey')}
          </button>
        </div>
      )}

      {/* Input New / Update Key */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted">
          Enter New VirusTotal API Key (64 hexadecimal characters)
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setTestResult(null);
              setMsg(null);
            }}
            placeholder="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
            className="w-full pl-4 pr-12 py-3 rounded-btn bg-surface-alt border border-surface-alt font-mono text-sm text-white placeholder:text-muted focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            aria-pressed={showKey}
            className="absolute right-3.5 top-3.5 text-muted hover:text-white transition-colors"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {msg && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
            msg.type === 'success'
              ? 'bg-status-clean/20 text-status-clean border border-status-clean/40'
              : 'bg-status-danger/20 text-status-danger border border-status-danger/40'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
            testResult.valid
              ? 'bg-status-clean/20 text-status-clean border border-status-clean/40'
              : 'bg-status-danger/20 text-status-danger border border-status-danger/40'
          }`}
        >
          {testResult.valid ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>
            {testResult.valid
              ? 'API Key is VALID! Connected to VirusTotal v3.'
              : 'API Key is INVALID or quota exceeded.'}
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isFormatValid}
          className="flex-1 py-2.5 px-4 rounded-btn bg-brand hover:bg-brand-accent text-white font-bold text-sm shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {t('preferences.saveKey')}
        </button>

        <button
          onClick={handleTest}
          disabled={testing || (!inputKey && !apiKeyMeta.hasKey)}
          className="py-2.5 px-6 rounded-btn bg-surface-alt border border-brand-accent text-white font-semibold text-sm hover:bg-brand-accent transition-colors disabled:opacity-40"
        >
          {testing ? 'Testing...' : t('preferences.testKey')}
        </button>
      </div>

      {/* Helper text */}
      <div className="text-xs text-muted leading-relaxed pt-2 border-t border-surface-alt">
        <p>{t('preferences.keyHelper')}</p>
        {/* Opens the VirusTotal API-key page in a new tab so users can obtain a
            key there — the app never asks for the key on this button. */}
        <a
          href="https://www.virustotal.com/gui/my-apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-btn bg-brand hover:bg-brand-accent text-white font-semibold text-xs shadow-soft transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{t('preferences.getApiKey')}</span>
        </a>
      </div>
    </div>
  );
};
