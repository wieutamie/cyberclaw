import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  Globe,
  Database,
  Trash2,
  Download,
  AlertTriangle,
  CalendarDays,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Sliders,
  XCircle,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.js';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.js';
import { getAllTimezones, groupTimezones, tzOffsetLabel } from '../../lib/timezones.js';
import { LANGUAGES, findLanguage } from '../../lib/languages.js';
import { formatDateTime } from '../../lib/format.js';
import { UserSettings } from '../../types/index.js';

const TIMEZONE_GROUPS = groupTimezones(getAllTimezones());

/** Time-format options paired with a concrete sample (24h vs 12h). */
const TIME_FORMATS: { value: string; sample: string }[] = [
  { value: '24h', sample: '14:30' },
  { value: '12h', sample: '2:30 PM' },
];

export const GeneralPreferences: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useSettings();

  // Date & Time — if a stored timezone is outside the common list (e.g. from an
  // older version), fall back to the default zone so the picker always shows
  // a valid selection.
  const savedTz = settings.timezone || '';
  const [timezone, setTimezone] = useState(
    TIMEZONE_GROUPS.some((g) => g.zones.includes(savedTz)) ? savedTz : 'Asia/Jakarta'
  );
  const [timeFormat, setTimeFormat] = useState<string>(settings.time_format || '24h');

  // History & Retention
  const [retentionDays, setRetentionDays] = useState<number | null>(settings.history_retention_days);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Status feedback toast/msg
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // VirusTotal API Key state
  const [vtApiKey, setVtApiKey] = useState('');
  const [vtKeyMeta, setVtKeyMeta] = useState<{ hasKey: boolean; last4: string | null } | null>(null);
  const [vtKeyLoading, setVtKeyLoading] = useState(false);
  const [vtKeyShow, setVtKeyShow] = useState(false);
  const [vtKeyMsg, setVtKeyMsg] = useState<string | null>(null);
  const [vtTesting, setVtTesting] = useState(false);

  const loadVtKeyMeta = async () => {
    try {
      const meta = await api.getVtApiKeyMeta();
      setVtKeyMeta(meta);
    } catch {
      // not authenticated / no key — ignore
    }
  };

  const handleSaveVtKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vtApiKey.trim()) return;
    setVtKeyLoading(true);
    setVtKeyMsg(null);
    try {
      const result = await api.saveVtApiKey(vtApiKey.trim());
      setVtApiKey('');
      setVtKeyMeta(result);
      setVtKeyMsg(t('preferences.vtKeySaved'));
      showSuccessToast(t('preferences.vtKeySaved'));
    } catch (err: any) {
      setVtKeyMsg(err?.message || t('preferences.vtKeyError'));
    } finally {
      setVtKeyLoading(false);
    }
  };

  const handleRemoveVtKey = async () => {
    try {
      await api.removeVtApiKey();
      setVtKeyMeta({ hasKey: false, last4: null });
      setVtKeyMsg(t('preferences.vtKeyRemoved'));
      showSuccessToast(t('preferences.vtKeyRemoved'));
    } catch (err: any) {
      setVtKeyMsg(err?.message || t('preferences.vtKeyError'));
    }
  };

  const handleTestVtKey = async () => {
    const key = vtApiKey.trim();
    // Nothing typed and nothing saved → nothing to test.
    if (!key && !vtKeyMeta?.hasKey) {
      setVtKeyMsg(t('preferences.vtKeyEnterFirst'));
      return;
    }
    setVtTesting(true);
    setVtKeyMsg(null);
    try {
      // No typed key → backend tests the stored one for this session.
      const result = await api.testVtApiKey(key || undefined);
      setVtKeyMsg(result.valid ? t('preferences.vtKeyValid') : t('preferences.vtKeyInvalid'));
    } catch (err: any) {
      setVtKeyMsg(err?.message || t('preferences.vtKeyError'));
    } finally {
      setVtTesting(false);
    }
  };

  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };
  const showSuccessToast = (msg: string) => showToast(msg, 'success');
  const showErrorToast = (msg: string) => showToast(msg, 'error');

  // Every save goes through here so a failed request always surfaces a message
  // instead of failing silently (the old code awaited updateSettings with no
  // catch — a validation error meant the UI just did nothing).
  const persist = async (updates: Partial<UserSettings>, successMsg?: string) => {
    try {
      await updateSettings(updates);
      if (successMsg) showSuccessToast(successMsg);
      return true;
    } catch (err: any) {
      showErrorToast(err?.message || t('preferences.saveFailed'));
      return false;
    }
  };

  const handleSaveDateTime = async (e: React.FormEvent) => {
    e.preventDefault();
    await persist({ timezone, time_format: timeFormat as any }, t('common.saved'));
  };

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('cyberclaw_language', lang);
    await persist({ language: lang }, t('common.saved'));
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
      window.URL.revokeObjectURL(url);
      showSuccessToast(t('preferences.exported'));
    } catch (err: any) {
      showErrorToast(err?.message || t('preferences.exportFailed'));
    }
  };

  const handleClearHistory = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await api.clearAllHistory();
      setShowClearModal(false);
      showSuccessToast(t('preferences.historyCleared'));
    } catch (err: any) {
      showErrorToast(err?.message || t('preferences.clearFailed'));
    } finally {
      setClearing(false);
    }
  };

  const selectClass =
    'w-full px-3.5 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm focus:border-brand-accent focus:outline-none';
  const labelClass = 'text-xs font-semibold text-muted block mb-1.5';

  useEffect(() => {
    loadVtKeyMeta();
  }, []);

  // Settings load asynchronously (SettingsProvider fetches them after mount), so
  // the local form state must re-sync once the real values arrive — otherwise the
  // pickers would keep showing the defaults and silently overwrite the server
  // values on the next save.
  useEffect(() => {
    if (settings.timezone) {
      setTimezone(
        TIMEZONE_GROUPS.some((g) => g.zones.includes(settings.timezone))
          ? settings.timezone
          : 'Asia/Jakarta'
      );
    }
    if (settings.time_format) setTimeFormat(settings.time_format);
    setRetentionDays(settings.history_retention_days);
  }, [settings.timezone, settings.time_format, settings.history_retention_days]);

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[110] px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-status-danger text-white'
              : 'bg-status-clean text-bg'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.msg}</span>
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

          <ScanPreferencesSection
            settings={settings}
            onPersist={persist}
            t={t}
            selectClass={selectClass}
            labelClass={labelClass}
          />
        </div>

        {/* Right column — History & Retention */}
        <div className="flex flex-col gap-6">
          <VtApiKeySection
            apiKey={vtApiKey}
            setApiKey={setVtApiKey}
            meta={vtKeyMeta}
            show={vtKeyShow}
            setShow={setVtKeyShow}
            msg={vtKeyMsg}
            loading={vtKeyLoading}
            testing={vtTesting}
            onEnter={() => handleSaveVtKey({ preventDefault: () => {} } as any)}
            onRemove={handleRemoveVtKey}
            onTest={handleTestVtKey}
            t={t}
            selectClass={selectClass}
            labelClass={labelClass}
          />
          <HistorySection
            retentionDays={retentionDays}
            onRetentionChange={async (val) => {
              const ok = await persist(
                { history_retention_days: val },
                t('common.saved')
              );
              // Only mirror the value locally when the server actually saved it,
              // so the select can't show a state that was rejected.
              if (ok) setRetentionDays(val);
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
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearHistory}
        clearing={clearing}
        t={t}
      />
    </div>
  );
};


