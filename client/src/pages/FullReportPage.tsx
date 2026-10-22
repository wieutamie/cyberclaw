import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api.js';
import { VendorReportList } from '../components/report/VendorReportList.js';
import { ReportSidebar } from '../components/report/ReportSidebar.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ScanRecord } from '../types/index.js';

export const FullReportPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScan = async () => {
    if (!scanId) return;
    setLoading(true);
    try {
      const data = await api.getScanDetails(scanId);
      setScan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load the report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [scanId]);

  if (loading) {
    return <LoadingState label={t('common.loading')} className="min-h-[50vh]" />;
  }

  if (error || !scan) {
    return (
      <div className="animate-fade-rise flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <h2 className="text-xl font-bold text-status-danger mb-2">Report Not Found</h2>
        <p className="text-sm text-muted mb-4">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2 rounded-btn bg-brand text-white font-bold text-xs hover:bg-brand-accent transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const vendors = scan.vendor_results || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb row */}
      <div className="animate-fade-rise flex items-center justify-between gap-4 flex-wrap">
        <Link
          to={`/scan/${scan.id}`}
          className="group inline-flex items-center gap-2 text-xs font-semibold text-brand-accent hover:underline"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to Verdict Summary</span>
        </Link>

        <span className="text-xs font-mono text-muted truncate max-w-xs">
          ID: {scan.id}
        </span>
      </div>

      {/* Mega panel: vendor list (left) + summary rail (right) */}
      <div className="animate-fade-rise [animation-delay:100ms] rounded-card bg-surface border border-surface-alt p-5 sm:p-7 shadow-card grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-8 items-start">
        <div className="lg:col-span-8 rounded-2xl bg-bg p-5 sm:p-6">
          <VendorReportList vendors={vendors} />
        </div>

        <div className="lg:col-span-4">
          <ReportSidebar scan={scan} />
        </div>
      </div>

      {/* Footer credit */}
      <div className="animate-fade-rise [animation-delay:180ms] flex flex-col items-center gap-1.5 text-center pt-1">
        <span className="text-[11px] text-muted">
          ©2023 Cyber Claw. Crafted with precision by Rio Alvris.
        </span>
        <span className="text-[10px] text-muted/80">
          RPL Project — SMKN 1 Bangil
        </span>
      </div>
    </div>
  );
};
