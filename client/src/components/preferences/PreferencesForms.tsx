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
  CalendarDays,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.js';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.js';
import { getAllTimezones, groupTimezones, tzOffsetLabel } from '../../lib/timezones.js';
import { LANGUAGES, findLanguage } from '../../lib/languages.js';
import { formatDateTime } from '../../lib/format.js';

const TIMEZONE_GROUPS = groupTimezones(getAllTimezones());

/** Time-format options paired with a concrete sample (24h vs 12h). */
const TIME_FORMATS: { value: string; sample: string }[] = [
  { value: '24h', sample: '14:30' },
  { value: '12h', sample: '2:30 PM' },
];

export const GeneralPreferences: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useSettings();

  // Date & Time
  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Jakarta');
  const [timeFormat, setTimeFormat] = useState<string>(settings.time_format || '24h');

  // Scan Preferences
  const [defaultTab, setDefaultTab] = useState<string>(settings.default_tab || 'file');
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

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('cyberclaw_language', lang);
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
      showSuccessToast(t('preferences.historyCleared'));
    }
  };

  const selectClass =
    'w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none';
  const labelClass = 'text-xs font-semibold text-muted block mb-1.5';

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-status-clean text-bg font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-bg" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column — Date & Time + Language */}
        <div className="flex flex-col gap-6">
          <DateTimeSection
            timezone={timezone}
            setTimezone={setTimezone}
            timeFormat={timeFormat}
            setTimeFormat={setTimeFormat}
            onSubmit={handleSaveDateTime}
            t={t}
            selectClass={selectClass}
            labelClass={labelClass}
          />

          <LanguageSection
            current={findLanguage(i18n.language)?.code || 'en'}
            onChange={handleLanguageChange}
            t={t}
            selectClass={selectClass}
            labelClass={labelClass}
          />
        </div>

        {/* Right column — Scan Preferences + History & Retention */}
        <div className="flex flex-col gap-6">
          <ScanSection
            defaultTab={defaultTab}
            setDefaultTab={setDefaultTab}
            threshold={threshold}
            setThreshold={setThreshold}
            showWarning={showWarning}
            setShowWarning={setShowWarning}
            autoOpen={autoOpen}
            setAutoOpen={setAutoOpen}
            onSubmit={handleSaveScanPrefs}
            t={t}
            selectClass={selectClass}
            labelClass={labelClass}
          />

          <HistorySection
            retentionDays={retentionDays}
            onRetentionChange={async (val) => {
              setRetentionDays(val);
              await updateSettings({ history_retention_days: val });
              showSuccessToast(t('common.saved'));
            }}
            onExport={handleExportCsv}
            onClear={() => setShowClearModal(true)}
            t={t}
            selectClass={selectClass}
            labelClass={labelClass}
          />
        </div>
      </div>

      <ClearHistoryModal
        isOpen={showClearModal}
        onClose={() => {
          setShowClearModal(false);
          setDeleteConfirmText('');
        }}
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
        onConfirm={handleClearHistory}
        t={t}
      />
    </div>
  );
};


interface CommonProps {
  t: (key: string) => string;
  selectClass: string;
  labelClass: string;
}

