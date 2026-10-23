import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { api } from '../lib/api.js';
import { isFinalState } from '../lib/scanState.js';
import { ScanBuffers } from '../components/scanner/ScanBuffers.js';
import { ResultCard } from '../components/scanner/ResultCard.js';
import { ResultReveal } from '../components/scanner/ResultReveal.js';
import { Modal } from '../components/ui/Modal.js';
import { ScanRecord, ScanState } from '../types/index.js';
import { useSettings } from '../context/SettingsContext.js';

export const ScanPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const pickerRef = useRef<HTMLInputElement>(null);

  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  // Play the one-shot "gemash" reveal the first time the finished result lands.
  const [showReveal, setShowReveal] = useState(false);
  const revealShown = useRef(false);
  // Auto-open the full report only once per scan, otherwise returning from the
  // report page would immediately bounce the user back into it.
  const autoOpenedReport = useRef(false);

  // Final state = no need to keep waiting / polling. Single source of truth in
  // lib/scanState.ts, shared with ScanBuffers, so a newly-terminal state can
  // never be recognised in one place but not the other.
  const isFinal = (state?: ScanState) => isFinalState(state);

  const fetchScan = useCallback(async () => {
    if (!scanId) return;
    try {
      const data = await api.getScanDetails(scanId);
      setScan(data);

      // Check auto-open preference (once per scan — see ref comment above).
      if (
        settings.auto_open_report &&
        data.state === 'completed' &&
        !autoOpenedReport.current
      ) {
        autoOpenedReport.current = true;
        navigate(`/scan/${scanId}/report`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Scan not found');
    } finally {
      setLoading(false);
    }
  }, [scanId, settings.auto_open_report, navigate]);

  useEffect(() => {
    // New scan id → allow the auto-open behaviour again for this scan.
    autoOpenedReport.current = false;
    fetchScan();
  }, [fetchScan]);

  // Fire the "gemash" reveal once, the first time the finished result is ready.
  useEffect(() => {
    if (revealShown.current) return;
    if (scan && isFinal(scan.state)) {
      revealShown.current = true;
      setShowReveal(true);
    }
  }, [scan]);

  // Show the BufferCat animation while the scan is not final — either the first
  // fetch has not finished, or the data exists but is still being processed.
  if (loading || (scan && !isFinal(scan.state))) {
    return (
      <ScanBuffers
        scanId={scan?.id || scanId || ''}
        itemLabel={scan?.item_label}
        onComplete={fetchScan}
      />
    );
  }

  if (error || !scan) {
    return (
      <div className="animate-fade-rise flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <h2 className="text-xl font-bold text-status-danger mb-2">{t('scan.notFoundTitle')}</h2>
        <p className="text-sm text-muted mb-4">{error || t('scan.notFoundBody')}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2 rounded-btn bg-brand text-white font-bold text-xs hover:bg-brand-accent transition-colors"
        >
          {t('common.backToDashboard')}
        </button>
      </div>
    );
  }

  // Open the OS file picker from within a click handler so the dialog remains
  // tied to a user gesture (opening it later from a mount effect gets silently
  // blocked by the browser). Once a file is chosen we start the scan and show
  // the BufferCat polling view; if the user cancels we fall back to the file
  // tab on the dashboard.
  const openFilePicker = () => {
    const input = pickerRef.current;
    if (!input) {
      navigate('/dashboard?tab=file&pick=1');
      return;
    }
    // Reset so selecting the same file twice still fires onChange.
    input.value = '';
    input.onclick = () => {
      // Fires when the user dismisses the dialog without choosing a file.
      input.onclick = null;
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        // Cancelled → land on the file tab so the user can pick manually.
        navigate('/dashboard?tab=file');
        return;
      }
      setStarting(true);
      setError(null);
      try {
        const res = await api.scanFile(file);
        if (res?.scanId) {
          // Clear the previous result so ScanPage shows the BufferCat polling
          // view for the new scan instead of the old verdict card.
          setScan(null);
          setLoading(true);
          navigate(`/scan/${res.scanId}`, { replace: true });
          return;
        }
        // API responded without a scanId → go to the dashboard file tab.
        navigate('/dashboard?tab=file');
      } catch (err: any) {
        setError(err?.message || 'Failed to scan the file. Please try again.');
        setStarting(false);
      }
    };
    input.click();
  };

  // "Scan Another" entry point. Respect the upload-consent preference
  // (PRD FR-FILE-06): if the warning is enabled, ask for consent first, then
  // open the picker from the modal's button click (still a valid gesture).
  const handleScanAnother = () => {
    if (settings.show_upload_warning) {
      setShowPrivacyModal(true);
      return;
    }
    openFilePicker();
  };

  const handleConfirmPrivacy = async () => {
    if (dontShowAgain) {
      try {
        await updateSettings({ show_upload_warning: false });
      } catch {
        // Non-fatal — proceed with the scan regardless of the persist failure.
      }
    }
    setShowPrivacyModal(false);
    openFilePicker();
  };

  // Scan finished -> show verdict ResultCard
  return (
    <div className="py-6 sm:py-10">
      {/* Persistent hidden picker for the "Scan Another" flow — kept mounted so
          we can trigger it synchronously from the button's click gesture. */}
      <input
        ref={pickerRef}
        type="file"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {error && (
        <div className="max-w-[1140px] mx-auto mb-4 flex items-center gap-2 p-3 rounded-lg bg-status-danger/15 border border-status-danger/40 text-status-danger text-sm">
          <span>{error}</span>
        </div>
      )}

      {showReveal && <ResultReveal verdict={scan.verdict ?? 'clean'} />}

      <div className={starting ? 'pointer-events-none opacity-60' : ''}>
        <ResultCard scan={scan} onScanAnother={handleScanAnother} />
      </div>

      {/* Upload-consent dialog (PRD FR-FILE-06) — mirrors the one shown in the
          dashboard Dropzone so "Scan Another" stays compliant end-to-end. */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        labelledBy="scan-another-privacy-title"
        panelClassName="max-w-md border-surface-alt"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-status-warning/20 text-status-warning flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 id="scan-another-privacy-title" className="text-lg font-bold text-white">
            {t('dashboard.privacyModalTitle')}
          </h3>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">
          {t('dashboard.privacyModalDesc')}
        </p>

        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-surface-alt bg-surface-alt text-brand focus:ring-brand-accent"
          />
          <span className="text-xs text-muted">{t('dashboard.dontShowAgain')}</span>
        </label>

        <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-surface-alt">
          <button
            type="button"
            onClick={() => setShowPrivacyModal(false)}
            className="px-4 py-2 rounded-btn bg-surface-alt text-white text-sm font-medium hover:bg-surface-alt/70 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirmPrivacy}
            className="px-5 py-2 rounded-btn bg-brand text-white text-sm font-bold hover:bg-brand-accent shadow-soft transition-all"
          >
            {t('common.continue')}
          </button>
        </div>
      </Modal>
    </div>
  );
};
