import React from 'react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

/** Centered spinner + label used for page/section loading states. */
export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading…', className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-12 text-muted text-sm ${className}`}>
    <span className="w-8 h-8 rounded-full border-2 border-surface-alt border-t-brand-accent animate-spin" />
    <span>{label}</span>
  </div>
);
