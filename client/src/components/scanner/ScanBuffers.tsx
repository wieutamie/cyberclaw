import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api.js';
import { isFinalState } from '../../lib/scanState.js';

interface ScanBuffersProps {
  scanId: string;
  itemLabel?: string;
  onComplete: () => void;
}

export const ScanBuffers: React.FC<ScanBuffersProps> = ({
  scanId,
  itemLabel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const initialSubStatus = () => {
    if (!itemLabel) return t('scan.analyzing');
    const trimmed = itemLabel.trim();
    if (/^[a-fA-F0-9]{32,64}$/.test(trimmed)) return t('scan.lookingUp');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return t('scan.analyzing');
    return t('scan.uploading');
  };

  const [subStatus, setSubStatus] = useState<string>(initialSubStatus);
  const [timedOut, setTimedOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // When the result is ready: play the BufferCat 360° spin once before continuing.
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    let timerId: any = null;
    let finishId: any = null;
    const startTime = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const checkStatus = async () => {
      if (Date.now() - startTime >= TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }

      try {
        const res = await api.getScanStatus(scanId);

        if (isFinalState(res.state)) {
          // Putar BufferCat sekali, lalu tampilkan hasil. Dijaga singkat (280ms)
          // supaya hasil yang sudah siap tidak terasa tertahan.
          setFinishing(true);
          finishId = setTimeout(onComplete, 280);
          return;
        }

        if (res.progressLabel) {
          setSubStatus(res.progressLabel);
        }

        // Poll every 700ms so the UI flips the moment the server has the result.
        timerId = setTimeout(checkStatus, 700);
      } catch (err: any) {
        console.error('Polling error:', err);
        setErrorMsg(err.message || 'Failed to check status');
        timerId = setTimeout(checkStatus, 2000);
      }
    };

    checkStatus();

    return () => {
      if (timerId) clearTimeout(timerId);
      if (finishId) clearTimeout(finishId);
    };
  }, [scanId, onComplete]);

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-status-warning/20 text-status-warning flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          {t('scan.slowAnalysisTitle')}
        </h2>
        <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
          {t('scan.slowAnalysisDesc')}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-btn bg-surface-alt border border-brand-accent text-white font-medium text-sm hover:bg-brand-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('scan.tryAgain')}</span>
          </button>
          <button
            onClick={() => navigate('/dashboard?tab=history')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-btn bg-brand text-white font-bold text-sm hover:bg-brand-accent transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('scan.viewInHistory')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 sm:p-6 animate-in fade-in">
      {/* Translucent panel — the scanning "stage". Kept flat and see-through:
          no coloured edge glow, no tinted drop shadow, just a soft frosted
          surface so the BufferCat illustration stays the focal point. */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#602F4B]/25 px-6 py-12 sm:px-14 sm:py-16 text-center backdrop-blur-sm">

        {/* ---- Foreground content ---- (the oversized BufferCat watermark that
            sat behind this content was removed — it read as an ugly dark blob) */}
        <div className="relative z-10 flex flex-col items-center">
          {/* BufferCat: swings left/right while scanning, then spins 360° once
              the result is ready. */}
          <div className="relative mb-1 sm:mb-2 flex items-center justify-center">
            <img
              src="/BufferCat.svg"
              alt="BufferCat"
              className={`w-28 sm:w-36 h-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] ${
                finishing ? 'animate-cat-spin' : 'animate-cat-swing'
              }`}
            />
          </div>

          {/* Main scanning text with animated dots — sits symmetrically centred
              directly below the BufferCat illustration. */}
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center justify-center">
            <span>{t('scan.scanningTitle')}</span>
            <span className="dot-1">.</span>
            <span className="dot-2">.</span>
            <span className="dot-3">.</span>
          </h2>

          {/* Static description under the "Scanning..." heading (matches design) */}
          <p className="text-sm text-gray-300 mt-2 max-w-xs sm:max-w-sm leading-relaxed">
            {t('scan.scanningDesc')}
          </p>

          {/* Dynamic sub-status (uploading / queued / analyzing) */}
          <p className="text-xs font-medium text-brand-accent mt-4 animate-pulse">
            {finishing ? t('scan.preparingResults') : subStatus}
          </p>

          {itemLabel && (
            <span className="text-xs font-mono text-muted max-w-sm truncate mt-2 mb-4">
              {itemLabel}
            </span>
          )}

          {errorMsg && (
            <p className="text-xs text-status-warning mt-3 mb-4">
              {errorMsg}
            </p>
          )}

          {/* Cancel button */}
          <button
            onClick={() => navigate('/dashboard')}
            disabled={finishing}
            className="mt-6 px-6 py-2 rounded-btn bg-surface-alt/70 border border-surface-alt hover:border-status-danger hover:text-status-danger text-muted text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('scan.cancelScan')}
          </button>
        </div>
      </div>
    </div>
  );
};
