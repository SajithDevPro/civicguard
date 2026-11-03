/**
 * CivicGuard Temporal Density Timeline Slider (HeatmapTimeSlider.tsx)
 * Bottom-docked timeline control allowing users to filter spatial density and clusters
 * across discrete time windows (24 Hours, 7 Days, 30 Days, All Recorded Time).
 */
import React from 'react';
import { Clock, Calendar, Play, RotateCcw, Shield } from 'lucide-react';

export type TimeWindowOption = 24 | 168 | 720 | 'all';

interface HeatmapTimeSliderProps {
  selectedWindow: TimeWindowOption;
  onChangeWindow: (window: TimeWindowOption) => void;
  filteredCount: number;
  totalCount: number;
}

const TIME_STEPS: { value: TimeWindowOption; label: string; subtext: string }[] = [
  { value: 24, label: '24 Hours', subtext: 'Immediate Threats' },
  { value: 168, label: '7 Days', subtext: 'Past Week Trend' },
  { value: 720, label: '30 Days', subtext: 'Monthly Patterns' },
  { value: 'all', label: 'All Time', subtext: 'Full Archive' },
];

export const HeatmapTimeSlider: React.FC<HeatmapTimeSliderProps> = ({
  selectedWindow,
  onChangeWindow,
  filteredCount,
  totalCount,
}) => {
  const currentIndex = TIME_STEPS.findIndex((s) => s.value === selectedWindow);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    const chosen = TIME_STEPS[idx];
    if (chosen) {
      onChangeWindow(chosen.value);
    }
  };

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[400] w-[92%] max-w-xl pointer-events-auto">
      <div className="p-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl space-y-2 text-xs font-mono">
        {/* Header telemetry row */}
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white uppercase">Temporal Density Window:</span>
            <span className="text-emerald-300 font-bold">
              {TIME_STEPS[currentIndex]?.label || 'All Time'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>
              <strong className="text-white tabular-nums">{filteredCount}</strong> of {totalCount} cases active
            </span>
            {selectedWindow !== 'all' && (
              <button
                type="button"
                onClick={() => onChangeWindow('all')}
                className="text-[10px] text-slate-500 hover:text-slate-300 inline-flex items-center gap-0.5"
                title="Reset to all time"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Range Slider Track */}
        <div className="relative py-1">
          <input
            type="range"
            min={0}
            max={TIME_STEPS.length - 1}
            step={1}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />

          {/* Step ticks and labels */}
          <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 select-none">
            {TIME_STEPS.map((step, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => onChangeWindow(step.value)}
                  className={`text-center transition-colors hover:text-white ${
                    isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  <div className="leading-tight">{step.label}</div>
                  <div className="text-[9px] text-slate-600 hidden sm:block">{step.subtext}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
