import { jsPDF } from 'jspdf';
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
} from './printLayoutEngine';

export interface SheetRenderConfig {
  paperSpec: PaperSizeSpec;
  orientedDims: OrientedPaperDimensions;
  orientation: 'portrait' | 'landscape';
  dpi: PrintDpi;
  style: ArrangementStyle;
  photos: PhotoItem[];
  slotOrderOverrides: number[];
  slotTransforms: Record<number, SlotTransform>;
  outerMarginIn: number;
  gutterIn: number;
  cornerRadiusPx: number;
  paperBgColor: string;
  showCropMarks: boolean;
  showFrameBorder: boolean;
  showSpecFooter: boolean;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders the full print sheet onto an off-screen HTML5 canvas at the target DPI.
 */
export async function renderSheetToOffscreenCanvas(
  config: SheetRenderConfig
): Promise<HTMLCanvasElement> {
  const {
    paperSpec,
    orientedDims,
    orientation,
    dpi,
    style,
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
  } = config;

  const canvas = document.createElement('canvas');
  canvas.width = orientedDims.widthPx;
  canvas.height = orientedDims.heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D rendering context for export.');
  }

  const W = canvas.width;
  const H = canvas.height;
  const pxPerInch = W / orientedDims.widthIn;
  // Scale UI-relative pixels (like cornerRadiusPx designed around ~600px preview) proportionally to full print resolution
  const uiScale = W / 600;

  // 1. Fill paper background
  ctx.fillStyle = paperBgColor || '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Determine contrast color for crop marks & footer text based on paperBgColor luminance
  const isDarkPaper =
    paperBgColor.toLowerCase() === '#141416' ||
    paperBgColor.toLowerCase() === '#09090b' ||
    paperBgColor.toLowerCase() === '#000000';
  const markColor = isDarkPaper ? 'rgba(244, 244, 245, 0.72)' : 'rgba(24, 24, 27, 0.68)';

  // 2. Compute slot rectangles in physical inches -> pixels
  const slotRects: ComputedSlotRect[] = computeSheetSlotRects(
    orientedDims.widthIn,
    orientedDims.heightIn,
    style,
    outerMarginIn,
    gutterIn
  );
  const resolvedPhotos = resolveSlotPhotos(photos, style.slotCount, slotOrderOverrides);

  // Preload unique images
  const imageCache = new Map<string, HTMLImageElement>();
  for (const photo of resolvedPhotos) {
    if (photo && !imageCache.has(photo.id)) {
      try {
        const imgEl = await loadImageElement(photo.dataUrl);
        imageCache.set(photo.id, imgEl);
      } catch (e) {
        console.warn('Could not load photo for export:', photo.name, e);
      }
    }
  }