interface CommonProps {
  t: (key: string, options?: Record<string, unknown>) => string;
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


interface ScanPreferencesSectionProps extends CommonProps {
  settings: UserSettings;
  onPersist: (updates: Partial<UserSettings>, successMsg?: string) => Promise<boolean>;
}

/** Toggle row used by the scan preferences card. */
const ToggleRow: React.FC<{
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, help, checked, onChange }) => (
  <div className="flex items-start gap-3 select-none group">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
        checked ? 'bg-brand-accent' : 'bg-surface-alt border border-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    <span className="flex flex-col gap-0.5">
      <span className="text-sm text-white group-hover:text-white">{label}</span>
      {help && <span className="text-[11px] text-muted leading-relaxed">{help}</span>}
    </span>
  </div>
);

const ScanPreferencesSection: React.FC<ScanPreferencesSectionProps> = ({
  settings,
  onPersist,
  t,
  selectClass,
  labelClass,
}) => {
  const [threshold, setThreshold] = useState<number>(settings.danger_threshold ?? 3);

  useEffect(() => {
    if (typeof settings.danger_threshold === 'number') {
      setThreshold(settings.danger_threshold);
    }
  }, [settings.danger_threshold]);

  // Persist the slider value once the drag ends; snap back to the server value
  // if the save is rejected so the UI never claims an unsaved threshold.
  const commitThreshold = async () => {
    const value = threshold;
    const ok = await onPersist({ danger_threshold: value }, t('common.saved'));
    if (!ok) setThreshold(settings.danger_threshold ?? 3);
  };

  return (
    <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
        <Sliders className="w-5 h-5 text-brand-accent" />
        <h3 className="text-base font-bold text-white">{t('preferences.scanPreferences')}</h3>
      </div>

      <div>
        <label className={labelClass}>{t('preferences.defaultTab')}</label>
        <select
          value={settings.default_tab || 'file'}
          onChange={(e) =>
            onPersist(
              { default_tab: e.target.value as UserSettings['default_tab'] },
              t('common.saved')
            )
          }
          className={selectClass}
        >
          <option value="file">{t('preferences.tabFile')}</option>
          <option value="url">{t('preferences.tabUrl')}</option>
          <option value="hash">{t('preferences.tabHash')}</option>
          <option value="history">{t('preferences.tabHistory')}</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>
          {t('preferences.dangerThreshold')} — {threshold}
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          onMouseUp={commitThreshold}
          onTouchEnd={commitThreshold}
          onKeyUp={commitThreshold}
          className="w-full accent-brand-accent cursor-pointer"
          aria-label={t('preferences.dangerThreshold')}
          aria-valuetext={String(threshold)}
        />
        <span className="text-[11px] text-muted mt-1 block leading-relaxed">
          {t('preferences.dangerThresholdHelp')}
        </span>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <ToggleRow
          label={t('preferences.showWarningToggle')}
          checked={!!settings.show_upload_warning}
          onChange={(v) => onPersist({ show_upload_warning: v }, t('common.saved'))}
        />
        <ToggleRow
          label={t('preferences.autoOpenReport')}
          checked={!!settings.auto_open_report}
          onChange={(v) => onPersist({ auto_open_report: v }, t('common.saved'))}
        />
      </div>
    </section>
  );
};

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
        {/* A stored value outside the preset list (e.g. 60) would otherwise make
            the select render blank — surface it as its own option. */}
        {retentionDays !== null && ![30, 90, 365].includes(retentionDays) && (
          <option value={String(retentionDays)}>
            {t('preferences.retentionDays', { days: retentionDays })}
          </option>
        )}
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

