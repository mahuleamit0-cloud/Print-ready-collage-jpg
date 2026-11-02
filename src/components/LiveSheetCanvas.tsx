import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Move, Scissors } from 'lucide-react';
import {
  ArrangementStyle,
  ComputedSlotRect,
  DEFAULT_SLOT_TRANSFORM,
  OrientedPaperDimensions,
  PaperSizeSpec,
  PhotoItem,
  PrintDpi,
  SlotTransform,
  computeSheetSlotRects,
  resolveSlotPhotos,
} from '../utils/printLayoutEngine';

interface LiveSheetCanvasProps {
  paperSpec: PaperSizeSpec;
  orientedDims: OrientedPaperDimensions;
  orientation: 'portrait' | 'landscape';
  dpi: PrintDpi;
  style: ArrangementStyle;
  photos: PhotoItem[];
  slotOrderOverrides: number[];
  slotTransforms: Record<number, SlotTransform>;
  activeSlotIndex: number;
  outerMarginIn: number;
  gutterIn: number;
  cornerRadiusPx: number;
  paperBgColor: string;
  showCropMarks: boolean;
  showFrameBorder: boolean;
  showSpecFooter: boolean;
  onSelectSlot: (slotIndex: number) => void;
  onPanSlot: (slotIndex: number, deltaPanX: number, deltaPanY: number) => void;
  onStageBackgroundClick: () => void;
  onTriggerUpload: () => void;
  onLoadDemoPhotos: () => void;
}

