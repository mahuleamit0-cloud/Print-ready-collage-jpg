export type PaperSizeId = '12x18' | '13x19' | 'a4' | 'a3';
export type Orientation = 'portrait' | 'landscape';
export type PrintDpi = 300 | 150 | 96;
export type StyleFilterMode = 'match' | 'all';
export type FitMode = 'fill' | 'fit';

export interface PaperSizeSpec {
  id: PaperSizeId;
  name: string;
  shortLabel: string;
  subtitle: string;
  widthIn: number;
  heightIn: number;
  widthMm: number;
  heightMm: number;
  px300W: number;
  px300H: number;
}

export const PAPER_SIZES: Record<PaperSizeId, PaperSizeSpec> = {
  '12x18': {
    id: '12x18',
    name: '12 × 18 inch',
    shortLabel: '12×18"',
    subtitle: 'Large Format Studio Poster Sheet',
    widthIn: 12,
    heightIn: 18,
    widthMm: 304.8,
    heightMm: 457.2,
    px300W: 3600,
    px300H: 5400,
  },
  '13x19': {
    id: '13x19',
    name: '13 × 19 inch',
    shortLabel: '13×19"',
    subtitle: 'Super B / A3+ Fine Art Sheet',
    widthIn: 13,
    heightIn: 19,
    widthMm: 330.2,
    heightMm: 482.6,
    px300W: 3900,
    px300H: 5700,
  },
  a4: {
    id: 'a4',
    name: 'A4 Size',
    shortLabel: 'A4',
    subtitle: 'ISO Standard Print Sheet',
    widthIn: 8.27,
    heightIn: 11.69,
    widthMm: 210,
    heightMm: 297,
    px300W: 2480,
    px300H: 3508,
  },
  a3: {
    id: 'a3',
    name: 'A3 Size',
    shortLabel: 'A3',
    subtitle: 'ISO Wide Studio Sheet',
    widthIn: 11.69,
    heightIn: 16.54,
    widthMm: 297,
    heightMm: 420,
    px300W: 3508,
    px300H: 4960,
  },
};

export interface OrientedPaperDimensions {
  widthIn: number;
  heightIn: number;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  aspectRatio: number;
}

export function getOrientedPaperDimensions(
  paperId: PaperSizeId,
  orientation: Orientation,
  dpi: PrintDpi = 300
): OrientedPaperDimensions {
  const spec = PAPER_SIZES[paperId];
  const isLandscape = orientation === 'landscape';

  const widthIn = isLandscape ? spec.heightIn : spec.widthIn;
  const heightIn = isLandscape ? spec.widthIn : spec.heightIn;
  const widthMm = isLandscape ? spec.heightMm : spec.widthMm;
  const heightMm = isLandscape ? spec.widthMm : spec.heightMm;

  // At 300 DPI, use exact standard pixel specs from prompt; scale proportionally for 150 or 96 DPI
  const baseW = isLandscape ? spec.px300H : spec.px300W;
  const baseH = isLandscape ? spec.px300W : spec.px300H;
  const scale = dpi / 300;

  const widthPx = dpi === 300 ? baseW : Math.round(widthIn * dpi);
  const heightPx = dpi === 300 ? baseH : Math.round(heightIn * dpi);

  return {
    widthIn,
    heightIn,
    widthMm,
    heightMm,
    widthPx: dpi === 300 ? baseW : Math.round(baseW * scale),
    heightPx: dpi === 300 ? baseH : Math.round(baseH * scale),
    aspectRatio: widthIn / heightIn,
  };
}

/**
 * Normalized slot cell definition inside the printable safe area (0..1 range).
 * Using row/col span fractions so gutters are applied uniformly and mathematically cleanly.
 */
export interface NormalizedSlotCell {
  /** Normalized x [0..1] within inner printable area */
  nx: number;
  /** Normalized y [0..1] within inner printable area */
  ny: number;
  /** Normalized width [0..1] within inner printable area */
  nw: number;
  /** Normalized height [0..1] within inner printable area */
  nh: number;
}

export interface ArrangementStyle {
  id: string;
  name: string;
  shortName: string;
  slotCount: number;
  category: 'grid' | 'editorial' | 'strip' | 'synthesized';
  cells: NormalizedSlotCell[];
}

/** Helper to generate a uniform R x C grid */
export function buildUniformGridCells(rows: number, cols: number): NormalizedSlotCell[] {
  const cells: NormalizedSlotCell[] = [];
  const nw = 1 / cols;
  const nh = 1 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        nx: c * nw,
        ny: r * nh,
        nw,
        nh,
      });
    }
  }
  return cells;
}

