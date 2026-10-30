import React from 'react';
import { Info } from 'lucide-react';

interface KPIBlockProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  showActivityGrid?: boolean;
  progressPercent?: number;
  progressLabel?: string;
  progressValue?: string;
}

export function KPIBlock({
  title,
  value,
  subtitle,
  icon,
  badge,
  className = '',
  showActivityGrid = false,
  progressPercent,
  progressLabel,
  progressValue,
}: KPIBlockProps) {
  return (
    <div
      className={`bg-[#141414] border border-[#222222] rounded-2xl p-6 text-white transition-all ${className}`}
    >
      <div className="flex items-center justify-between text-xs text-[#888888] mb-4">
        <div className="flex items-center gap-1.5 font-medium text-[13px] text-zinc-300">
          <span>{title}</span>
          <Info className="w-3.5 h-3.5 text-zinc-500" />
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {icon && <span className="text-zinc-400">{icon}</span>}
        </div>
      </div>

      <div className="mb-1">
        <span className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
          {value}
        </span>
      </div>

      {subtitle && (
        <div className="text-xs text-[#888888] mb-3">
          {subtitle}
        </div>
      )}

      {/* Optional Heatmap Grid like screenshot */}
      {showActivityGrid && (
        <div className="mt-4 pt-3 border-t border-[#1C1C1C]">
          <div className="grid grid-rows-4 grid-flow-col gap-1 w-full max-w-xs">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-xs ${
                  i % 7 === 0
                    ? 'bg-[#FACC15]/40'
                    : i % 11 === 0
                    ? 'bg-[#38BDF8]/40'
                    : 'bg-[#1C1C1C]'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional Progress Bar like screenshot */}
      {progressPercent !== undefined && (
        <div className="mt-4 pt-3 border-t border-[#1C1C1C] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{progressLabel || 'Progress'}</span>
            <span className="text-white font-medium">{progressValue || `${progressPercent}%`}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#222222] overflow-hidden">
            <div
              className="h-full bg-[#FACC15] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
