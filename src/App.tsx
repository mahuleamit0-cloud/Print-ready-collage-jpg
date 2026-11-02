/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Download,
  FileText,
  ImagePlus,
  Images,
  LayoutGrid,
  Scissors,
  Sparkles,
} from 'lucide-react';
import {
  ArrangementStyle,
  DEFAULT_SLOT_TRANSFORM,
  Orientation,
  PAPER_SIZES,
  PaperSizeId,
  PhotoItem,
  PrintDpi,
  SlotTransform,
   STUDIO_STYLES,
  StyleFilterMode,
  getAvailableStyles,
  getOrientedPaperDimensions,
  swapSlotWithNext,
} from './utils/printLayoutEngine';
import { DEMO_STUDIO_PHOTOS } from './utils/demoPhotos';
import { exportSheetAsJpg, exportSheetAsPdf } from './utils/sheetExporter';
import { LiveSheetCanvas } from './components/LiveSheetCanvas';
import { BottomSlotPillBar } from './components/BottomSlotPillBar';
import { ActivePopupType, FloatingPopups } from './components/FloatingPopups';

export default function App() {
  // Core studio state
  const [photos, setPhotos] = useState<PhotoItem[]>(() => [...DEMO_STUDIO_PHOTOS]);
  const [paperId, setPaperId] = useState<PaperSizeId>('12x18');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [dpi, setDpi] = useState<PrintDpi>(300);

  // Arrangement style state (default 2x2 Grid for 4 initial demo photos)
  const [activeStyle, setActiveStyle] = useState<ArrangementStyle>(
    () => STUDIO_STYLES.find((s) => s.id === '4-grid-2x2') || STUDIO_STYLES[0]
  );
  const [styleFilterMode, setStyleFilterMode] = useState<StyleFilterMode>('match');
  const [autoHideOnPick, setAutoHideOnPick] = useState<boolean>(true);

  // Sheet Margins, Gutters & Cut Marks state
  const [outerMarginIn, setOuterMarginIn] = useState<number>(0.4);
  const [gutterIn, setGutterIn] = useState<number>(0.16);
  const [cornerRadiusPx, setCornerRadiusPx] = useState<number>(0);
  const [paperBgColor, setPaperBgColor] = useState<string>('#ffffff');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [showFrameBorder, setShowFrameBorder] = useState<boolean>(false);
  const [showSpecFooter, setShowSpecFooter] = useState<boolean>(true);

  // Per-slot transforms & selection
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [slotOrderOverrides, setSlotOrderOverrides] = useState<number[]>([]);
  const [slotTransforms, setSlotTransforms] = useState<Record<number, SlotTransform>>(
    {}
  );

  // Active Floating Side Pop-up Drawer
  const [activePopup, setActivePopup] = useState<ActivePopupType>(null);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const paperSpec = PAPER_SIZES[paperId];
  const orientedDims = getOrientedPaperDimensions(paperId, orientation, dpi);

  // Automatically sync arrangement style when photo count changes in 'match' mode
  const syncStyleForPhotoCount = (newCount: number, mode: StyleFilterMode) => {
    if (mode === 'match' && newCount > 0) {
      const matching = getAvailableStyles(newCount, 'match');
      if (matching.length > 0) {
        setActiveStyle(matching[0]);
        setActiveSlotIndex(0);
      }
    }
  };

  const handleTogglePopup = (target: ActivePopupType) => {
    setActivePopup((prev) => (prev === target ? null : target));
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const loadedItems: PhotoItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ w: img.naturalWidth || 1200, h: img.naturalHeight || 1600 });
        img.onerror = () => resolve({ w: 1200, h: 1600 });
        img.src = dataUrl;
      });

      loadedItems.push({
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        dataUrl,
        width: dims.w,
        height: dims.h,
      });
    }

    const updated = [...photos, ...loadedItems];
    setPhotos(updated);
    setSlotOrderOverrides([]);
    syncStyleForPhotoCount(updated.length, styleFilterMode);
    // Specification requirement: Automatically opens the Styles Pop-up right after new photos are uploaded via +
    setActivePopup('styles');
    e.target.value = '';
  };

  const handleDuplicatePhoto = (photoId: string) => {
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx === -1) return;
    const source = photos[idx];
    const copy: PhotoItem = {
      ...source,
      id: `${source.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${source.name} (Copy)`,
    };
    const next = [...photos.slice(0, idx + 1), copy, ...photos.slice(idx + 1)];
    setPhotos(next);
    setSlotOrderOverrides([]);
    syncStyleForPhotoCount(next.length, styleFilterMode);
  };

  const handleRemovePhoto = (photoId: string) => {
    const next = photos.filter((p) => p.id !== photoId);
    setPhotos(next);
    setSlotOrderOverrides([]);
    syncStyleForPhotoCount(next.length, styleFilterMode);
  };

  const handleClearPhotos = () => {
    setPhotos([]);
    setSlotOrderOverrides([]);
    setSlotTransforms({});
    setActiveSlotIndex(0);
  };

  const handleLoadDemoPhotos = () => {
    const clones = DEMO_STUDIO_PHOTOS.map((p, i) => ({
      ...p,
      id: `demo-${Date.now()}-${i}`,
    }));
    setPhotos(clones);
    setSlotOrderOverrides([]);
    setSlotTransforms({});
    syncStyleForPhotoCount(clones.length, styleFilterMode);
    setActivePopup('styles');
  };

  const handleSelectStyle = (style: ArrangementStyle) => {
    setActiveStyle(style);
    setActiveSlotIndex(0);
    setSlotOrderOverrides([]);
    if (autoHideOnPick) {
      setActivePopup(null);
    }
  };

  const handleChangeStyleFilterMode = (mode: StyleFilterMode) => {
    setStyleFilterMode(mode);
    if (mode === 'match') {
      syncStyleForPhotoCount(photos.length, 'match');
    }
  };

  // Active slot transform handlers
  const currentActiveTransform: SlotTransform =
    slotTransforms[activeSlotIndex] || DEFAULT_SLOT_TRANSFORM;

  const updateActiveSlotTransform = (patch: Partial<SlotTransform>) => {
    setSlotTransforms((prev) => ({
      ...prev,
      [activeSlotIndex]: {
        ...(prev[activeSlotIndex] || DEFAULT_SLOT_TRANSFORM),
        ...patch,
      },
    }));
  };

  const handlePanSlot = (
    slotIndex: number,
    deltaPanX: number,
    deltaPanY: number
  ) => {
    setSlotTransforms((prev) => {
      const curr = prev[slotIndex] || DEFAULT_SLOT_TRANSFORM;
      const nextX = Math.max(-80, Math.min(80, curr.panX + deltaPanX));
      const nextY = Math.max(-80, Math.min(80, curr.panY + deltaPanY));
      return {
        ...prev,
        [slotIndex]: {
          ...curr,
          panX: nextX,
          panY: nextY,
        },
      };
    });
  };

  const handleSwapNextSlot = () => {
    const { nextOrder, nextTransforms, newActiveSlot } = swapSlotWithNext(
      activeSlotIndex,
      activeStyle.slotCount,
      slotOrderOverrides,
      slotTransforms
    );
    setSlotOrderOverrides(nextOrder);
    setSlotTransforms(nextTransforms);
    setActiveSlotIndex(newActiveSlot);
  };

  const handleResetActiveSlot = () => {
    setSlotTransforms((prev) => ({
      ...prev,
      [activeSlotIndex]: { ...DEFAULT_SLOT_TRANSFORM },
    }));
  };

  // High-Res Export Handlers
  const getRenderConfig = () => ({
    paperSpec,
    orientedDims,
    orientation,
    dpi,
    style: activeStyle,
    photos,
    slotOrderOverrides,
    slotTransforms,
    outerMarginIn,
    gutterIn,
    cornerRadiusPx,
    paperBgColor,
    showCropMarks,
    showFrameBorder,
    showSpecFooter,
  });

  const handleExportPdf = async () => {
    setIsExporting(true);
    setLastExportMessage(null);
    try {
      const filename = await exportSheetAsPdf(getRenderConfig());
      setLastExportMessage(
        `Saved 1:1 Print PDF: ${filename} (${orientedDims.widthIn}"×${orientedDims.heightIn}" @ ${dpi} DPI)`
      );
    } catch (err: any) {
      setLastExportMessage(`PDF export error: ${err?.message || 'Failed'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJpg = async () => {
    setIsExporting(true);
    setLastExportMessage(null);
    try {
      const filename = await exportSheetAsJpg(getRenderConfig());
      setLastExportMessage(
        `Saved High-Res JPG: ${filename} (${orientedDims.widthPx}×${orientedDims.heightPx} px)`
      );
    } catch (err: any) {
      setLastExportMessage(`JPG export error: ${err?.message || 'Failed'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-dvh w-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100 select-none">
      {/* Hidden Multi-Image File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* COMPACT TOP APP BAR (3-Zone Contract) */}
      <header className="h-12 px-2 sm:px-5 border-b border-zinc-800/90 bg-zinc-900/90 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-4 shrink-0 z-30">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center shrink-0">
          <span className="text-[11px] sm:text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap">
            PrintGrid Studio
          </span>
        </div>

        {/* Zone 2: Clean Unboxed Live Photo Count & Active Paper/Style Summary */}
        <div
          data-testid="top-bar-summary"
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-zinc-400 font-mono-tabular whitespace-nowrap shrink-0"
        >
          <span className="text-zinc-200 font-semibold">
            {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-400 font-medium">
            {paperSpec.shortLabel} • {activeStyle.shortName}
          </span>
          <span aria-hidden="true" className="hidden md:inline">
            ·
          </span>
          <span className="hidden md:inline text-zinc-400">
            {orientation === 'portrait' ? 'Portrait' : 'Landscape'} ({dpi} DPI)
          </span>
        </div>

        {/* Zone 3: Prominent + Add Images & Save / Export actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTriggerUpload}
            aria-label="+ Add Images"
            className="min-h-[32px] sm:min-h-[36px] px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-[10px] sm:text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ImagePlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">+ Add Images</span>
            <span className="sm:hidden">+ Add</span>
          </button>
          <button
            type="button"
            onClick={() => handleTogglePopup('export')}
            aria-label="Save / Export"
            className="min-h-[32px] sm:min-h-[36px] px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] sm:text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:inline">Save / Export</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </header>

      {/* MAIN ZERO-SCROLL STAGE */}
      <main className="relative flex-1 flex overflow-hidden">
        {/* LEFT FLOATING TOOL DOCK (Vertical Icon Rail) */}
        <nav
          aria-label="PrintGrid Studio Tool Dock"
          className="fixed left-2 sm:left-3 top-14 z-30 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 shadow-2xl"
        >
          {/* 1. Add + */}
          <button
            type="button"
            onClick={handleTriggerUpload}
            aria-label="Add + Images"
            className="min-w-[48px] min-h-[46px] px-1.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 flex flex-col items-center justify-center transition-colors cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
            <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">
              Add +
            </span>
          </button>

          {/* 2. Photos */}
          <button
            type="button"
            onClick={() => handleTogglePopup('photos')}
            aria-label={`Photos (${photos.length})`}
            aria-expanded={activePopup === 'photos'}
            className={`relative min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
              activePopup === 'photos'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
            }`}
          >
            <Images className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Photos
            </span>
            <span
              className={`text-[9px] font-mono-tabular leading-none mt-0.5 ${
                activePopup === 'photos' ? 'text-zinc-950 font-bold' : 'text-amber-400'
              }`}
            >
              {photos.length}
            </span>
          </button>

          {/* 3. Paper */}
          <button
            type="button"
            onClick={() => handleTogglePopup('paper')}
            aria-label={`Paper (${paperSpec.shortLabel})`}
            aria-expanded={activePopup === 'paper'}
            className={`min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
              activePopup === 'paper'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Paper
            </span>
            <span
              className={`text-[9px] font-mono-tabular leading-none mt-0.5 ${
                activePopup === 'paper' ? 'text-zinc-950 font-bold' : 'text-zinc-400'
              }`}
            >
              {paperSpec.shortLabel}
            </span>
          </button>

          {/* 4. Styles */}
          <button
            type="button"
            onClick={() => handleTogglePopup('styles')}
            aria-label={`Styles (${activeStyle.shortName})`}
            aria-expanded={activePopup === 'styles'}
            className={`min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
              activePopup === 'styles'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Styles
            </span>
            <span
              className={`text-[9px] font-mono-tabular leading-none mt-0.5 ${
                activePopup === 'styles' ? 'text-zinc-950 font-bold' : 'text-zinc-400'
              }`}
            >
              {styleFilterMode === 'match' ? `Match` : `All`}
            </span>
          </button>

          {/* 5. Margins (Cut/Gap) */}
          <button
            type="button"
            onClick={() => handleTogglePopup('margins')}
            aria-label="Margins (Cut/Gap)"
            aria-expanded={activePopup === 'margins'}
            className={`min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
              activePopup === 'margins'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Margins
            </span>
            <span
              className={`text-[9px] font-mono-tabular leading-none mt-0.5 ${
                activePopup === 'margins' ? 'text-zinc-950 font-bold' : 'text-zinc-400'
              }`}
            >
              Cut/Gap
            </span>
          </button>

          {/* 6. Export */}
          <button
            type="button"
            onClick={() => handleTogglePopup('export')}
            aria-label="Export Sheet"
            aria-expanded={activePopup === 'export'}
            className={`min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
              activePopup === 'export'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Export
            </span>
            <span
              className={`text-[9px] font-mono-tabular leading-none mt-0.5 ${
                activePopup === 'export' ? 'text-zinc-950 font-bold' : 'text-zinc-400'
              }`}
            >
              {dpi}DPI
            </span>
          </button>

          {/* 7. Studio AI (Live Voice, Search Grounding & TTS) */}
          <button
            type="button"
            onClick={() => handleTogglePopup('assistant')}
            aria-label="Studio AI (Voice & Print Guide)"
            aria-expanded={activePopup === 'assistant'}
            className={`min-w-[48px] min-h-[46px] px-1.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer border-t border-zinc-800/80 pt-1.5 ${
              activePopup === 'assistant'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-amber-300 hover:bg-zinc-800/80'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Studio AI
            </span>
          </button>
        </nav>

        {/* CLICK-TO-OPEN SIDE FLOATING POP-UP DRAWERS */}
        <FloatingPopups
          activePopup={activePopup}
          onClose={() => setActivePopup(null)}
          photos={photos}
          onTriggerUpload={handleTriggerUpload}
          onDuplicatePhoto={handleDuplicatePhoto}
          onRemovePhoto={handleRemovePhoto}
          onClearPhotos={handleClearPhotos}
          onLoadDemoPhotos={handleLoadDemoPhotos}
          paperId={paperId}
          orientation={orientation}
          orientedDims={orientedDims}
          onSelectPaper={(id) => setPaperId(id)}
          onSelectOrientation={(o) => setOrientation(o)}
          activeStyle={activeStyle}
          styleFilterMode={styleFilterMode}
          autoHideOnPick={autoHideOnPick}
          onChangeStyleFilterMode={handleChangeStyleFilterMode}
          onToggleAutoHideOnPick={setAutoHideOnPick}
          onSelectStyle={handleSelectStyle}
          outerMarginIn={outerMarginIn}
          gutterIn={gutterIn}
          cornerRadiusPx={cornerRadiusPx}
          paperBgColor={paperBgColor}
          showCropMarks={showCropMarks}
          showFrameBorder={showFrameBorder}
          showSpecFooter={showSpecFooter}
          onChangeOuterMargin={setOuterMarginIn}
          onChangeGutter={setGutterIn}
          onChangeCornerRadius={setCornerRadiusPx}
          onChangePaperBgColor={setPaperBgColor}
          onToggleCropMarks={setShowCropMarks}
          onToggleFrameBorder={setShowFrameBorder}
          onToggleSpecFooter={setShowSpecFooter}
          dpi={dpi}
          isExporting={isExporting}
          lastExportMessage={lastExportMessage}
          onChangeDpi={setDpi}
          onExportPdf={handleExportPdf}
          onExportJpg={handleExportJpg}
        />

        {/* LIVE PRINT SHEET CANVAS (MAIN STAGE) */}
        <LiveSheetCanvas
          paperSpec={paperSpec}
          orientedDims={orientedDims}
          orientation={orientation}
          dpi={dpi}
          style={activeStyle}
          photos={photos}
          slotOrderOverrides={slotOrderOverrides}
          slotTransforms={slotTransforms}
          activeSlotIndex={activeSlotIndex}
          outerMarginIn={outerMarginIn}
          gutterIn={gutterIn}
          cornerRadiusPx={cornerRadiusPx}
          paperBgColor={paperBgColor}
          showCropMarks={showCropMarks}
          showFrameBorder={showFrameBorder}
          showSpecFooter={showSpecFooter}
          onSelectSlot={(idx) => setActiveSlotIndex(idx)}
          onPanSlot={handlePanSlot}
          onStageBackgroundClick={() => setActivePopup(null)}
          onTriggerUpload={handleTriggerUpload}
          onLoadDemoPhotos={handleLoadDemoPhotos}
        />

        {/* FLOATING BOTTOM SLOT CONTROL PILL BAR */}
        <BottomSlotPillBar
          activeSlotIndex={activeSlotIndex}
          totalSlots={activeStyle.slotCount}
          transform={currentActiveTransform}
          onChangeZoom={(zoom) => updateActiveSlotTransform({ zoom })}
          onRotate90={() =>
            updateActiveSlotTransform({
              rotation: (currentActiveTransform.rotation + 90) % 360,
            })
          }
          onToggleFitMode={() =>
            updateActiveSlotTransform({
              fitMode: currentActiveTransform.fitMode === 'fill' ? 'fit' : 'fill',
            })
          }
          onSwapNext={handleSwapNextSlot}
          onResetSlot={handleResetActiveSlot}
        />
      </main>
    </div>
  );
}
