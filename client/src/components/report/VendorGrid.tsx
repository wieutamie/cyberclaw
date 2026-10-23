import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ArrowDownWideNarrow, ArrowDownAZ } from 'lucide-react';
import { VendorResult } from '../../types/index.js';
import { VendorCard } from './VendorCard.js';

interface VendorGridProps {
  vendors: VendorResult[];
}

const SEVERITY_ORDER: Record<string, number> = {
  malicious: 0,
  suspicious: 1,
  'confirmed-timeout': 2,
  timeout: 3,
  failure: 4,
  'type-unsupported': 5,
  harmful: 6,
  undetected: 7,
  harmless: 8,
};

export const VendorGrid: React.FC<VendorGridProps> = ({ vendors }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'name'>('severity');

  // Compute category counts
  const counts = useMemo(() => {
    let malicious = 0;
    let suspicious = 0;
    let undetected = 0;
    let harmless = 0;
    let other = 0;

    vendors.forEach((v) => {
      if (v.category === 'malicious') malicious++;
      else if (v.category === 'suspicious') suspicious++;
      else if (v.category === 'undetected') undetected++;
      else if (v.category === 'harmless') harmless++;
      else other++;
    });

    return { all: vendors.length, malicious, suspicious, undetected, harmless, other };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const result = vendors.filter((v) => {
      // Category filter
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'other') {
          if (['malicious', 'suspicious', 'undetected', 'harmless'].includes(v.category)) {
            return false;
          }
        } else if (v.category !== selectedFilter) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = v.engine_name.toLowerCase().includes(q);
        const matchesResult = v.result ? v.result.toLowerCase().includes(q) : false;
        return matchesName || matchesResult;
      }

      return true;
    });

    // Sorting: severity (default) atau nama A-Z
    return result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.engine_name.localeCompare(b.engine_name);
      }
      const sa = SEVERITY_ORDER[a.category] ?? 99;
      const sb = SEVERITY_ORDER[b.category] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.engine_name.localeCompare(b.engine_name);
    });
  }, [vendors, selectedFilter, search, sortBy]);

  const chips = [
    { id: 'all', label: t('report.all'), count: counts.all, color: 'text-white' },
    { id: 'malicious', label: t('report.malicious'), count: counts.malicious, color: 'text-status-danger' },
    { id: 'suspicious', label: t('report.suspicious'), count: counts.suspicious, color: 'text-status-warning' },
    { id: 'harmless', label: t('report.harmless'), count: counts.harmless, color: 'text-status-clean' },
    { id: 'undetected', label: t('report.undetected'), count: counts.undetected, color: 'text-muted' },
    { id: 'other', label: t('report.other'), count: counts.other, color: 'text-gray-400' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar: Search & Chips */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('report.searchVendor')}
              className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-surface border border-surface-alt text-white text-sm placeholder:text-muted focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none"
            />
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
          </div>

          <button
            type="button"
            onClick={() => setSortBy((s) => (s === 'severity' ? 'name' : 'severity'))}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-btn bg-surface border border-surface-alt text-xs font-semibold text-gray-300 hover:bg-surface-alt transition-colors shrink-0"
            title={sortBy === 'severity' ? t('report.sortBySeverity') : t('report.sortByName')}
          >
            {sortBy === 'severity' ? (
              <>
                <ArrowDownWideNarrow className="w-4 h-4" />
                <span>{t('report.sortSeverityShort')}</span>
              </>
            ) : (
              <>
                <ArrowDownAZ className="w-4 h-4" />
                <span>{t('report.sortNameShort')}</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => {
            const isActive = selectedFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedFilter(chip.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand text-white shadow-soft'
                    : 'bg-surface border border-surface-alt text-gray-300 hover:bg-surface-alt'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-alt ' + chip.color
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Vendor Cards */}
      {filteredVendors.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-surface-alt rounded-card text-muted text-sm">
          {t('report.noVendorsMatch')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredVendors.map((vendor) => (
            <VendorCard key={vendor.engine_name} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
};