export const LiveSheetCanvas: React.FC<LiveSheetCanvasProps> = ({
  paperSpec,
  orientedDims,
  orientation,
  dpi,
  style,
  photos,
  slotOrderOverrides,
  slotTransforms,
  activeSlotIndex,
  outerMarginIn,
  gutterIn,
  cornerRadiusPx,
  paperBgColor,
  showCropMarks,
  showFrameBorder,
  showSpecFooter,
  onSelectSlot,
  onPanSlot,
  onStageBackgroundClick,
  onTriggerUpload,
  onLoadDemoPhotos,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // Dragging state for pan X/Y inside active slot
  const dragStateRef = useRef<{
    slotIndex: number;
    startX: number;
    startY: number;
    slotW: number;
    slotH: number;
  } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Calculate exact sheet display dimensions occupying 82%-85% of the available stage (excluding dock and bottom bar)
  const dockOffsetW = stageSize.width < 640 ? 74 : 88;
  const bottomOffsetH = stageSize.width < 640 ? 84 : 68;
  const availW = Math.max(200, (stageSize.width - dockOffsetW) * 0.9);
  const availH = Math.max(200, (stageSize.height - bottomOffsetH) * 0.88);
  const targetAspect = orientedDims.aspectRatio;

  let sheetW = availW;
  let sheetH = sheetW / targetAspect;
  if (sheetH > availH) {
    sheetH = availH;
    sheetW = sheetH * targetAspect;
  }

  const slotRects: ComputedSlotRect[] = computeSheetSlotRects(
    orientedDims.widthIn,
    orientedDims.heightIn,
    style,
    outerMarginIn,
    gutterIn
  );
  const resolvedPhotos = resolveSlotPhotos(photos, style.slotCount, slotOrderOverrides);

  const isDarkPaper =
    paperBgColor.toLowerCase() === '#141416' ||
    paperBgColor.toLowerCase() === '#09090b' ||
    paperBgColor.toLowerCase() === '#000000';

  const handlePointerDownSlot = (
    e: React.PointerEvent<HTMLDivElement>,
    slotIdx: number
  ) => {
    e.stopPropagation();
    onSelectSlot(slotIdx);
    const rect = e.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      slotIndex: slotIdx,
      startX: e.clientX,
      startY: e.clientY,
      slotW: Math.max(40, rect.width),
      slotH: Math.max(40, rect.height),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveSlot = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    drag.startX = e.clientX;
    drag.startY = e.clientY;

    const deltaPanX = (dx / drag.slotW) * 100;
    const deltaPanY = (dy / drag.slotH) * 100;
    onPanSlot(drag.slotIndex, deltaPanX, deltaPanY);
  };

  const handlePointerUpSlot = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current) {
      dragStateRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const safeMarginLeftPct = (outerMarginIn / orientedDims.widthIn) * 100;
  const safeMarginTopPct = (outerMarginIn / orientedDims.heightIn) * 100;

  return (
    <div
      ref={stageRef}
      onClick={onStageBackgroundClick}
      data-testid="live-sheet-stage"
      className="relative flex-1 h-full flex items-center justify-center overflow-hidden pl-[70px] pr-2.5 pt-2 pb-20 sm:pl-20 sm:pr-6 sm:pb-16"
    >
      {/* Subtle studio darkroom grid pattern behind the sheet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(161, 161, 170, 0.28) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Top-right ruler readout overlay */}
      <div className="pointer-events-none absolute top-2.5 right-3 z-10 hidden sm:flex items-center gap-2 text-[11px] font-mono-tabular text-zinc-400 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800/80">
        <span>
          {orientedDims.widthIn}" × {orientedDims.heightIn}"
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {orientedDims.widthMm.toFixed(0)} × {orientedDims.heightMm.toFixed(0)} mm
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {orientedDims.widthPx} × {orientedDims.heightPx} px @ {dpi} DPI
        </span>
      </div>

      {/* Physical Print Sheet Live Canvas */}
      <div
        data-testid="live-print-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `${Math.round(sheetW)}px`,
          height: `${Math.round(sheetH)}px`,
          backgroundColor: paperBgColor,
        }}
        className="relative shadow-2xl ring-1 ring-white/15 transition-all duration-150 ease-out overflow-hidden"
      >
        {/* Outer Safe Margin Guide Line when margin > 0 */}
        {outerMarginIn > 0 && (
          <div
            aria-hidden="true"
            style={{
              left: `${safeMarginLeftPct}%`,
              right: `${safeMarginLeftPct}%`,
              top: `${safeMarginTopPct}%`,
              bottom: `${safeMarginTopPct}%`,
            }}
            className={`pointer-events-none absolute border border-dashed z-10 ${
              isDarkPaper ? 'border-zinc-600/50' : 'border-zinc-400/45'
            }`}
          />
        )}

        {/* Slots */}
        {slotRects.map((rect, idx) => {
          const photo = resolvedPhotos[idx];
          const transform = slotTransforms[idx] || DEFAULT_SLOT_TRANSFORM;
          const isSelected = idx === activeSlotIndex;

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              aria-label={`Slot #${idx + 1} (${rect.widthIn.toFixed(1)} by ${rect.heightIn.toFixed(1)} inches)`}
              data-testid={`sheet-slot-${idx}`}
              onPointerDown={(e) => handlePointerDownSlot(e, idx)}
              onPointerMove={handlePointerMoveSlot}
              onPointerUp={handlePointerUpSlot}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSlot(idx);
                }
              }}
              style={{
                left: `${rect.leftPct}%`,
                top: `${rect.topPct}%`,
                width: `${rect.widthPct}%`,
                height: `${rect.heightPct}%`,
                borderRadius: `${cornerRadiusPx}px`,
              }}
              className={`group absolute cursor-grab active:cursor-grabbing select-none transition-shadow ${
                isSelected
                  ? 'ring-2 ring-amber-500 z-20 shadow-lg'
                  : showFrameBorder
                  ? isDarkPaper
                    ? 'ring-1 ring-white/30 z-10'
                    : 'ring-1 ring-zinc-900/25 z-10'
                  : 'z-10'
              }`}
            >
              {/* Scissor Cut / Crop Marks around slot */}
              {showCropMarks && (
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -inset-[3px] border border-dashed ${
                    isDarkPaper ? 'border-zinc-400/60' : 'border-zinc-700/55'
                  }`}
                  style={{ borderRadius: `${cornerRadiusPx}px` }}
                >
                  {/* 4 Corner L-Marks */}
                  <span
                    className={`absolute -top-1.5 -left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 ${
                      isDarkPaper ? 'border-zinc-200' : 'border-zinc-900'
                    }`}
                  />
                  <span
                    className={`absolute -top-1.5 -right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 ${
                      isDarkPaper ? 'border-zinc-200' : 'border-zinc-900'
                    }`}
                  />
                  <span
                    className={`absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 ${
                      isDarkPaper ? 'border-zinc-200' : 'border-zinc-900'
                    }`}
                  />
                  <span
                    className={`absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 ${
                      isDarkPaper ? 'border-zinc-200' : 'border-zinc-900'
                    }`}
                  />
                  <Scissors
                    className={`w-2.5 h-2.5 absolute -top-2.5 left-3 ${
                      isDarkPaper ? 'text-zinc-300' : 'text-zinc-700'
                    }`}
                  />
                </div>
              )}

              {/* Inner clipped image container */}
              <div
                style={{ borderRadius: `${cornerRadiusPx}px` }}
                className={`relative w-full h-full overflow-hidden flex items-center justify-center ${
                  isDarkPaper ? 'bg-zinc-800/80' : 'bg-zinc-100'
                }`}
              >
                {photo ? (
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{
                      transform: `translate(${transform.panX}%, ${transform.panY}%) rotate(${transform.rotation}deg) scale(${transform.zoom})`,
                      objectFit: transform.fitMode === 'fill' ? 'cover' : 'contain',
                    }}
                    className="w-full h-full pointer-events-none select-none transition-transform duration-75"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2 text-zinc-400">
                    <ImagePlus className="w-5 h-5 mb-1 opacity-70" />
                    <span className="text-[10px] font-medium">
                      Slot #{idx + 1} Empty
                    </span>
                  </div>
                )}

                {/* Subtle active slot indicator & dimension readout */}
                <div
                  className={`pointer-events-none absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-gradient-to-b from-black/70 to-black/40 text-white transition-opacity ${
                    isSelected
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-90'
                  }`}
                >
                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                    <Move className="w-2.5 h-2.5" /> #{idx + 1}
                  </span>
                  <span>
                    {rect.widthIn.toFixed(1)}"×{rect.heightIn.toFixed(1)}"
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty Sheet Prompt Overlay if 0 photos */}
        {photos.length === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-6 text-center">
            <p className="text-sm font-semibold text-zinc-100 mb-1">
              No Photos on Print Sheet Yet
            </p>
            <p className="text-xs text-zinc-400 max-w-xs mb-4">
              Upload photos from your gallery or load studio demo plates to start arranging your {paperSpec.shortLabel} sheet.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onTriggerUpload}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
              >
                + Add Images
              </button>
              <button
                type="button"
                onClick={onLoadDemoPhotos}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 transition-colors whitespace-nowrap"
              >
                Load Demo Photos
              </button>
            </div>
          </div>
        )}

        {/* Sheet Spec Footer Label */}
        {showSpecFooter && (
          <div
            data-testid="sheet-spec-footer"
            className={`pointer-events-none absolute bottom-1 right-2 z-20 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono-tabular tracking-tight backdrop-blur-xs ${
              isDarkPaper
                ? 'bg-zinc-900/85 text-zinc-200'
                : 'bg-white/90 text-zinc-800 shadow-2xs'
            }`}
          >
            {paperSpec.name} ({orientation.toUpperCase()}) · {orientedDims.widthIn}"×
            {orientedDims.heightIn}" @ {dpi} DPI · {style.shortName}
          </div>
        )}
      </div>
    </div>
  );
};