/** Helper to generate rows where each row has a specified number of columns */
export function buildRowPartitionCells(
  rowCounts: number[],
  rowHeights?: number[]
): NormalizedSlotCell[] {
  const totalRows = rowCounts.length;
  const heights =
    rowHeights && rowHeights.length === totalRows
      ? rowHeights
      : rowCounts.map(() => 1 / totalRows);
  const cells: NormalizedSlotCell[] = [];
  let currentY = 0;
  for (let r = 0; r < totalRows; r++) {
    const countInRow = rowCounts[r];
    const rowH = heights[r];
    const cellW = 1 / countInRow;
    for (let c = 0; c < countInRow; c++) {
      cells.push({
        nx: c * cellW,
        ny: currentY,
        nw: cellW,
        nh: rowH,
      });
    }
    currentY += rowH;
  }
  return cells;
}

/** Helper to generate columns where each column has a specified number of rows */
export function buildColPartitionCells(
  colCounts: number[],
  colWidths?: number[]
): NormalizedSlotCell[] {
  const totalCols = colCounts.length;
  const widths =
    colWidths && colWidths.length === totalCols
      ? colWidths
      : colCounts.map(() => 1 / totalCols);
  const cells: NormalizedSlotCell[] = [];
  let currentX = 0;
  for (let c = 0; c < totalCols; c++) {
    const countInCol = colCounts[c];
    const colW = widths[c];
    const cellH = 1 / countInCol;
    for (let r = 0; r < countInCol; r++) {
      cells.push({
        nx: currentX,
        ny: r * cellH,
        nw: colW,
        nh: cellH,
      });
    }
    currentX += colW;
  }
  return cells;
}

