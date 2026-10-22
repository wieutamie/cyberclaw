import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, File as FileIcon, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { formatBytes } from '../../lib/format.js';
import { useSettings } from '../../context/SettingsContext.js';
import { Modal } from '../ui/Modal.js';

interface DropzoneProps {
  onScan: (file: File) => void;
  disabled?: boolean;
  /** When true, open the native file picker automatically on mount. */
  autoOpen?: boolean;
  /** Called once the auto-opened picker has been triggered, so the parent can
   *  clear the one-shot `?pick=1` flag and not re-open on later renders. */
  onAutoOpenConsumed?: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onScan,
  disabled = false,
  autoOpen = false,
  onAutoOpenConsumed,
}) => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoOpenFired = useRef(false);
  const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (backend runs on Vercel: 4.5 MB request cap)

  // Auto-open the native OS file picker when requested (e.g. arriving from the
  // "Scan Another" button on the result page).
  //
  // We call .click() synchronously during the mount effect — no setTimeout —
  // because browsers only allow a file dialog to open as a direct result of a
  // user gesture. Deferring it to a timer breaks the gesture chain and the
  // dialog gets silently blocked. The ref guard ensures it fires only once.
  useEffect(() => {
    if (!autoOpen || autoOpenFired.current) return;
    autoOpenFired.current = true;
    fileInputRef.current?.click();
    onAutoOpenConsumed?.();
  }, [autoOpen, onAutoOpenConsumed]);

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (file.size === 0) {
      setError('Empty files (0 bytes) cannot be scanned.');
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File size exceeds the 4 MB limit (${formatBytes(file.size)}).`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleScanClick = () => {
    if (!selectedFile) return;

    // Check privacy warning preference
    if (settings.show_upload_warning) {
      setShowPrivacyModal(true);
    } else {
      onScan(selectedFile);
    }
  };

  const handleConfirmPrivacy = async () => {
    setShowPrivacyModal(false);
    // Persisting "don't show again" must never block the scan itself — if the
    // settings call fails we still proceed with the scan the user asked for.
    if (dontShowAgain) {
      try {
        await updateSettings({ show_upload_warning: false });
      } catch {
        // Non-fatal: the warning will simply appear again next time.
      }
    }
    if (selectedFile) {
      onScan(selectedFile);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dropzone Container — outer dashed frame is transparent; the solid
          maroon panel sits inset inside it (space for the dashed stroke). */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative rounded-card border-2 border-dashed p-2.5 sm:p-3 cursor-pointer transition-all ${
          error
            ? 'border-status-danger/70 bg-status-danger/5'
            : dragOver
            ? 'border-[#FF0090] bg-[#FF4F79]/10 scale-[1.01]'
            : 'border-[#FF4F79]/40 bg-transparent hover:border-[#FF4F79]/70'
        }`}
      >
        {/* Inner solid panel — brand pink #FF4F79, kept translucent so the
            page/dashed frame shows through slightly. */}
        <div
          className={`min-h-[240px] sm:min-h-[300px] rounded-[12px] flex flex-col items-center justify-center p-6 sm:p-8 text-center transition-colors border border-[#FF4F79]/20 ${
            error
              ? 'bg-status-danger/15'
              : dragOver
              ? 'bg-[#FF4F79]/35'
              : 'bg-[#FF4F79]/20'
          }`}
        >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-brand/20 border border-brand-accent flex items-center justify-center text-brand-accent">
              <FileIcon className="w-8 h-8" />
            </div>

            <div className="flex flex-col items-center w-full min-w-0">
              <span className="font-semibold text-white truncate max-w-full text-base">
                {selectedFile.name}
              </span>
              <span className="text-sm text-muted mt-1">
                {formatBytes(selectedFile.size)}
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-status-danger px-3 py-1.5 rounded-full bg-surface border border-surface-alt transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Change / Remove File</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <UploadCloud className="w-12 h-12 text-white/90" />

            <p className="text-sm font-medium text-white">
              {t('dashboard.dropzoneIdle')}
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-[#17183B] border border-white/15 text-white font-semibold text-sm hover:bg-black/60 transition-all focus:ring-2 focus:ring-white"
            >
              <FileIcon className="w-4 h-4" />
              {t('dashboard.chooseFile')}
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Validation Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-status-danger/15 border border-status-danger/40 text-status-danger text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SCAN NOW Button — only shown once a file has been selected */}
      {selectedFile && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleScanClick}
          className="cta-sheen w-full py-3.5 rounded-btn bg-[#FF4F79] text-white font-bold text-base tracking-wide uppercase shadow-soft hover:bg-[#d62a63] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          {t('dashboard.scanNow')}
        </button>
      )}

      {/* Privacy Consent Dialog Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        labelledBy="privacy-modal-title"
        panelClassName="max-w-md border-surface-alt"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-status-warning/20 text-status-warning flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 id="privacy-modal-title" className="text-lg font-bold text-white">
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
          <span className="text-xs text-muted">
            {t('dashboard.dontShowAgain')}
          </span>
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