interface DateTimeSectionProps extends CommonProps {
  timezone: string;
  setTimezone: (v: string) => void;
  timeFormat: string;
  setTimeFormat: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  timezone,
  setTimezone,
  timeFormat,
  setTimeFormat,
  onSubmit,
  t,
  selectClass,
  labelClass,
}) => (
  <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
      <Clock className="w-5 h-5 text-brand-accent" />
      <h3 className="text-base font-bold text-white">{t('preferences.dateTime')}</h3>
    </div>

    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>{t('preferences.timezone')}</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
          {TIMEZONE_GROUPS.map((group) => (
            <optgroup key={group.region} label={group.region}>
              {group.zones.map((zone) => {
                const offset = tzOffsetLabel(zone);
                return (
                  <option key={zone} value={zone}>
                    {zone.replace(/_/g, ' ')}
                    {offset ? ` (${offset})` : ''}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
        <span className="text-[11px] text-muted mt-1 block">
          {t('preferences.dateFormatAuto')}
        </span>
      </div>

      <div>
        <label className={labelClass}>{t('preferences.timeFormat')}</label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('preferences.timeFormat')}>
          {TIME_FORMATS.map((fmt) => {
            const active = timeFormat === fmt.value;
            return (
              <button
                key={fmt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTimeFormat(fmt.value)}
                className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-btn border text-left transition-colors ${
                  active
                    ? 'border-brand-accent bg-brand-accent/15'
                    : 'border-surface-alt bg-surface-alt hover:border-brand-accent/50'
                }`}
              >
                <span className="text-sm font-bold font-mono text-white">{fmt.sample}</span>
                <span className="text-[11px] text-muted">
                  {fmt.value === '24h' ? t('preferences.timeFormat24') : t('preferences.timeFormat12')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live preview — shows exactly how timestamps will render everywhere */}
      <div className="flex items-center gap-3 rounded-btn bg-surface-alt border border-surface-alt px-4 py-3">
        <CalendarDays className="w-4 h-4 text-brand-accent shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">
            {t('preferences.dateTimePreview')}
          </span>
          <span className="text-sm font-mono text-white">
            {formatDateTime(new Date(), timezone, timeFormat as '12h' | '24h')}
          </span>
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
);

interface LanguageSectionProps extends CommonProps {
  current: string;
  onChange: (lang: string) => void;
}

const LanguageSection: React.FC<LanguageSectionProps> = ({
  current,
  onChange,
  t,
  selectClass,
  labelClass,
}) => (
  <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
      <Globe className="w-5 h-5 text-brand-accent" />
      <h3 className="text-base font-bold text-white">{t('preferences.language')}</h3>
    </div>

    <div>
      <label className={labelClass}>{t('preferences.displayLanguage')}</label>
      <select value={current} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
            {lang.code === 'en' ? ` — ${t('preferences.defaultLabel')}` : ''}
          </option>
        ))}
      </select>
      <span className="text-[11px] text-muted mt-1 block">{t('preferences.languageHelp')}</span>
    </div>
  </section>
);


interface ScanSectionProps extends CommonProps {
  defaultTab: string;
  setDefaultTab: (v: string) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  showWarning: boolean;
  setShowWarning: (v: boolean) => void;
  autoOpen: boolean;
  setAutoOpen: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ScanSection: React.FC<ScanSectionProps> = ({
  defaultTab,
  setDefaultTab,
  threshold,
  setThreshold,
  showWarning,
  setShowWarning,
  autoOpen,
  setAutoOpen,
  onSubmit,
  t,
  selectClass,
  labelClass,
}) => (
  <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
      <Sliders className="w-5 h-5 text-brand-accent" />
      <h3 className="text-base font-bold text-white">{t('preferences.scanPreferences')}</h3>
    </div>

    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>{t('preferences.defaultTab')}</label>
        <select
          value={defaultTab}
          onChange={(e) => setDefaultTab(e.target.value)}
          className={selectClass}
        >
          <option value="file">{t('preferences.tabFile')}</option>
          <option value="url">{t('preferences.tabUrl')}</option>
          <option value="hash">{t('preferences.tabHash')}</option>
          <option value="history">{t('preferences.tabHistory')}</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>{t('preferences.dangerThreshold')}</label>
        <input
          type="number"
          min={1}
          max={10}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className={selectClass}
        />
        <span className="text-[11px] text-muted mt-1 block">
          {t('preferences.dangerThresholdHelp')}
        </span>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showWarning}
            onChange={(e) => setShowWarning(e.target.checked)}
            className="w-4 h-4 rounded border-surface-alt bg-surface-alt text-brand focus:ring-brand-accent"
          />
          <span className="text-sm text-gray-200">{t('preferences.showWarningToggle')}</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoOpen}
            onChange={(e) => setAutoOpen(e.target.checked)}
            className="w-4 h-4 rounded border-surface-alt bg-surface-alt text-brand focus:ring-brand-accent"
          />
          <span className="text-sm text-gray-200">{t('preferences.autoOpenReport')}</span>
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
);


interface HistorySectionProps extends CommonProps {
  retentionDays: number | null;
  onRetentionChange: (val: number | null) => void;
  onExport: () => void;
  onClear: () => void;
}

const HistorySection: React.FC<HistorySectionProps> = ({
  retentionDays,
  onRetentionChange,
  onExport,
  onClear,
  t,
  selectClass,
  labelClass,
}) => (
  <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
      <Database className="w-5 h-5 text-brand-accent" />
      <h3 className="text-base font-bold text-white">{t('preferences.historyRetention')}</h3>
    </div>

    <div>
      <label className={labelClass}>{t('preferences.retentionPeriod')}</label>
      <select
        value={retentionDays === null ? 'null' : String(retentionDays)}
        onChange={(e) => onRetentionChange(e.target.value === 'null' ? null : Number(e.target.value))}
        className={selectClass}
      >
        <option value="30">{t('preferences.retention30')}</option>
        <option value="90">{t('preferences.retention90')}</option>
        <option value="365">{t('preferences.retention365')}</option>
        <option value="null">{t('preferences.retentionForever')}</option>
      </select>
    </div>

    <div className="flex items-center gap-3 flex-wrap pt-2">
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-surface-alt border border-brand-accent text-white text-xs font-semibold hover:bg-brand-accent transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>{t('preferences.exportCsv')}</span>
      </button>

      <button
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-status-danger/20 border border-status-danger/40 text-status-danger text-xs font-semibold hover:bg-status-danger hover:text-white transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>{t('preferences.clearHistory')}</span>
      </button>
    </div>
  </section>
);

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  isOpen,
  onClose,
  confirmText,
  setConfirmText,
  onConfirm,
  t,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    labelledBy="clear-history-title"
    panelClassName="max-w-md border-status-danger"
  >
    <div className="flex items-center gap-3 text-status-danger">
      <AlertTriangle className="w-6 h-6 shrink-0" />
      <h3 id="clear-history-title" className="text-lg font-bold">
        {t('preferences.clearHistory')}
      </h3>
    </div>

    <p className="text-sm text-gray-300">{t('preferences.clearHistoryWarning')}</p>

    <p className="text-xs text-muted font-medium">{t('preferences.clearHistoryConfirm')}:</p>

    <input
      type="text"
      value={confirmText}
      onChange={(e) => setConfirmText(e.target.value)}
      placeholder="DELETE"
      className="px-3.5 py-2.5 rounded-btn bg-surface-alt border border-status-danger font-mono text-center text-sm font-bold text-white focus:outline-none"
    />

    <div className="flex justify-end gap-3 mt-2">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-btn bg-surface-alt text-white text-xs font-medium"
      >
        {t('common.cancel')}
      </button>
      <button
        disabled={confirmText !== 'DELETE'}
        onClick={onConfirm}
        className="px-4 py-2 rounded-btn bg-status-danger text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-danger/80"
      >
        {t('preferences.deletePermanently')}
      </button>
    </div>
  </Modal>
);

