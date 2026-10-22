import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Trash2,
  FileText,
  Globe,
  Hash,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Inbox,
  BarChart3,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDateTime, truncate } from '../../lib/format.js';
import { useSettings } from '../../context/SettingsContext.js';
import { LoadingState } from '../ui/LoadingState.js';
import { Modal } from '../ui/Modal.js';
import { ScanRecord, ScanType, Verdict } from '../../types/index.js';

export const HistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [items, setItems] = useState<ScanRecord[]>([]);
  const [total, setTotal] = useState(0);
  // Tracks whether the account has *any* history (independent of the active
  // filters) so the "clear all" action stays reachable even when the current
  // filter yields zero rows.
  const [hasHistory, setHasHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // Clear-all flow
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ScanType | undefined>(undefined);
  const [verdictFilter, setVerdictFilter] = useState<Verdict | undefined>(undefined);

  const showToast = (msg: string, type: 'success' | 'error' = 'success', ms = 3000) => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), ms);
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({
        page,
        pageSize,
        q: searchQuery,
        type: typeFilter,
        verdict: verdictFilter,
      });
      setItems(data.items);
      setTotal(data.total);
      const unfiltered = !searchQuery.trim() && !typeFilter && !verdictFilter;
      if (unfiltered) setHasHistory(data.total > 0);
      else if (data.total > 0) setHasHistory(true);
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, typeFilter, verdictFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(t('history.deleteConfirm'))) return;
    try {
      await api.deleteScan(id);
      // If we just removed the last row on this page, step back a page.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else loadHistory();
    } catch (err: any) {
      showToast(err?.message || t('history.deleteFailed'), 'error', 4000);
    }
  };

  const handleClearAll = async () => {
    if (clearConfirmText !== 'DELETE' || clearing) return;
    setClearing(true);
    try {
      await api.clearAllHistory();
      setShowClearModal(false);
      setClearConfirmText('');
      setPage(1);
      setItems([]);
      setTotal(0);
      setHasHistory(false);
      showToast(t('preferences.historyCleared'));
      loadHistory();
    } catch (err: any) {
      showToast(err?.message || t('history.clearFailed'), 'error', 4000);
    } finally {
      setClearing(false);
    }
  };

  const getTypeBadge = (type: ScanType) => {
    switch (type) {
      case 'file':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <FileText className="w-3.5 h-3.5" />
            <span>File</span>
          </span>
        );
      case 'url':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Globe className="w-3.5 h-3.5" />
            <span>URL</span>
          </span>
        );
      case 'hash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Hash className="w-3.5 h-3.5" />
            <span>Hash</span>
          </span>
        );
    }
  };

  const getStatusBadge = (scan: ScanRecord) => {
    if (scan.state === 'not_found') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/20 text-muted border border-muted/40">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Not Found</span>
        </span>
      );
    }

    if (scan.state !== 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-alt text-brand-accent animate-pulse border border-brand-accent/40">
          <span className="w-2 h-2 rounded-full bg-brand-accent" />
          <span className="capitalize">{scan.state.replace('_', ' ')}</span>
        </span>
      );
    }

    switch (scan.verdict) {
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-status-danger text-white shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Danger</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-status-warning text-white shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warning</span>
          </span>
        );
      case 'clean':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-alt text-gray-200">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-200" />
            <span>Clean</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/20 text-muted">
            <span>Unknown</span>
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title + prominent bulk-delete action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold text-white">{t('history.title')}</h2>
          {total > 0 && (
            <span className="text-xs text-muted">
              {t('history.totalScans', { total })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/analytics"
            className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-brand-accent/10 border border-brand-accent/40 text-brand-accent text-xs font-bold whitespace-nowrap hover:bg-brand-accent hover:text-white active:scale-[0.98] transition-all"
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>{t('history.viewAnalytics')}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          {hasHistory && (
            <button
              type="button"
              onClick={() => {
                setClearConfirmText('');
                setShowClearModal(true);
              }}
              title={t('history.clearAll')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-btn bg-status-danger/15 border border-status-danger/50 text-status-danger text-xs font-bold whitespace-nowrap hover:bg-status-danger hover:text-white active:scale-[0.98] transition-all"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>{t('history.clearAll')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 rounded-btn bg-surface-alt border border-surface-alt text-white text-xs placeholder:text-muted focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none"
          />
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={typeFilter || ''}
            onChange={(e) => {
              setTypeFilter((e.target.value as ScanType) || undefined);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-btn bg-surface-alt border border-surface-alt text-xs text-white focus:border-brand-accent focus:outline-none"
          >
            <option value="">{t('history.allTypes')}</option>
            <option value="file">File</option>
            <option value="url">URL</option>
            <option value="hash">Hash</option>
          </select>

          <select
            value={verdictFilter || ''}
            onChange={(e) => {
              setVerdictFilter((e.target.value as Verdict) || undefined);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-btn bg-surface-alt border border-surface-alt text-xs text-white focus:border-brand-accent focus:outline-none"
          >
            <option value="">{t('history.allStatus')}</option>
            <option value="danger">Danger</option>
            <option value="warning">Warning</option>
            <option value="clean">Clean</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <LoadingState label={t('common.loading')} className="p-12" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-alt/40 border border-surface-alt rounded-card">
          <div className="w-14 h-14 rounded-full bg-surface-alt flex items-center justify-center text-muted mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-white">
            {t('history.empty')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-card border border-surface-alt">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt text-muted text-xs uppercase tracking-wider font-semibold border-b border-surface-alt">
                  <th className="py-3 px-4">{t('history.timestamp')}</th>
                  <th className="py-3 px-4">{t('history.item')}</th>
                  <th className="py-3 px-4">{t('history.type')}</th>
                  <th className="py-3 px-4">{t('history.status')}</th>
                  <th className="py-3 px-4 text-right">{t('history.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-alt/60">
                {items.map((scan, idx) => (
                  <tr
                    key={scan.id}
                    onClick={() => navigate(`/scan/${scan.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-surface-alt ${
                      idx % 2 === 0 ? 'bg-surface' : 'bg-[#4F2740]/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-xs text-gray-300 whitespace-nowrap">
                      {formatDateTime(
                        scan.created_at,
                        settings.timezone,
                        settings.time_format
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-white" title={scan.item_label}>
                      {truncate(scan.item_label, 40)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{getTypeBadge(scan.type)}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(scan)}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => handleDelete(e, scan.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-status-danger hover:bg-surface transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<640px) */}
          <div className="flex sm:hidden flex-col gap-3">
            {items.map((scan) => (
              <div
                key={scan.id}
                onClick={() => navigate(`/scan/${scan.id}`)}
                className="p-4 rounded-card bg-surface border border-surface-alt flex flex-col gap-2.5 active:bg-surface-alt transition-colors"
              >
                <div className="flex items-center justify-between">
                  {getTypeBadge(scan.type)}
                  <span className="text-[11px] text-muted">
                    {formatDateTime(
                      scan.created_at,
                      settings.timezone,
                      settings.time_format
                    )}
                  </span>
                </div>

                <div className="font-mono text-xs text-white break-all">
                  {scan.item_label}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-alt">
                  {getStatusBadge(scan)}
                  <button
                    onClick={(e) => handleDelete(e, scan.id)}
                    className="p-1 text-muted hover:text-status-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted">
            <span>
              {t('history.pageInfo', { page, totalPages, total })}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-surface-alt hover:bg-surface-alt/80 disabled:opacity-30 disabled:cursor-not-allowed text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-surface-alt hover:bg-surface-alt/80 disabled:opacity-30 disabled:cursor-not-allowed text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Clear-all confirmation */}
      <Modal
        isOpen={showClearModal}
        onClose={() => {
          setShowClearModal(false);
          setClearConfirmText('');
        }}
        labelledBy="history-clear-title"
        panelClassName="max-w-md border-status-danger"
      >
        <div className="flex items-center gap-3 text-status-danger">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 id="history-clear-title" className="text-lg font-bold">
            {t('preferences.clearHistory')}
          </h3>
        </div>

        <p className="text-sm text-gray-300">{t('preferences.clearHistoryWarning')}</p>

        <p className="text-xs text-muted font-medium">{t('preferences.clearHistoryConfirm')}:</p>

        <input
          type="text"
          value={clearConfirmText}
          onChange={(e) => setClearConfirmText(e.target.value)}
          placeholder="DELETE"
          className="px-3.5 py-2.5 rounded-btn bg-surface-alt border border-status-danger font-mono text-center text-sm font-bold text-white focus:outline-none"
        />

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={() => {
              setShowClearModal(false);
              setClearConfirmText('');
            }}
            className="px-4 py-2 rounded-btn bg-surface-alt text-white text-xs font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={clearConfirmText !== 'DELETE' || clearing}
            onClick={handleClearAll}
            className="px-4 py-2 rounded-btn bg-status-danger text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-danger/80"
          >
            {clearing ? t('common.loading') : t('preferences.deletePermanently')}
          </button>
        </div>
      </Modal>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[110] px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            toast.type === 'error' ? 'bg-status-danger text-white' : 'bg-status-clean text-bg'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};
