import React from 'react';
import { VendorResult, VendorCategory } from '../../types/index.js';
import { ShieldAlert, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface VendorCardProps {
  vendor: VendorResult;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor }) => {
  const getCategoryConfig = (category: VendorCategory) => {
    switch (category) {
      case 'malicious':
        return {
          label: 'Malicious',
          color: '#FF0000',
          borderLeft: 'border-l-status-danger',
          badgeBg: 'bg-status-danger text-white',
          Icon: ShieldAlert,
        };
      case 'suspicious':
        return {
          label: 'Suspicious',
          color: '#FF7300',
          borderLeft: 'border-l-status-warning',
          badgeBg: 'bg-status-warning text-white',
          Icon: AlertTriangle,
        };
      case 'harmless':
        return {
          label: 'Harmless',
          color: '#11FF00',
          borderLeft: 'border-l-status-clean',
          // Bright green badge → dark ink text for contrast (per PRD §4.1).
          badgeBg: 'bg-status-clean text-bg',
          Icon: ShieldCheck,
        };
      case 'timeout':
      case 'confirmed-timeout':
        return {
          label: 'Timeout',
          color: '#64748B',
          borderLeft: 'border-l-muted',
          badgeBg: 'border border-dashed border-muted text-muted bg-transparent',
          Icon: HelpCircle,
        };
      case 'failure':
        return {
          label: 'Failure',
          color: '#64748B',
          borderLeft: 'border-l-muted',
          badgeBg: 'border border-dashed border-muted text-muted bg-transparent',
          Icon: HelpCircle,
        };
      case 'type-unsupported':
        return {
          label: 'Unsupported',
          color: '#64748B',
          borderLeft: 'border-l-muted',
          badgeBg: 'border border-dashed border-muted text-muted bg-transparent',
          Icon: HelpCircle,
        };
      case 'undetected':
      default:
        return {
          label: 'Undetected',
          color: '#64748B',
          borderLeft: 'border-l-muted/60',
          badgeBg: 'bg-muted/20 text-muted',
          Icon: HelpCircle,
        };
    }
  };

  const config = getCategoryConfig(vendor.category);
  const Icon = config.Icon;

  const isDetection =
    vendor.category === 'malicious' || vendor.category === 'suspicious';

  return (
    <div
      className={`bg-surface border border-surface-alt rounded-xl p-4 shadow-sm border-l-4 ${config.borderLeft} flex flex-col justify-between transition-all duration-200 hover:border-surface-alt/90 hover:-translate-y-0.5 hover:shadow-card ${
        isDetection ? 'ring-1 ring-inset ring-white/5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold text-white text-sm truncate" title={vendor.engine_name}>
          {vendor.engine_name}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${config.badgeBg}`}
        >
          <Icon className="w-3 h-3" />
          <span>{config.label}</span>
        </span>
      </div>

      <div
        className={`font-mono text-xs truncate mb-3 ${
          isDetection ? 'font-bold' : 'text-gray-300'
        }`}
        title={vendor.result || 'Clean'}
      >
        {vendor.result ? (
          <span
            className={
              vendor.category === 'malicious'
                ? 'text-status-danger'
                : vendor.category === 'suspicious'
                ? 'text-status-warning'
                : vendor.category === 'harmless'
                ? 'text-status-clean'
                : 'text-gray-300'
            }
          >
            {vendor.result}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted border-t border-surface-alt/60 pt-2">
        <span>v{vendor.engine_version || 'N/A'}</span>
        <span>{vendor.engine_update || ''}</span>
      </div>
    </div>
  );
};
