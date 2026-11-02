import React, { useEffect, useRef, useState } from 'react';
import {
  CopyPlus,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  ArrangementStyle,
  Orientation,
  OrientedPaperDimensions,
  PAPER_SIZES,
  PaperSizeId,
  PhotoItem,
  PrintDpi,
  StyleFilterMode,
  getAvailableStyles,
  getStyleApproxSlotDimensionsLabel,
} from '../utils/printLayoutEngine';

export type ActivePopupType =
  | null
  | 'photos'
  | 'paper'
  | 'styles'
  | 'margins'
  | 'export'
  | 'assistant';

interface FloatingPopupsProps {
  activePopup: ActivePopupType;
  onClose: () => void;

  // Photos state
  photos: PhotoItem[];
  onTriggerUpload: () => void;
  onDuplicatePhoto: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onClearPhotos: () => void;
  onLoadDemoPhotos: () => void;

  // Paper state
  paperId: PaperSizeId;
  orientation: Orientation;
  orientedDims: OrientedPaperDimensions;
  onSelectPaper: (id: PaperSizeId) => void;
  onSelectOrientation: (o: Orientation) => void;

  // Styles state
  activeStyle: ArrangementStyle;
  styleFilterMode: StyleFilterMode;
  autoHideOnPick: boolean;
  onChangeStyleFilterMode: (mode: StyleFilterMode) => void;
  onToggleAutoHideOnPick: (val: boolean) => void;
  onSelectStyle: (style: ArrangementStyle) => void;

  // Margins & Cut Lines state
  outerMarginIn: number;
  gutterIn: number;
  cornerRadiusPx: number;
  paperBgColor: string;
  showCropMarks: boolean;
  showFrameBorder: boolean;
  showSpecFooter: boolean;
  onChangeOuterMargin: (val: number) => void;
  onChangeGutter: (val: number) => void;
  onChangeCornerRadius: (val: number) => void;
  onChangePaperBgColor: (color: string) => void;
  onToggleCropMarks: (val: boolean) => void;
  onToggleFrameBorder: (val: boolean) => void;
  onToggleSpecFooter: (val: boolean) => void;

  // Export state
  dpi: PrintDpi;
  isExporting: boolean;
  lastExportMessage: string | null;
  onChangeDpi: (dpi: PrintDpi) => void;
  onExportPdf: () => void;
  onExportJpg: () => void;
}

const PAPER_SWATCHES = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Warm Ivory', hex: '#fdfaf3' },
  { name: 'Studio Matte Black', hex: '#141416' },
  { name: 'Pastel Cream', hex: '#f4efe4' },
];

