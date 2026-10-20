import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Globe, Fingerprint, History, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.js';
import { Dropzone } from '../components/scanner/Dropzone.js';
import { UrlForm } from '../components/scanner/UrlForm.js';
import { HashForm } from '../components/scanner/HashForm.js';
import { HistoryTable } from '../components/scanner/HistoryTable.js';
import { ScanTabBar, ScanTabKey } from '../components/scanner/ScanTabBar.js';

type TabKey = ScanTabKey;

const TABS: { key: TabKey; icon: React.ElementType }[] = [
  { key: 'file', icon: FileText },
  { key: 'url', icon: Globe },
  { key: 'hash', icon: Fingerprint },
  { key: 'history', icon: History },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>('file');
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Sync tab with ?tab= deep links (e.g. from Analytics / History links)
  useEffect(() => {
    const requested =
      (searchParams.get('tab') as TabKey) || (settings.default_tab as TabKey) || 'file';
    if (TABS.some((tab) => tab.key === requested)) {
      setActiveTab(requested);
    }
  }, [searchParams, settings.default_tab]);

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  // When arriving from "Scan Another" (?tab=file&pick=1), auto-open the native
  // file picker so the user lands straight in the OS chooser (File Explorer).
  const autoOpenPicker = activeTab === 'file' && searchParams.get('pick') === '1';

  // Left/Right arrow keyboard navigation for the tablist (PRD 3.2.1)
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    selectTab(TABS[next].key);
  };

  const goToScan = (res?: { scanId?: string } | null) => {
    if (res?.scanId) {
      navigate(`/scan/${res.scanId}`);
      return true;
    }
    return false;
  };

  const handleScanFile = async (file: File) => {
    setBusy(true);
    setScanError(null);
    try {
      const res = await api.scanFile(file);
      if (!goToScan(res)) {
        setScanError('Failed to start the scan. Please try again.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'Failed to start the file scan. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleScanUrl = async (url: string) => {
    setBusy(true);
    setScanError(null);
    try {
      const res = await api.scanUrl(url);
      if (!goToScan(res)) {
        setScanError('Failed to start the scan. Please try again.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'Failed to scan the URL. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleScanHash = async (hash: string) => {
    setBusy(true);
    setScanError(null);
    try {
      const res = await api.scanHash(hash);
      if (!goToScan(res)) {
        setScanError('Failed to start the scan. Please try again.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'Failed to scan the hash. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col justify-center py-2 md:py-4">
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left: hero copy — balanced ~50:50 with the scanner panel */}
        <section className="md:col-span-6 flex flex-col justify-center gap-4 md:gap-5 animate-fade-rise order-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white leading-tight whitespace-pre-line">
            {t('dashboard.heroTitle')}
          </h1>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md text-justify">
            {t('dashboard.heroDesc')}
          </p>
        </section>

        {/* Right: scanner card — balanced ~50:50 with the hero copy */}
        <section className="md:col-span-6 animate-fade-rise [animation-delay:80ms] order-2">
          {/* Top padding gives the active tab's disc room to bulge above the
              bar; overflow stays visible so the bump isn't clipped. */}
          <div className="relative pt-16">

            {/* Pink pill tab bar (icons bulge up on the active tab) */}
            <ScanTabBar
              tabs={TABS}
              activeTab={activeTab}
              onSelect={selectTab}
              onKeyDown={handleTabKeyDown}
            />

            {/* Panel body */}
            <div
              role="tabpanel"
              className={`pt-6 transition-opacity ${
                busy ? 'opacity-60 pointer-events-none' : 'opacity-100'
              }`}
            >
            {activeTab === 'file' && (
              <Dropzone
                onScan={handleScanFile}
                disabled={busy}
                autoOpen={autoOpenPicker}
                onAutoOpenConsumed={() => {
                  // Clear the one-shot ?pick flag so a later reload or tab change
                  // doesn't re-trigger the OS file dialog.
                  if (searchParams.get('pick') === '1') {
                    const next = new URLSearchParams(searchParams);
                    next.delete('pick');
                    setSearchParams(next, { replace: true });
                  }
                }}
              />
            )}
            {activeTab === 'url' && <UrlForm onScan={handleScanUrl} disabled={busy} />}
            {activeTab === 'hash' && <HashForm onScan={handleScanHash} disabled={busy} />}
            {activeTab === 'history' && <HistoryTable />}

            {scanError && activeTab !== 'history' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-status-danger/15 border border-status-danger/40 text-status-danger text-sm mt-4 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {activeTab !== 'history' && (
              <p className="text-xs text-muted text-center leading-relaxed mt-5 max-w-md mx-auto">
                {t('dashboard.submitDisclaimer')}
              </p>
            )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