export const STUDIO_STYLES: ArrangementStyle[] = [
  // 1 Slot
  {
    id: '1-full',
    name: '1×1 Full Sheet Print',
    shortName: '1×1 Full',
    slotCount: 1,
    category: 'grid',
    cells: buildUniformGridCells(1, 1),
  },
  {
    id: '1-gallery-inset',
    name: '1×1 Exhibition Center',
    shortName: '1×1 Gallery',
    slotCount: 1,
    category: 'editorial',
    cells: [{ nx: 0.08, ny: 0.08, nw: 0.84, nh: 0.84 }],
  },
  // 2 Slots
  {
    id: '2-stack',
    name: '1×2 Vertical Split',
    shortName: '1×2 Split',
    slotCount: 2,
    category: 'grid',
    cells: buildUniformGridCells(2, 1),
  },
  {
    id: '2-side',
    name: '2×1 Side-by-Side Diptych',
    shortName: '2×1 Diptych',
    slotCount: 2,
    category: 'grid',
    cells: buildUniformGridCells(1, 2),
  },
  {
    id: '2-hero-sub',
    name: 'Hero 65% + Lower Feature',
    shortName: 'Hero + 1',
    slotCount: 2,
    category: 'editorial',
    cells: buildRowPartitionCells([1, 1], [0.65, 0.35]),
  },
  // 3 Slots
  {
    id: '3-hero-top',
    name: 'Hero Top + 2 Split',
    shortName: 'Hero + 2',
    slotCount: 3,
    category: 'editorial',
    cells: buildRowPartitionCells([1, 2], [0.58, 0.42]),
  },
  {
    id: '3-hero-left',
    name: 'Hero Left + 2 Stack',
    shortName: 'Left + 2',
    slotCount: 3,
    category: 'editorial',
    cells: buildColPartitionCells([1, 2], [0.58, 0.42]),
  },
  {
    id: '3-rows',
    name: '1×3 Horizontal Bands',
    shortName: '1×3 Strip',
    slotCount: 3,
    category: 'strip',
    cells: buildUniformGridCells(3, 1),
  },
  // 4 Slots
  {
    id: '4-grid-2x2',
    name: '2×2 Classic Quad Grid',
    shortName: '2×2 Grid',
    slotCount: 4,
    category: 'grid',
    cells: buildUniformGridCells(2, 2),
  },
  {
    id: '4-hero-top-3',
    name: 'Hero Top + 3 Bottom Strip',
    shortName: 'Hero + 3',
    slotCount: 4,
    category: 'editorial',
    cells: buildRowPartitionCells([1, 3], [0.62, 0.38]),
  },
  {
    id: '4-hero-left-3',
    name: 'Hero Left + 3 Right Stack',
    shortName: 'Left + 3',
    slotCount: 4,
    category: 'editorial',
    cells: buildColPartitionCells([1, 3], [0.6, 0.4]),
  },
  {
    id: '4-strip-1x4',
    name: '1×4 Cinema Strip',
    shortName: '1×4 Strip',
    slotCount: 4,
    category: 'strip',
    cells: buildUniformGridCells(4, 1),
  },
  // 5 Slots
  {
    id: '5-2top-3bot',
    name: '2 Top + 3 Bottom Mosaic',
    shortName: '2+3 Mosaic',
    slotCount: 5,
    category: 'editorial',
    cells: buildRowPartitionCells([2, 3], [0.52, 0.48]),
  },
  {
    id: '5-hero-4grid',
    name: 'Hero Top + 2×2 Sub-Grid',
    shortName: 'Hero + 4',
    slotCount: 5,
    category: 'editorial',
    cells: buildRowPartitionCells([1, 2, 2], [0.46, 0.27, 0.27]),
  },
  // 6 Slots
  {
    id: '6-grid-2x3',
    name: '2×3 Studio Portrait Grid',
    shortName: '2×3 Grid',
    slotCount: 6,
    category: 'grid',
    cells: buildUniformGridCells(3, 2),
  },
  {
    id: '6-grid-3x2',
    name: '3×2 Wide Contact Grid',
    shortName: '3×2 Grid',
    slotCount: 6,
    category: 'grid',
    cells: buildUniformGridCells(2, 3),
  },
  {
    id: '6-hero-5',
    name: 'Hero + 5 Gallery Wrap',
    shortName: 'Hero + 5',
    slotCount: 6,
    category: 'editorial',
    cells: buildRowPartitionCells([1, 2, 3], [0.46, 0.27, 0.27]),
  },
  // 8 Slots
  {
    id: '8-grid-2x4',
    name: '2×4 Wallet / Portrait Sheet',
    shortName: '2×4 Grid',
    slotCount: 8,
    category: 'grid',
    cells: buildUniformGridCells(4, 2),
  },
  {
    id: '8-grid-4x2',
    name: '4×2 Landscape Sheet',
    shortName: '4×2 Grid',
    slotCount: 8,
    category: 'grid',
    cells: buildUniformGridCells(2, 4),
  },
  // 9 Slots
  {
    id: '9-grid-3x3',
    name: '3×3 Square Contact Sheet',
    shortName: '3×3 Grid',
    slotCount: 9,
    category: 'grid',
    cells: buildUniformGridCells(3, 3),
  },
  {
    id: '9-hero-8',
    name: 'Hero Top + 4×2 Sub-Grid',
    shortName: 'Hero + 8',
    slotCount: 9,
    category: 'editorial',
    cells: buildRowPartitionCells([1, 4, 4], [0.44, 0.28, 0.28]),
  },
  // 12 Slots
  {
    id: '12-grid-3x4',
    name: '3×4 Studio Proof Sheet',
    shortName: '3×4 Grid',
    slotCount: 12,
    category: 'grid',
    cells: buildUniformGridCells(4, 3),
  },
  {
    id: '12-grid-4x3',
    name: '4×3 Wide Proof Sheet',
    shortName: '4×3 Grid',
    slotCount: 12,
    category: 'grid',
    cells: buildUniformGridCells(3, 4),
  },
];

/**
 * Dynamically synthesizes smart grid and hero+grid templates for ANY arbitrary slot count N
 * (e.g., 7, 10, 11, 13, 15, etc.) when N is not in the standard preset list, or to enrich N.
 */