export const FloatingPopups: React.FC<FloatingPopupsProps> = ({
  activePopup,
  onClose,
  photos,
  onTriggerUpload,
  onDuplicatePhoto,
  onRemovePhoto,
  onClearPhotos,
  onLoadDemoPhotos,
  paperId,
  orientation,
  orientedDims,
  onSelectPaper,
  onSelectOrientation,
  activeStyle,
  styleFilterMode,
  autoHideOnPick,
  onChangeStyleFilterMode,
  onToggleAutoHideOnPick,
  onSelectStyle,
  outerMarginIn,
  gutterIn,
  cornerRadiusPx,
  paperBgColor,
  showCropMarks,
  showFrameBorder,
  showSpecFooter,
  onChangeOuterMargin,
  onChangeGutter,
  onChangeCornerRadius,
  onChangePaperBgColor,
  onToggleCropMarks,
  onToggleFrameBorder,
  onToggleSpecFooter,
  dpi,
  isExporting,
  lastExportMessage,
  onChangeDpi,
  onExportPdf,
  onExportJpg,
}) => {
  // AI Assistant state (TTS, Search Grounding, and Live Voice API)
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsMode, setTtsMode] = useState<'single' | 'dual'>('single');
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(
    'Best archival paper weight GSM and framing margin for 12x18 inch 300 DPI studio prints'
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    text: string;
    sources: { uri: string; title: string }[];
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Live API WebSocket & AudioContext refs
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>('Ready for real-time voice');
  const [liveTranscripts, setLiveTranscripts] = useState<
    { role: 'user' | 'model'; text: string }[]
  >([]);
  const [liveTextPrompt, setLiveTextPrompt] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Clean up Live session if component unmounts
  useEffect(() => {
    return () => {
      stopLiveVoiceSession();
    };
  }, []);

  const buildSheetSummaryText = () => {
    const spec = PAPER_SIZES[paperId];
    return `Your PrintGrid Studio sheet is configured for ${spec.name} in ${orientation} orientation at ${dpi} DPI (${orientedDims.widthPx} by ${orientedDims.heightPx} pixels). You have ${photos.length} photos arranged in the ${activeStyle.name} template with ${outerMarginIn.toFixed(2)} inch safe outer margins and ${gutterIn.toFixed(2)} inch gutters.`;
  };

  const handlePlayTtsSpec = async () => {
    setTtsLoading(true);
    setTtsStatus(null);
    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: buildSheetSummaryText(),
          voiceMode: ttsMode,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to synthesize TTS audio.');
      }
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        await audio.play();
        setTtsStatus('Playing 24kHz WAV studio readout (gemini-3.8-flash-tts)');
      }
    } catch (err: any) {
      setTtsStatus(`TTS Note: ${err?.message || 'Unable to play audio.'}`);
    } finally {
      setTtsLoading(false);
    }
  };

  const handleSearchPrintGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await fetch('/api/ai/search-print-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          sheetContext: buildSheetSummaryText(),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Search grounding request failed.');
      }
      setSearchResult({
        text: data.text,
        sources: data.sources || [],
      });
    } catch (err: any) {
      setSearchError(err?.message || 'Could not complete search query.');
    } finally {
      setSearchLoading(false);
    }
  };

  const pcmFloat32ToBase64 = (float32Array: Float32Array): string => {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playPcm24kChunk = (base64Pcm: string) => {
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = outputAudioCtxRef.current;
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuffer.duration;
  };

  const startLiveVoiceSession = async () => {
    try {
      setLiveStatus('Connecting to gemini-3.8-live...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      wsRef.current = ws;

      ws.onopen = async () => {
        setLiveConnected(true);
        setLiveStatus('Live session active (16kHz Mic / 24kHz Audio)');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          const inputCtx = new AudioContext({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputCtx;
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(inputCtx.destination);
          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const base64 = pcmFloat32ToBase64(e.inputBuffer.getChannelData(0));
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };
        } catch {
          setLiveStatus('Connected (Mic unavailable — use prompt input below)');
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playPcm24kChunk(msg.audio);
          }
          if (msg.interrupted) {
            nextStartTimeRef.current = 0;
          }
          if (msg.inputTranscript) {
            setLiveTranscripts((prev) => [
              ...prev.slice(-6),
              { role: 'user', text: msg.inputTranscript },
            ]);
          }
          if (msg.outputTranscript) {
            setLiveTranscripts((prev) => [
              ...prev.slice(-6),
              { role: 'model', text: msg.outputTranscript },
            ]);
          }
          if (msg.toolCommand) {
            const cmd = msg.toolCommand;
            if (
              cmd.paperSize &&
              ['12x18', '13x19', 'a4', 'a3'].includes(cmd.paperSize)
            ) {
              onSelectPaper(cmd.paperSize as PaperSizeId);
            }
            if (
              cmd.orientation &&
              ['portrait', 'landscape'].includes(cmd.orientation)
            ) {
              onSelectOrientation(cmd.orientation as Orientation);
            }
            if (typeof cmd.outerMarginIn === 'number') {
              onChangeOuterMargin(cmd.outerMarginIn);
            }
            if (typeof cmd.gutterIn === 'number') {
              onChangeGutter(cmd.gutterIn);
            }
            if (typeof cmd.cropMarks === 'boolean') {
              onToggleCropMarks(cmd.cropMarks);
            }
          }
          if (msg.error) {
            setLiveStatus(`Live API: ${msg.error}`);
          }
        } catch {
          // ignore parse error
        }
      };

      ws.onclose = () => {
        setLiveConnected(false);
        setLiveStatus('Voice session disconnected.');
      };
    } catch (err: any) {
      setLiveStatus(`Connection failed: ${err?.message || 'Error'}`);
    }
  };

  const stopLiveVoiceSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    setLiveConnected(false);
    setLiveStatus('Ready for real-time voice');
  };

  const sendLiveTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTextPrompt.trim() || !wsRef.current) return;
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: liveTextPrompt }));
      setLiveTranscripts((prev) => [
        ...prev.slice(-6),
        { role: 'user', text: liveTextPrompt },
      ]);
      setLiveTextPrompt('');
    }
  };

  if (!activePopup) return null;

  const availableStyles = getAvailableStyles(photos.length, styleFilterMode);

  return (
    <aside
      aria-label={`${activePopup} configuration drawer`}
      data-testid={`floating-popup-${activePopup}`}
      onClick={(e) => e.stopPropagation()}
      className="fixed left-16 sm:left-[72px] top-14 z-30 w-[290px] sm:w-[320px] max-h-[80dvh] flex flex-col rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-150"
    >
      {/* Pop-up Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/90 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            {activePopup === 'photos' && `Selected Photos (${photos.length})`}
            {activePopup === 'paper' && 'Paper Size & Orientation'}
            {activePopup === 'styles' && 'Arrangement Styles'}
            {activePopup === 'margins' && 'Margins, Gutters & Cut Marks'}
            {activePopup === 'export' && 'High-Res PDF & JPG Export'}
            {activePopup === 'assistant' && 'Studio AI Assistant'}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {activePopup === 'photos' && 'Batch duplicate (×2) or manage images'}
            {activePopup === 'paper' && 'Exact 300 DPI physical studio sheets'}
            {activePopup === 'styles' && 'Count-aware layouts & wireframe previews'}
            {activePopup === 'margins' && 'Safe bleed, spacing & trim marks'}
            {activePopup === 'export' && 'Off-screen 1:1 physical print rendering'}
            {activePopup === 'assistant' && 'Live Voice, Search Grounding & TTS'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close floating pop-up"
          className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Pop-up Body */}
      <div className="flex-1 overflow-y-auto popup-scroll p-3.5 space-y-3.5">
        {/* 1. PHOTOS POP-UP */}
        {activePopup === 'photos' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={onTriggerUpload}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>+ Add More</span>
              </button>
              <button
                type="button"
                onClick={onLoadDemoPhotos}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Photos</span>
              </button>
              <button
                type="button"
                onClick={onClearPhotos}
                disabled={photos.length === 0}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-red-950/60 hover:text-red-300 disabled:opacity-40 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
                <p className="text-xs font-medium text-zinc-300 mb-1">
                  No photos selected
                </p>
                <p className="text-[11px] text-zinc-500">
                  Tap "+ Add More" for device gallery or "Demo Photos" to load 4 studio plates.
                </p>
              </div>
            ) : (
              <div
                data-testid="photos-thumbnail-grid"
                className="grid grid-cols-3 gap-2"
              >
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 text-[10px] font-mono-tabular font-semibold px-1.5 py-0.5 rounded bg-black/75 text-zinc-100">
                      #{index + 1}
                    </span>

                    {/* Bottom overlay with x2 Duplicate and Remove buttons */}
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/90 via-black/65 to-transparent flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicatePhoto(photo.id)}
                        aria-label={`Duplicate photo ${index + 1}`}
                        className="px-1.5 py-0.5 rounded bg-amber-500/95 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <CopyPlus className="w-2.5 h-2.5" />
                        <span>×2</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(photo.id)}
                        aria-label={`Remove photo ${index + 1}`}
                        className="p-1 rounded bg-zinc-900/90 hover:bg-red-600 text-zinc-200 hover:text-white text-[10px] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 2. PAPER SIZE & ORIENTATION POP-UP */}
        {activePopup === 'paper' && (
          <>
            {/* Portrait vs Landscape Segmented Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => onSelectOrientation('portrait')}
                className={`min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => onSelectOrientation('landscape')}
                className={`min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Landscape
              </button>
            </div>

            {/* 4 Exact Physical Paper Sizes */}
            <div className="space-y-2">
              {(Object.keys(PAPER_SIZES) as PaperSizeId[]).map((id) => {
                const spec = PAPER_SIZES[id];
                const isSelected = paperId === id;
                const wIn = orientation === 'landscape' ? spec.heightIn : spec.widthIn;
                const hIn = orientation === 'landscape' ? spec.widthIn : spec.heightIn;
                const wMm = orientation === 'landscape' ? spec.heightMm : spec.widthMm;
                const hMm = orientation === 'landscape' ? spec.widthMm : spec.heightMm;
                const wPx = orientation === 'landscape' ? spec.px300H : spec.px300W;
                const hPx = orientation === 'landscape' ? spec.px300W : spec.px300H;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectPaper(id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-zinc-100'
                        : 'bg-zinc-950/60 border-zinc-800/90 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-100">
                        {spec.name}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-amber-400">
                        {wIn}" × {hIn}"
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono-tabular">
                      {wMm} × {hMm} mm · {wPx} × {hPx} px @ 300 DPI
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {spec.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Specification Banner */}
            <div
              data-testid="paper-live-spec-banner"
              className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1"
            >
              <div className="text-[11px] font-semibold text-zinc-300">
                Active Output Sheet Specification
              </div>
              <div className="text-xs font-mono-tabular text-amber-400 font-semibold">
                {orientedDims.widthIn} × {orientedDims.heightIn} in (
                {orientedDims.widthMm.toFixed(1)} × {orientedDims.heightMm.toFixed(1)} mm)
              </div>
              <div className="text-[11px] font-mono-tabular text-zinc-400">
                Output Canvas: {orientedDims.widthPx} × {orientedDims.heightPx} px @ {dpi} DPI
              </div>
            </div>
          </>
        )}

        {/* 3. ARRANGEMENT STYLES POP-UP */}
        {activePopup === 'styles' && (
          <>
            {/* Filter Mode Toggle: Match Count vs All / Repeat */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => onChangeStyleFilterMode('match')}
                className={`min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  styleFilterMode === 'match'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Match Count ({Math.max(1, photos.length)})
              </button>
              <button
                type="button"
                onClick={() => onChangeStyleFilterMode('all')}
                className={`min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  styleFilterMode === 'all'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                All / Repeat
              </button>
            </div>

            {/* Auto-hide on pick checkbox */}
            <label className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-300 cursor-pointer">
              <span>Auto-hide on pick</span>
              <input
                type="checkbox"
                checked={autoHideOnPick}
                onChange={(e) => onToggleAutoHideOnPick(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            {/* Style Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {availableStyles.map((styleItem) => {
                const isSelected = activeStyle.id === styleItem.id;
                const approxDim = getStyleApproxSlotDimensionsLabel(
                  orientedDims.widthIn,
                  orientedDims.heightIn,
                  styleItem,
                  outerMarginIn,
                  gutterIn
                );

                return (
                  <button
                    key={styleItem.id}
                    type="button"
                    onClick={() => onSelectStyle(styleItem)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-zinc-100'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {/* Miniature SVG Wireframe Preview */}
                    <div className="w-full h-20 rounded-lg bg-zinc-900 border border-zinc-800 p-1.5 mb-2 flex items-center justify-center">
                      <svg
                        viewBox="0 0 100 130"
                        className="w-full h-full overflow-visible"
                      >
                        <rect
                          x="0"
                          y="0"
                          width="100"
                          height="130"
                          rx="4"
                          fill="#18181b"
                          stroke="#3f3f46"
                          strokeWidth="2"
                        />
                        {styleItem.cells.map((cell, cIdx) => {
                          const pad = 4;
                          const innerW = 100 - pad * 2;
                          const innerH = 130 - pad * 2;
                          const gap = 2;
                          const x = pad + cell.nx * innerW + gap / 2;
                          const y = pad + cell.ny * innerH + gap / 2;
                          const w = Math.max(4, cell.nw * innerW - gap);
                          const h = Math.max(4, cell.nh * innerH - gap);
                          return (
                            <rect
                              key={cIdx}
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              rx="2"
                              fill={isSelected ? '#f59e0b' : '#52525b'}
                              fillOpacity={isSelected ? 0.35 : 0.45}
                              stroke={isSelected ? '#fbbf24' : '#a1a1aa'}
                              strokeWidth="1.5"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div className="w-full flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-zinc-100 truncate">
                        {styleItem.shortName}
                      </span>
                      <span className="text-[10px] font-mono-tabular text-amber-400 shrink-0">
                        {styleItem.slotCount} {styleItem.slotCount === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono-tabular text-zinc-400 mt-0.5">
                      ~{approxDim} / slot
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* 4. MARGINS, GUTTERS & CUT LINES POP-UP */}
        {activePopup === 'margins' && (
          <>
            {/* Outer Safe Margin Slider (0.00 in to 1.00 in) */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="outer-margin-slider" className="font-medium text-zinc-200">
                  Outer Safe Margin
                </label>
                <span className="font-mono-tabular text-amber-400">
                  {outerMarginIn.toFixed(2)} in ({(outerMarginIn * 25.4).toFixed(1)} mm)
                </span>
              </div>
              <input
                id="outer-margin-slider"
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={outerMarginIn}
                onChange={(e) => onChangeOuterMargin(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            {/* Photo Gap / Gutter Slider (0.00 in to 0.60 in) */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="photo-gutter-slider" className="font-medium text-zinc-200">
                  Photo Gap / Gutter
                </label>
                <span className="font-mono-tabular text-amber-400">
                  {gutterIn.toFixed(2)} in ({(gutterIn * 25.4).toFixed(1)} mm)
                </span>
              </div>
              <input
                id="photo-gutter-slider"
                type="range"
                min={0.0}
                max={0.6}
                step={0.02}
                value={gutterIn}
                onChange={(e) => onChangeGutter(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            {/* Photo Corner Radius Slider (0 px to 40 px) */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="corner-radius-slider" className="font-medium text-zinc-200">
                  Photo Corner Radius
                </label>
                <span className="font-mono-tabular text-amber-400">
                  {cornerRadiusPx} px
                </span>
              </div>
              <input
                id="corner-radius-slider"
                type="range"
                min={0}
                max={40}
                step={2}
                value={cornerRadiusPx}
                onChange={(e) => onChangeCornerRadius(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            {/* Paper Background Color Swatches */}
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-200">Paper Background</span>
                <span className="font-mono-tabular text-zinc-400 uppercase">
                  {paperBgColor}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {PAPER_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => onChangePaperBgColor(swatch.hex)}
                    title={swatch.name}
                    aria-label={swatch.name}
                    style={{ backgroundColor: swatch.hex }}
                    className={`w-8 h-8 rounded-lg border transition-transform cursor-pointer ${
                      paperBgColor.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'ring-2 ring-amber-500 scale-105 border-white'
                        : 'border-zinc-700 hover:scale-105'
                    }`}
                  />
                ))}
                <label className="relative w-8 h-8 rounded-lg border border-zinc-700 overflow-hidden cursor-pointer flex items-center justify-center bg-zinc-800 text-[10px] font-mono-tabular text-zinc-200">
                  <span className="sr-only">Custom Paper Color</span>
                  <input
                    type="color"
                    aria-label="Custom Paper Color"
                    value={paperBgColor}
                    onChange={(e) => onChangePaperBgColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  HEX
                </label>
              </div>
            </div>

            {/* Print Toggles */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span>Scissor Cut / Crop Marks</span>
                <input
                  type="checkbox"
                  checked={showCropMarks}
                  onChange={(e) => onToggleCropMarks(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span>Thin Frame Border on Photos</span>
                <input
                  type="checkbox"
                  checked={showFrameBorder}
                  onChange={(e) => onToggleFrameBorder(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span>Sheet Spec Footer Label</span>
                <input
                  type="checkbox"
                  checked={showSpecFooter}
                  onChange={(e) => onToggleSpecFooter(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </>
        )}

        {/* 5. EXPORT POP-UP */}
        {activePopup === 'export' && (
          <>
            {/* Print Resolution Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">
                Print Resolution (DPI)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { val: 300, label: '300 DPI', sub: 'Studio Lab' },
                    { val: 150, label: '150 DPI', sub: 'Standard' },
                    { val: 96, label: '96 DPI', sub: 'Fast Share' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onChangeDpi(item.val)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      dpi === item.val
                        ? 'bg-amber-500/15 border-amber-500 text-zinc-100'
                        : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono-tabular">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-zinc-400">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Off-screen Full-Resolution Readout */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Physical Size:</span>
                <span className="font-mono-tabular text-zinc-100 font-semibold">
                  {orientedDims.widthIn}" × {orientedDims.heightIn}" (
                  {orientation.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Off-Screen Canvas:</span>
                <span className="font-mono-tabular text-amber-400 font-semibold">
                  {orientedDims.widthPx} × {orientedDims.heightPx} px
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Layout Style:</span>
                <span className="font-mono-tabular text-zinc-200">
                  {activeStyle.name}
                </span>
              </div>
            </div>

            {/* Export Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={onExportPdf}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>Download Print-Ready PDF (1:1 Inches)</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={onExportJpg}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 border border-zinc-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  Download High-Res JPG ({dpi} DPI)
                </span>
              </button>
            </div>

            {lastExportMessage && (
              <div
                data-testid="export-status-banner"
                className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-[11px] font-mono-tabular"
              >
                {lastExportMessage}
              </div>
            )}

            {/* Quick TTS Spec Readout inside Export */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">
                  Audio Pre-Flight Readout (TTS)
                </span>
                <button
                  type="button"
                  onClick={handlePlayTtsSpec}
                  disabled={ttsLoading}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  {ttsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-amber-400" />
                  )}
                  <span>Speak Sheet Specs</span>
                </button>
              </div>
              {ttsStatus && (
                <p className="text-[10px] text-zinc-400">{ttsStatus}</p>
              )}
            </div>
          </>
        )}

        {/* 6. STUDIO AI ASSISTANT POP-UP (Live API + Search Grounding + TTS) */}
        {activePopup === 'assistant' && (
          <div className="space-y-4">
            {/* Section A: Real-time Voice Conversation (gemini-3.8-live) */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100">
                    Live Voice Studio Assistant
                  </h3>
                  <p className="text-[10px] text-zinc-400">{liveStatus}</p>
                </div>
                <button
                  type="button"
                  onClick={
                    liveConnected ? stopLiveVoiceSession : startLiveVoiceSession
                  }
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    liveConnected
                      ? 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
                      : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  }`}
                >
                  {liveConnected ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>End Voice</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Start Live Voice</span>
                    </>
                  )}
                </button>
              </div>

              {liveConnected && (
                <form onSubmit={sendLiveTextMessage} className="flex gap-1.5">
                  <input
                    type="text"
                    value={liveTextPrompt}
                    onChange={(e) => setLiveTextPrompt(e.target.value)}
                    placeholder="Ask Live Assistant (e.g., switch to A3 landscape)..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              )}

              {liveTranscripts.length > 0 && (
                <div className="max-h-24 overflow-y-auto popup-scroll space-y-1 pt-1 border-t border-zinc-800/80 text-[11px]">
                  {liveTranscripts.map((t, i) => (
                    <div
                      key={i}
                      className={
                        t.role === 'user' ? 'text-zinc-400' : 'text-amber-300'
                      }
                    >
                      <span className="font-semibold uppercase text-[9px] mr-1">
                        {t.role}:
                      </span>
                      {t.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Text-to-Speech Spec Briefing (gemini-3.8-flash-tts) */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-100">
                  Audio Pre-Flight Spec Readout
                </h3>
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setTtsMode('single')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                      ttsMode === 'single'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400'
                    }`}
                  >
                    Solo Voice
                  </button>
                  <button
                    type="button"
                    onClick={() => setTtsMode('dual')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                      ttsMode === 'dual'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400'
                    }`}
                  >
                    2-Host Studio
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Synthesizes a 24kHz WAV voiceover of your active sheet dimensions, margins, and DPI using <span className="font-mono-tabular text-zinc-300">gemini-3.8-flash-tts</span>.
              </p>
              <button
                type="button"
                onClick={handlePlayTtsSpec}
                disabled={ttsLoading}
                className="w-full min-h-[38px] py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {ttsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Play Audio Print Briefing</span>
              </button>
              {ttsStatus && (
                <p className="text-[10px] text-amber-300/90">{ttsStatus}</p>
              )}
            </div>

            {/* Section C: Google Search Grounding Print & Paper Guide (gemini-3.8-flash) */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
              <h3 className="text-xs font-semibold text-zinc-100">
                Print Lab & Paper Guide (Google Search)
              </h3>
              <form onSubmit={handleSearchPrintGuide} className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    aria-label="Search print lab standards"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ask about paper GSM, ICC profiles, frame sizes..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    aria-label="Search Print Guide"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {searchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Ask</span>
                  </button>
                </div>
              </form>

              {searchError && (
                <p className="text-[11px] text-red-400">{searchError}</p>
              )}

              {searchResult && (
                <div className="space-y-2 pt-1 border-t border-zinc-800/80 text-xs text-zinc-300">
                  <p className="text-[11px] leading-relaxed whitespace-pre-line">
                    {searchResult.text}
                  </p>
                  {searchResult.sources.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-semibold text-zinc-400">
                        Verified Web Sources:
                      </span>
                      <div className="flex flex-col gap-1">
                        {searchResult.sources.slice(0, 4).map((src, idx) => (
                          <a
                            key={idx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
