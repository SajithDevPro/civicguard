import React from 'react';
import { Shield, Radio, Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Synchronizing Telemetry...',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 font-mono ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer tactical spinning radar ring */}
        <div
          className={`${sizeMap[size]} border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin`}
        />
        {/* Pulsing tactical radar core */}
        <div className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
      </div>
      {label && (
        <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">
          {label}
        </span>
      )}
    </div>
  );
};

export const SkeletonCard: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-4 animate-pulse ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="h-5 w-16 bg-slate-800/80 rounded" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-3 bg-slate-800/60 rounded"
            style={{ width: `${100 - idx * 15}%` }}
          />
        ))}
      </div>
      <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
        <div className="h-3 bg-slate-800/40 rounded w-20" />
        <div className="h-6 bg-slate-800 rounded w-24" />
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden animate-pulse">
      {/* Table Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 grid grid-cols-5 gap-4">
        {Array.from({ length: cols }).map((_, idx) => (
          <div key={idx} className="h-3.5 bg-slate-800 rounded w-3/4" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-slate-800/60">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-4 grid grid-cols-5 gap-4 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-3 bg-slate-800/60 rounded"
                style={{ width: `${60 + ((rIdx + cIdx) % 4) * 10}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonMap: React.FC<{ className?: string }> = ({ className = 'h-[500px]' }) => {
  return (
    <div
      className={`relative w-full ${className} bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center`}
    >
      {/* Tactical Grid Background */}
      <div
        className="absolute inset-0 opacity-20 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
      />
      {/* Concentric radar pulse circles */}
      <div className="absolute w-72 h-72 border border-emerald-500/10 rounded-full animate-ping pointer-events-none" />
      <div className="absolute w-96 h-96 border border-emerald-500/10 rounded-full pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" label="Acquiring Vector Map Tiles & Hotspots..." />
      </div>
    </div>
  );
};

export const SkeletonMetrics: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-slate-800 rounded w-20" />
            <div className="w-4 h-4 bg-slate-800 rounded-full" />
          </div>
          <div className="h-7 bg-slate-800 rounded w-28" />
          <div className="h-2.5 bg-slate-800/50 rounded w-16" />
        </div>
      ))}
    </div>
  );
};
