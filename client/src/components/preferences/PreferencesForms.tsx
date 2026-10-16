import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  Globe,
  Sliders,
  Database,
  Trash2,
  Download,
  AlertTriangle,
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