export function synthesizeDynamicStyles(slotCount: number): ArrangementStyle[] {
  const n = Math.max(1, Math.min(48, Math.round(slotCount)));
  if (n === 1) {
    return STUDIO_STYLES.filter((s) => s.slotCount === 1);
  }

  // 1. Smart Balanced Grid: distribute N across rows so every row is full width
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const balancedRowCounts: number[] = [];
  let rem = n;
  for (let r = 0; r < rows; r++) {
    const rowsLeft = rows - r;
    const countThisRow = Math.ceil(rem / rowsLeft);
    balancedRowCounts.push(countThisRow);
    rem -= countThisRow;
  }

  // 2. Hero + (N-1) Grid: 1 Hero on top (42% height), remaining N-1 slots in balanced rows below
  const subN = n - 1;
  const subCols = Math.max(1, Math.ceil(Math.sqrt(subN)));
  const subRows = Math.max(1, Math.ceil(subN / subCols));
  const heroRowCounts: number[] = [1];
  const heroRowHeights: number[] = [0.42];
  let subRem = subN;
  const eachSubRowH = 0.58 / subRows;
  for (let r = 0; r < subRows; r++) {
    const rowsLeft = subRows - r;
    const c = Math.ceil(subRem / rowsLeft);
    heroRowCounts.push(c);
    heroRowHeights.push(eachSubRowH);
    subRem -= c;
  }

  // 3. Column-wise Smart Mosaic (Hero Left + Right Grid)
  const colCounts = [...balancedRowCounts];

  return [
    {
      id: `synth-grid-${n}`,
      name: `Smart ${n}-Slot Balanced Grid`,
      shortName: `${n}-Slot Grid`,
      slotCount: n,
      category: 'synthesized',
      cells: buildRowPartitionCells(balancedRowCounts),
    },
    {
      id: `synth-hero-${n}`,
      name: `Hero Feature + ${n - 1} Grid`,
      shortName: `Hero + ${n - 1}`,
      slotCount: n,
      category: 'synthesized',
      cells: buildRowPartitionCells(heroRowCounts, heroRowHeights),
    },
    {
      id: `synth-col-${n}`,
      name: `Editorial ${n}-Slot Columns`,
      shortName: `${n}-Slot Cols`,
      slotCount: n,
      category: 'synthesized',
      cells: buildColPartitionCells(colCounts),
    },
  ];
}

/**
 * Returns arrangement styles based on filter mode ('match' vs 'all') and uploaded photo count.
 */
export function getAvailableStyles(
  photoCount: number,
  filterMode: StyleFilterMode
): ArrangementStyle[] {
  const effectiveCount = Math.max(1, photoCount);
  if (filterMode === 'match') {
    const exactPresets = STUDIO_STYLES.filter((s) => s.slotCount === effectiveCount);
    if (exactPresets.length > 0) {
      return exactPresets;
    }
    return synthesizeDynamicStyles(effectiveCount);
  }
  // In 'all' mode, if photoCount is a non-standard number (like 7 or 10), include its synthesized templates at the top too!
  const hasStandardPreset = STUDIO_STYLES.some((s) => s.slotCount === effectiveCount);
  if (!hasStandardPreset && photoCount > 0) {
    return [...synthesizeDynamicStyles(effectiveCount), ...STUDIO_STYLES];
  }
  return STUDIO_STYLES;
}

export interface ComputedSlotRect {
  slotIndex: number;
  /** Physical X on sheet in inches */
  xIn: number;
  /** Physical Y on sheet in inches */
  yIn: number;
  /** Physical width of slot in inches */
  widthIn: number;
  /** Physical height of slot in inches */
  heightIn: number;
  /** Percentage of total sheet width [0..100] */
  leftPct: number;
  /** Percentage of total sheet height [0..100] */
  topPct: number;
  /** Percentage width of total sheet [0..100] */
  widthPct: number;
  /** Percentage height of total sheet [0..100] */
  heightPct: number;
}

/**
 * Computes exact physical slot rectangles (in inches and sheet percentages)
 * honoring outer safe margin and inter-photo gutter/gap.
 */
export function computeSheetSlotRects(
  paperWidthIn: number,
  paperHeightIn: number,
  style: ArrangementStyle,
  outerMarginIn: number,
  gutterIn: number
): ComputedSlotRect[] {
  const clampedMargin = Math.max(
    0,
    Math.min(outerMarginIn, Math.min(paperWidthIn, paperHeightIn) * 0.25)
  );
  const safeW = Math.max(0.5, paperWidthIn - clampedMargin * 2);
  const safeH = Math.max(0.5, paperHeightIn - clampedMargin * 2);
  const clampedGutter = Math.max(0, Math.min(gutterIn, Math.min(safeW, safeH) * 0.2));

  const eps = 0.001;

  return style.cells.map((cell, idx) => {
    const touchesLeft = cell.nx <= eps;
    const touchesRight = cell.nx + cell.nw >= 1 - eps;
    const touchesTop = cell.ny <= eps;
    const touchesBottom = cell.ny + cell.nh >= 1 - eps;

    const insetLeft = touchesLeft ? 0 : clampedGutter / 2;
    const insetRight = touchesRight ? 0 : clampedGutter / 2;
    const insetTop = touchesTop ? 0 : clampedGutter / 2;
    const insetBottom = touchesBottom ? 0 : clampedGutter / 2;

    const rawX = clampedMargin + cell.nx * safeW;
    const rawY = clampedMargin + cell.ny * safeH;
    const rawW = cell.nw * safeW;
    const rawH = cell.nh * safeH;

    const xIn = rawX + insetLeft;
    const yIn = rawY + insetTop;
    const widthIn = Math.max(0.1, rawW - insetLeft - insetRight);
    const heightIn = Math.max(0.1, rawH - insetTop - insetBottom);

    return {
      slotIndex: idx,
      xIn,
      yIn,
      widthIn,
      heightIn,
      leftPct: (xIn / paperWidthIn) * 100,
      topPct: (yIn / paperHeightIn) * 100,
      widthPct: (widthIn / paperWidthIn) * 100,
      heightPct: (heightIn / paperHeightIn) * 100,
    };
  });
}

