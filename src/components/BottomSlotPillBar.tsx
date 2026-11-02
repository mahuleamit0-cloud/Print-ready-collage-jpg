import React from 'react';
import {
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
} from 'lucide-react';
import { SlotTransform } from '../utils/printLayoutEngine';

interface BottomSlotPillBarProps {
  activeSlotIndex: number;
  totalSlots: number;
  transform: SlotTransform;
  onChangeZoom: (zoom: number) => void;
  onRotate90: () => void;
  onToggleFitMode: () => void;
  onSwapNext: () => void;
  onResetSlot: () => void;
}

export const BottomSlotPillBar: React.FC<BottomSlotPillBarProps> = ({
  activeSlotIndex,
  totalSlots,
  transform,
  onChangeZoom,
  onRotate90,
  onToggleFitMode,
  onSwapNext,
  onResetSlot,
}) => {
  return (
    <div
      data-testid="bottom-slot-control-bar"
      className="fixed bottom-2 left-2 right-2 sm:left-20 sm:right-6 z-20 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 sm:gap-2 px-2.5 py-1.5 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl max-w-full">
        {/* Active Slot Identifier */}
        <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 shrink-0">
          <span className="text-[11px] font-semibold text-amber-400 font-mono-tabular whitespace-nowrap">
            Slot #{activeSlotIndex + 1}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono-tabular">
            /{totalSlots}
          </span>
        </div>

        {/* Zoom Slider (1.0x to 3.0x) */}
        <label className="flex items-center gap-1.5 text-xs text-zinc-300 shrink-0">
          <ZoomIn className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="sr-only">Slot Zoom</span>
          <input
            type="range"
            aria-label="Slot Zoom"
            min={1.0}
            max={3.0}
            step={0.05}
            value={transform.zoom}
            onChange={(e) => onChangeZoom(parseFloat(e.target.value))}
            className="w-16 sm:w-24 accent-amber-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
          />
          <span className="text-[11px] font-mono-tabular text-zinc-200 w-8 text-right">
            {transform.zoom.toFixed(1)}×
          </span>
        </label>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Rotate 90° */}
          <button
            type="button"
            onClick={onRotate90}
            className="min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Rotate 90°"
          >
            <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span>↻ Rotate 90°</span>
          </button>

          {/* Fit vs Fill Toggle */}
          <button
            type="button"
            onClick={onToggleFitMode}
            className="min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={`Mode: ${transform.fitMode === 'fill' ? 'Fill' : 'Fit'}`}
          >
            {transform.fitMode === 'fill' ? (
              <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            ) : (
              <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
            )}
            <span>Mode: {transform.fitMode === 'fill' ? 'Fill' : 'Fit'}</span>
          </button>

          {/* Swap with Next Slot */}
          <button
            type="button"
            onClick={onSwapNext}
            disabled={totalSlots <= 1}
            className="min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Swap Next"
          >
            <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span>⇄ Swap</span>
          </button>

          {/* Reset Slot */}
          <button
            type="button"
            onClick={onResetSlot}
            className="min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Reset Slot"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
