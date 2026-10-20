import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  RotateCw,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { formatDateTime, formatBytes, truncate } from '../../lib/format.js';
import { totalEngines } from '../../lib/stats.js';
import { useSettings } from '../../context/SettingsContext.js';
import { ScanRecord } from '../../types/index.js';
import { api } from '../../lib/api.js';

interface SummaryPanelProps {
  scan: ScanRecord;
  onRescanSuccess: () => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ scan, onRescanSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);

  const stats = scan.stats || {
    malicious: 0,
    suspicious: 0,
    harmless: 0,
    undetected: 0,
    timeout: 0,
    failure: 0,
    unsupported: 0,
  };

  const totalEnginesCount = totalEngines(stats);

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await api.rescan(scan.id);
      onRescanSuccess();
    } catch (err) {
      console.error('Failed to trigger rescan:', err);
    } finally {
      setRescanning(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cyberclaw_report_${scan.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getVtUrl = () => {
    const sha = scan.item_sha256 || scan.item_meta?.sha256;
    if (scan.type === 'file' || scan.type === 'hash') {
      if (sha) return `https://www.virustotal.com/gui/file/${sha}`;
    }
    if (scan.type === 'url' && scan.item_label) {
      const b64 = btoa(scan.item_label).replace(/=/g, '');
      return `https://www.virustotal.com/gui/url/${b64}`;
    }
    return 'https://www.virustotal.com';
  };

  const isDanger = scan.verdict === 'danger';
  const isWarning = scan.verdict === 'warning';

  // Verdict accent (per PRD §4.1): distinct semantic colors so danger, warning
  // and clean are never confused — #FF0000 / #FF7300 / #11FF00.
  const verdictAccent = isDanger
    ? 'text-status-danger'
    : isWarning
    ? 'text-status-warning'
    : 'text-status-clean';

  const VerdictIcon = isDanger
    ? ShieldAlert
    : isWarning
    ? AlertTriangle
    : ShieldCheck;

  const statItems = [
    { label: 'Malicious', val: stats.malicious, color: 'bg-status-danger' },
    { label: 'Suspicious', val: stats.suspicious, color: 'bg-status-warning' },
    { label: 'Harmless', val: stats.harmless, color: 'bg-status-clean' },
    { label: 'Undetected', val: stats.undetected, color: 'bg-muted' },
    { label: 'Timeout', val: stats.timeout, color: 'bg-muted/60' },
    { label: 'Failure', val: stats.failure, color: 'bg-muted/60' },
    { label: 'Unsupported', val: stats.unsupported, color: 'bg-muted/60' },
  ];

  return (
    <div className="animate-fade-rise bg-surface border border-surface-alt rounded-card p-5 sm:p-6 shadow-card flex flex-col gap-6 lg:sticky lg:top-20 transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
      {/* Top Verdict & Ratio */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-surface-alt">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-surface-alt ${verdictAccent}`}>
            <VerdictIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white capitalize leading-tight">
              {scan.verdict || 'Scan Result'}
            </h3>
            <span className="text-xs text-muted">
              {totalEnginesCount} Security Vendors
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-xl font-bold text-white">
            <span className={stats.malicious > 0 ? 'text-status-danger' : 'text-status-clean'}>
              {stats.malicious}
            </span>
            <span className="text-muted text-sm"> / {totalEnginesCount}</span>
          </span>
        </div>
      </div>

      {/* Statistical Breakdown Bars */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {t('report.statsBreakdown')}
        </span>

        <div className="flex flex-col gap-2">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-xs">
              <span className="text-gray-300">{s.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color}`}
                    style={{
                      width: totalEnginesCount > 0 ? `${(s.val / totalEnginesCount) * 100}%` : '0%',
                    }}
                  />
                </div>
                <span className="font-mono text-muted w-6 text-right font-medium">
                  {s.val}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item Information */}
      <div className="flex flex-col gap-2 pt-4 border-t border-surface-alt text-xs">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {t('report.itemInformation')}
        </span>

        <div className="bg-surface-alt/60 rounded-xl p-3.5 flex flex-col gap-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-muted font-sans">Name / URL:</span>
            <span className="text-white truncate max-w-[170px]" title={scan.item_label}>
              {scan.item_label}
            </span>
          </div>

          {scan.item_meta?.size !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted font-sans">Size:</span>
              <span className="text-white">{formatBytes(scan.item_meta.size)}</span>
            </div>
          )}

          {scan.item_meta?.type_description && (
            <div className="flex justify-between items-center">
              <span className="text-muted font-sans">Type:</span>
              <span className="text-white">{scan.item_meta.type_description}</span>
            </div>
          )}

          {/* SHA-256 */}
          {(scan.item_sha256 || scan.item_meta?.sha256) && (
            <div className="flex justify-between items-center pt-1 border-t border-surface-alt/60">
              <span className="text-muted font-sans">SHA-256:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 truncate max-w-[120px]">
                  {truncate(scan.item_sha256 || scan.item_meta?.sha256 || '', 16)}
                </span>
                <button
                  onClick={() => handleCopy('sha256', scan.item_sha256 || scan.item_meta?.sha256 || '')}
                  className="p-1 rounded hover:bg-surface text-muted hover:text-white"
                >
                  {copiedField === 'sha256' ? <Check className="w-3 h-3 text-status-clean" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}

          {/* MD5 */}
          {scan.item_meta?.md5 && (
            <div className="flex justify-between items-center">
              <span className="text-muted font-sans">MD5:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 truncate max-w-[120px]">
                  {truncate(scan.item_meta.md5, 16)}
                </span>
                <button
                  onClick={() => handleCopy('md5', scan.item_meta?.md5 || '')}
                  className="p-1 rounded hover:bg-surface text-muted hover:text-white"
                >
                  {copiedField === 'md5' ? <Check className="w-3 h-3 text-status-clean" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-surface-alt/60 font-sans">
            <span className="text-muted">Last Analysis:</span>
            <span className="text-gray-300 text-[11px]">
              {formatDateTime(
                scan.item_meta?.last_analysis_date ?? scan.completed_at ?? scan.created_at,
                settings.timezone,
                settings.time_format
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-4 border-t border-surface-alt">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-btn bg-surface-alt border border-brand-accent text-white text-xs font-semibold hover:bg-brand-accent transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${rescanning ? 'animate-spin' : ''}`} />
            <span>{t('common.rescan')}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-btn bg-surface-alt border border-surface-alt text-gray-200 text-xs font-semibold hover:bg-surface-alt/80 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleCopy('link', window.location.href)}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-btn bg-surface-alt border border-surface-alt text-gray-200 text-xs font-semibold hover:bg-surface-alt/80 transition-colors"
          >
            {copiedField === 'link' ? <Check className="w-3.5 h-3.5 text-status-clean" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedField === 'link' ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            onClick={() => navigate(`/scan/${scan.id}`)}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-btn bg-surface-alt border border-surface-alt text-gray-200 text-xs font-semibold hover:bg-surface-alt/80 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Result</span>
          </button>
        </div>

        {/* VirusTotal External Link */}
        <a
          href={getVtUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-sheen flex items-center justify-center gap-2 py-2.5 px-3 rounded-btn bg-brand hover:bg-brand-accent text-white text-xs font-bold transition-all shadow-soft mt-1"
        >
          <span>{t('report.viewOnVt')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