  // 3. Draw each slot
  for (let i = 0; i < slotRects.length; i++) {
    const rect = slotRects[i];
    const photo = resolvedPhotos[i];
    const transform = slotTransforms[i] || DEFAULT_SLOT_TRANSFORM;

    const sx = rect.xIn * pxPerInch;
    const sy = rect.yIn * pxPerInch;
    const sw = rect.widthIn * pxPerInch;
    const sh = rect.heightIn * pxPerInch;
    const scaledRadius = cornerRadiusPx * uiScale;

    // Optional Scissor Cut / Crop Marks around slot
    if (showCropMarks) {
      ctx.save();
      ctx.strokeStyle = markColor;
      ctx.lineWidth = Math.max(1, 1.2 * uiScale);
      ctx.setLineDash([6 * uiScale, 5 * uiScale]);
      ctx.strokeRect(
        sx - 2 * uiScale,
        sy - 2 * uiScale,
        sw + 4 * uiScale,
        sh + 4 * uiScale
      );
      ctx.setLineDash([]);

      // Corner L-marks
      const tickLen = Math.min(14 * uiScale, Math.min(sw, sh) * 0.12);
      const offset = 4 * uiScale;
      ctx.lineWidth = Math.max(1.5, 1.8 * uiScale);
      ctx.beginPath();
      // Top-left
      ctx.moveTo(sx - offset, sy - offset + tickLen);
      ctx.lineTo(sx - offset, sy - offset);
      ctx.lineTo(sx - offset + tickLen, sy - offset);
      // Top-right
      ctx.moveTo(sx + sw + offset - tickLen, sy - offset);
      ctx.lineTo(sx + sw + offset, sy - offset);
      ctx.lineTo(sx + sw + offset, sy - offset + tickLen);
      // Bottom-left
      ctx.moveTo(sx - offset, sy + sh + offset - tickLen);
      ctx.lineTo(sx - offset, sy + sh + offset);
      ctx.lineTo(sx - offset + tickLen, sy + sh + offset);
      // Bottom-right
      ctx.moveTo(sx + sw + offset - tickLen, sy + sh + offset);
      ctx.lineTo(sx + sw + offset, sy + sh + offset);
      ctx.lineTo(sx + sw + offset, sy + sh + offset - tickLen);
      ctx.stroke();
      ctx.restore();
    }

    // Clip slot rounded rectangle
    ctx.save();
    drawRoundedRectPath(ctx, sx, sy, sw, sh, scaledRadius);
    ctx.clip();

    // Subtle slot backing when fit mode or empty
    ctx.fillStyle = isDarkPaper ? '#27272a' : '#f4f4f5';
    ctx.fillRect(sx, sy, sw, sh);

    if (photo && imageCache.has(photo.id)) {
      const img = imageCache.get(photo.id)!;
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;

      ctx.save();
      ctx.translate(cx, cy);
      // Apply pan offset (% of slot dimensions)
      ctx.translate((transform.panX / 100) * sw, (transform.panY / 100) * sh);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(transform.zoom, transform.zoom);

      const isRotated90 = transform.rotation % 180 !== 0;
      const targetW = isRotated90 ? sh : sw;
      const targetH = isRotated90 ? sw : sh;

      const imgAspect = (img.naturalWidth || photo.width) / (img.naturalHeight || photo.height);
      const slotAspect = targetW / targetH;

      let drawW = targetW;
      let drawH = targetH;

      if (transform.fitMode === 'fill') {
        if (imgAspect > slotAspect) {
          drawH = targetH;
          drawW = targetH * imgAspect;
        } else {
          drawW = targetW;
          drawH = targetW / imgAspect;
        }
      } else {
        if (imgAspect > slotAspect) {
          drawW = targetW;
          drawH = targetW / imgAspect;
        } else {
          drawH = targetH;
          drawW = targetH * imgAspect;
        }
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
    ctx.restore();

    // Optional Thin Frame Border on Photos
    if (showFrameBorder) {
      ctx.save();
      drawRoundedRectPath(ctx, sx, sy, sw, sh, scaledRadius);
      ctx.strokeStyle = isDarkPaper
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(24, 24, 27, 0.25)';
      ctx.lineWidth = Math.max(1, 1.5 * uiScale);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Optional Sheet Spec Footer Label
  if (showSpecFooter) {
    ctx.save();
    const fontSize = Math.max(11, Math.round(10 * uiScale));
    ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = markColor;
    ctx.textAlign = 'right';
    const footerText = `PrintGrid Studio v2.0 · ${paperSpec.name} (${orientation.toUpperCase()}) · ${orientedDims.widthIn}"×${orientedDims.heightIn}" @ ${dpi} DPI (${W}×${H} px) · ${style.shortName}`;
    ctx.fillText(footerText, W - 16 * uiScale, H - 10 * uiScale);
    ctx.restore();
  }

  return canvas;
}

export function buildExportFilename(
  paperId: string,
  orientation: 'portrait' | 'landscape',
  dpi: PrintDpi,
  ext: 'jpg' | 'pdf'
): string {
  const cleanPaper = paperId.toUpperCase();
  return `PrintGrid_${cleanPaper}_${orientation}_${dpi}DPI.${ext}`;
}

export async function exportSheetAsJpg(config: SheetRenderConfig): Promise<string> {
  const canvas = await renderSheetToOffscreenCanvas(config);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
  const filename = buildExportFilename(
    config.paperSpec.id,
    config.orientation,
    config.dpi,
    'jpg'
  );

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return filename;
}

export async function exportSheetAsPdf(config: SheetRenderConfig): Promise<string> {
  const canvas = await renderSheetToOffscreenCanvas(config);
  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  const { widthIn, heightIn } = config.orientedDims;

  const pdf = new jsPDF({
    orientation: config.orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'in',
    format: [widthIn, heightIn],
    compress: true,
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, widthIn, heightIn);
  const filename = buildExportFilename(
    config.paperSpec.id,
    config.orientation,
    config.dpi,
    'pdf'
  );
  pdf.save(filename);
  return filename;
}