interface VtApiKeySectionProps {
  apiKey: string;
  setApiKey: (v: string) => void;
  meta: { hasKey: boolean; last4: string | null } | null;
  show: boolean;
  setShow: (v: boolean) => void;
  msg: string | null;
  loading: boolean;
  testing: boolean;
  onEnter: () => void;
  onRemove: () => void;
  onTest: () => void;
  t: (key: string) => string;
  selectClass: string;
  labelClass: string;
}

const VtApiKeySection: React.FC<VtApiKeySectionProps> = ({
  apiKey,
  setApiKey,
  meta,
  show,
  setShow,
  msg,
  loading,
  testing,
  onEnter,
  onRemove,
  onTest,
  t,
  labelClass,
}) => (
  <section className="bg-surface border border-surface-alt rounded-card p-6 shadow-card flex flex-col gap-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-alt">
      <ShieldCheck className="w-5 h-5 text-brand-accent" />
      <h3 className="text-base font-bold text-white">{t('preferences.vtApiKeyTitle')}</h3>
    </div>

    <p className="text-xs text-muted leading-relaxed">{t('preferences.vtApiKeyDesc')}</p>

    {meta?.hasKey && (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-clean/10 border border-status-clean/30 text-status-clean text-xs font-medium">
        <Key className="w-3.5 h-3.5 shrink-0" />
        <span>
          {t('preferences.vtKeyActive')} · ···{meta.last4}
        </span>
      </div>
    )}

    <div>
      <label className={labelClass}>{t('preferences.vtApiKeyLabel')}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t('preferences.hashPlaceholder')}
          className="w-full px-3.5 py-2.5 pr-10 rounded-btn bg-surface-alt border border-surface-alt text-white text-sm font-mono focus:border-brand-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
          aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        onClick={onEnter}
        disabled={loading || !apiKey.trim()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-brand-accent text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-accent/80 transition-colors"
      >
        <Key className="w-3.5 h-3.5" />
        <span>{t('preferences.vtKeySave')}</span>
      </button>

      <button
        onClick={onTest}
        disabled={testing || loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-surface-alt border border-surface-alt text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-alt/80 transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{t('preferences.vtKeyTest')}</span>
      </button>

      {meta?.hasKey && (
        <button
          onClick={onRemove}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-status-danger/20 border border-status-danger/40 text-status-danger text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-danger hover:text-white transition-colors"
        >
          <span>{t('preferences.vtKeyRemove')}</span>
        </button>
      )}
    </div>

    {msg && (
      <p
        className={`text-xs font-medium ${
          msg.includes('Valid') || msg.includes('Berhasil') || msg.includes('saved') || msg.includes('removed')
            ? 'text-status-clean'
            : 'text-status-danger'
        }`}
      >
        {msg}
      </p>
    )}

    <p className="text-xs text-muted">{t('preferences.vtKeyHint')}</p>
  </section>
);

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clearing: boolean;
  t: (key: string) => string;
}

const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  clearing,
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

    <div className="flex justify-end gap-3 mt-2">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-btn bg-surface-alt text-white text-xs font-medium"
      >
        {t('common.cancel')}
      </button>
      <button
        disabled={clearing}
        onClick={onConfirm}
        className="px-4 py-2 rounded-btn bg-status-danger text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-danger/80"
      >
        {clearing ? t('common.loading') : t('preferences.deletePermanently')}
      </button>
    </div>
  </Modal>
);