/**
 * Computes approximate physical slot dimensions string (e.g. '5.6" × 8.4"') for a style card preview.
 */
export function getStyleApproxSlotDimensionsLabel(
  paperWidthIn: number,
  paperHeightIn: number,
  style: ArrangementStyle,
  outerMarginIn: number,
  gutterIn: number
): string {
  const rects = computeSheetSlotRects(
    paperWidthIn,
    paperHeightIn,
    style,
    outerMarginIn,
    gutterIn
  );
  if (rects.length === 0) return '';
  const first = rects[0];
  return `${first.widthIn.toFixed(1)}" × ${first.heightIn.toFixed(1)}"`;
}

export interface PhotoItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface SlotTransform {
  zoom: number; // 1.0 to 3.0
  rotation: number; // 0, 90, 180, 270
  fitMode: FitMode; // 'fill' | 'fit'
  panX: number; // -100 to 100 (% offset)
  panY: number; // -100 to 100 (% offset)
  customPhotoId?: string; // Optional override when user swaps slots
}

export const DEFAULT_SLOT_TRANSFORM: SlotTransform = {
  zoom: 1.0,
  rotation: 0,
  fitMode: 'fill',
  panX: 0,
  panY: 0,
};

/**
 * Resolves which PhotoItem appears in each slot of the active ArrangementStyle.
 * Cycles through uploaded photos when slotCount > photos.length.
 */
export function resolveSlotPhotos(
  photos: PhotoItem[],
  slotCount: number,
  slotOrderOverrides: number[]
): (PhotoItem | null)[] {
  if (photos.length === 0) {
    return Array.from({ length: slotCount }, () => null);
  }
  return Array.from({ length: slotCount }, (_, slotIdx) => {
    const mappedIndex =
      slotOrderOverrides[slotIdx] !== undefined ? slotOrderOverrides[slotIdx] : slotIdx;
    const photoIndex = ((mappedIndex % photos.length) + photos.length) % photos.length;
    return photos[photoIndex] || null;
  });
}

/**
 * Swaps activeSlotIndex with the next slot ((activeSlotIndex + 1) % slotCount)
 * in both the slot order mapping and slot transforms.
 */
export function swapSlotWithNext(
  activeSlotIndex: number,
  slotCount: number,
  currentOrder: number[],
  currentTransforms: Record<number, SlotTransform>
): {
  nextOrder: number[];
  nextTransforms: Record<number, SlotTransform>;
  newActiveSlot: number;
} {
  if (slotCount <= 1) {
    return {
      nextOrder: currentOrder,
      nextTransforms: currentTransforms,
      newActiveSlot: activeSlotIndex,
    };
  }
  const targetSlot = (activeSlotIndex + 1) % slotCount;
  const normalizedOrder = Array.from({ length: slotCount }, (_, i) =>
    currentOrder[i] !== undefined ? currentOrder[i] : i
  );
  const tempOrder = normalizedOrder[activeSlotIndex];
  normalizedOrder[activeSlotIndex] = normalizedOrder[targetSlot];
  normalizedOrder[targetSlot] = tempOrder;

  const nextTransforms = { ...currentTransforms };
  const tA = nextTransforms[activeSlotIndex] || { ...DEFAULT_SLOT_TRANSFORM };
  const tB = nextTransforms[targetSlot] || { ...DEFAULT_SLOT_TRANSFORM };
  nextTransforms[activeSlotIndex] = { ...tB };
  nextTransforms[targetSlot] = { ...tA };

  return {
    nextOrder: normalizedOrder,
    nextTransforms,
    newActiveSlot: targetSlot,
  };
}
