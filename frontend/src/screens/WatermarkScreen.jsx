import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  UploadCloud, 
  Trash2, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Stamp, 
  Eye, 
  ShieldCheck, 
  FileCheck, 
  Copy, 
  Layers, 
  Sliders,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { calculateSha256, embedInvisibleWatermark, extractInvisibleWatermark } from '../utils/cryptoUtils';
import { saveVaultRecord } from '../utils/vaultStorage';

export default function WatermarkScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // File state
  const [file, setFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Watermark options
  const [mode, setMode] = useState('both'); // 'visible' | 'invisible' | 'both'
  const [wmText, setWmText] = useState('© ABHEDYA PROTECTED 2026');
  const [wmColor, setWmColor] = useState('#ffffff');
  const [wmOpacity, setWmOpacity] = useState(0.65);
  const [wmFontSize, setWmFontSize] = useState(36);
  const [wmRotation, setWmRotation] = useState(-25);
  const [positionPreset, setPositionPreset] = useState('center'); // center, topLeft, topRight, bottomLeft, bottomRight, tiled
  const [protectionRegion, setProtectionRegion] = useState('none'); // none, face, chest, lowerBody, custom
  const [invisiblePayload, setInvisiblePayload] = useState('CREATOR-AUTH-TOKEN-9942');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [processedResult, setProcessedResult] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [vaultSaved, setVaultSaved] = useState(false);

  const fileInputRef = useRef(null);

  // File validation
  const handleFileSelect = (selectedFile) => {
    setErrorMsg('');
    setProcessedResult(null);
    setExtractedData(null);
    setVaultSaved(false);

    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMsg('Unsupported format. Please upload JPG, PNG, or WebP.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10 MB limit.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageMeta({ width: img.naturalWidth, height: img.naturalHeight, size: selectedFile.size });
        setImageSrc(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setFile(null);
    setImageSrc(null);
    setImageMeta(null);
    setProcessedResult(null);
    setExtractedData(null);
    setVaultSaved(false);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Processing workflow
  const handleApplyWatermark = async () => {
    if (!imageSrc || !file) return;

    try {
      setIsProcessing(true);
      setErrorMsg('');

      // Step 1: Validating
      setCurrentStep(t('watermark.steps.validating'));
      await new Promise(r => setTimeout(r, 150));

      // Step 2: Preparing image & Canvas
      setCurrentStep(t('watermark.steps.preparing'));
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      // Step 3: Applying watermark
      setCurrentStep(t('watermark.steps.applying'));

      // 3A. Apply Invisible Watermark (if mode is 'invisible' or 'both')
      if (mode === 'invisible' || mode === 'both') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const embeddedImgData = embedInvisibleWatermark(imgData, invisiblePayload.trim() || 'ABHEDYA');
        ctx.putImageData(embeddedImgData, 0, 0);
      }

      // 3B. Apply Visible Watermark (if mode is 'visible' or 'both')
      if (mode === 'visible' || mode === 'both') {
        ctx.save();
        ctx.globalAlpha = parseFloat(wmOpacity);
        ctx.fillStyle = wmColor;
        ctx.font = `600 ${wmFontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (positionPreset === 'tiled') {
          const stepX = 280;
          const stepY = 160;
          const rad = (wmRotation * Math.PI) / 180;
          for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
            for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(rad);
              ctx.fillText(wmText, 0, 0);
              ctx.restore();
            }
          }
        } else {
          // Calculate placement based on presets and region guides
          let posX = canvas.width / 2;
          let posY = canvas.height / 2;

          // Manual protection region presets (placement guide offsets)
          if (protectionRegion === 'face') {
            posX = canvas.width * 0.5;
            posY = canvas.height * 0.22;
          } else if (protectionRegion === 'chest') {
            posX = canvas.width * 0.5;
            posY = canvas.height * 0.45;
          } else if (protectionRegion === 'lowerBody') {
            posX = canvas.width * 0.5;
            posY = canvas.height * 0.75;
          } else {
            // Standard corner / center presets
            const margin = Math.max(40, canvas.width * 0.05);
            if (positionPreset === 'topLeft') {
              posX = margin + 100;
              posY = margin + 30;
            } else if (positionPreset === 'topRight') {
              posX = canvas.width - margin - 100;
              posY = margin + 30;
            } else if (positionPreset === 'bottomLeft') {
              posX = margin + 100;
              posY = canvas.height - margin;
            } else if (positionPreset === 'bottomRight') {
              posX = canvas.width - margin - 100;
              posY = canvas.height - margin;
            }
          }

          ctx.translate(posX, posY);
          ctx.rotate((wmRotation * Math.PI) / 180);
          ctx.fillText(wmText, 0, 0);
        }
        ctx.restore();
      }

      // Step 4: Generating protected preview
      setCurrentStep(t('watermark.steps.preview'));
      const protectedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const protectedDataUrl = canvas.toDataURL('image/png');

      // Step 5: Calculating SHA-256 fingerprints
      setCurrentStep(t('watermark.steps.fingerprinting'));
      const originalHash = await calculateSha256(file);
      const protectedHash = await calculateSha256(protectedBlob);

      // Step 6: Complete
      setCurrentStep(t('watermark.steps.ready'));
      await new Promise(r => setTimeout(r, 100));

      setProcessedResult({
        originalHash,
        protectedHash,
        protectedDataUrl,
        protectedBlob,
        mode,
        settings: {
          text: wmText,
          color: wmColor,
          opacity: wmOpacity,
          fontSize: wmFontSize,
          rotation: wmRotation,
          position: positionPreset,
          region: protectionRegion,
          invisiblePayload: (mode === 'invisible' || mode === 'both') ? invisiblePayload : null
        }
      });
    } catch (err) {
      console.error('Watermark error:', err);
      setErrorMsg(err.message || 'Failed to apply watermark.');
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  // Download Protected Image
  const handleDownload = () => {
    if (!processedResult) return;
    const a = document.createElement('a');
    a.href = processedResult.protectedDataUrl;
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
    a.download = `${baseName}_protected_abhedya.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Extract invisible watermark from the current processed canvas
  const handleExtractInvisible = async () => {
    if (!processedResult?.protectedDataUrl) return;
    try {
      const img = new Image();
      img.src = processedResult.protectedDataUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const res = extractInvisibleWatermark(imgData);
      setExtractedData(res);
    } catch (err) {
      setExtractedData({ found: false, error: err.message });
    }
  };

  // Save to Evidence Vault
  const handleSaveToVault = async () => {
    if (!processedResult) return;
    try {
      await saveVaultRecord({
        type: 'watermark',
        title: `Watermark Protection: ${file.name}`,
        fileName: file.name,
        originalHash: processedResult.originalHash,
        protectedHash: processedResult.protectedHash,
        watermarkMode: processedResult.mode,
        watermarkSettings: processedResult.settings,
        summary: `Embedded ${processedResult.mode} watermark into ${file.name} (SHA-256: ${processedResult.protectedHash.substring(0, 16)}...)`,
        // Store thumbnail preview
        previewDataUrl: processedResult.protectedDataUrl,
      });
      setVaultSaved(true);
    } catch (err) {
      console.error('Vault save error:', err);
      setErrorMsg('Could not save to Evidence Vault.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/50 rounded-lg transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('nav.back')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <Stamp className="w-7 h-7 text-cyan-400" />
            <span>{t('watermark.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('watermark.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
            Web Crypto SHA-256 & Spatial LSB
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image Upload & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Source Image</span>
              {imageSrc && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('watermark.replaceImage')}</span>
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('watermark.removeImage')}</span>
                  </button>
                </div>
              )}
            </h2>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              className="hidden"
            />

            {!imageSrc ? (
              /* Dropzone */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/60 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7 text-cyan-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {t('watermark.uploadPrompt')}
                </p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {t('watermark.uploadHelp')}
                </p>
              </div>
            ) : (
              /* Image Preview */
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-96">
                  <img
                    src={imageSrc}
                    alt="Original Upload"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-slate-800">
                    {imageMeta?.width} × {imageMeta?.height} px ({(imageMeta?.size / 1024).toFixed(1)} KB)
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  File: {file?.name}
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Protection Region Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t('watermark.regionDisclaimer')}
            </p>
          </div>
        </div>

        {/* Right Column: Watermark Controls & Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Controls Panel */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Watermark Configuration</span>
              </h2>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {t('watermark.mode')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'visible', label: t('watermark.modes.visible') },
                  { id: 'invisible', label: t('watermark.modes.invisible') },
                  { id: 'both', label: t('watermark.modes.both') },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      mode === m.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visible Watermark Settings */}
            {(mode === 'visible' || mode === 'both') && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  {t('watermark.visibleSettings')}
                </h3>

                {/* Text */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    {t('watermark.textLabel')}
                  </label>
                  <input
                    type="text"
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Grid for Sliders & Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Opacity */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{t('watermark.opacity')}</span>
                      <span className="font-mono text-cyan-400">{Math.round(wmOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={wmOpacity}
                      onChange={(e) => setWmOpacity(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{t('watermark.fontSize')}</span>
                      <span className="font-mono text-cyan-400">{wmFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="80"
                      step="2"
                      value={wmFontSize}
                      onChange={(e) => setWmFontSize(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{t('watermark.rotation')}</span>
                      <span className="font-mono text-cyan-400">{wmRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      value={wmRotation}
                      onChange={(e) => setWmRotation(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      {t('watermark.textColor')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={wmColor}
                        onChange={(e) => setWmColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={wmColor}
                        onChange={(e) => setWmColor(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Placement Presets */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t('watermark.positionPreset')}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
                    {[
                      { id: 'center', label: t('watermark.positions.center') },
                      { id: 'topLeft', label: t('watermark.positions.topLeft') },
                      { id: 'topRight', label: t('watermark.positions.topRight') },
                      { id: 'bottomLeft', label: t('watermark.positions.bottomLeft') },
                      { id: 'bottomRight', label: t('watermark.positions.bottomRight') },
                      { id: 'tiled', label: t('watermark.positions.tiled') },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPositionPreset(p.id);
                          setProtectionRegion('none');
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                          positionPreset === p.id && protectionRegion === 'none'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Protection Region Presets */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t('watermark.protectionRegion')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'face', label: t('watermark.regions.face') },
                      { id: 'chest', label: t('watermark.regions.chest') },
                      { id: 'lowerBody', label: t('watermark.regions.lowerBody') },
                      { id: 'custom', label: t('watermark.regions.custom') },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setProtectionRegion(r.id);
                          setPositionPreset('center');
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                          protectionRegion === r.id
                            ? 'bg-indigo-500/25 border-indigo-500 text-indigo-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Invisible Watermark Settings */}
            {(mode === 'invisible' || mode === 'both') && (
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  {t('watermark.invisibleSettings')}
                </h3>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    {t('watermark.payloadLabel')}
                  </label>
                  <input
                    type="text"
                    value={invisiblePayload}
                    onChange={(e) => setInvisiblePayload(e.target.value)}
                    placeholder="e.g. CREATOR-OWNER-KEY-1092"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t('watermark.payloadHelp')}
                  </p>
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyWatermark}
                disabled={!imageSrc || isProcessing}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !imageSrc || isProcessing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{currentStep || t('watermark.processing')}</span>
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4 text-slate-950" />
                    <span>{t('watermark.applyButton')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Workspace Panel (shown after processing) */}
          {processedResult && (
            <div className="glass-panel rounded-2xl p-6 border border-cyan-800/60 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Protected Output & Verification Proof</span>
                </h2>
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                  Ready for Download
                </span>
              </div>

              {/* Side by Side Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400">
                    {t('watermark.originalPreview')}
                  </span>
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-48 flex items-center justify-center">
                    <img src={imageSrc} alt="Original" className="h-full w-full object-contain" />
                  </div>
                </div>

                {/* Protected */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-cyan-300">
                    {t('watermark.protectedPreview')}
                  </span>
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-cyan-800/60 h-48 flex items-center justify-center">
                    <img src={processedResult.protectedDataUrl} alt="Protected" className="h-full w-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Cryptographic SHA-256 Digests */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">
                    {t('watermark.originalHash')} (Source Digest)
                  </span>
                  <code className="text-[11px] font-mono text-slate-300 break-all select-all block bg-slate-950 p-1.5 rounded-md border border-slate-800/80">
                    {processedResult.originalHash}
                  </code>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-cyan-400 block">
                    {t('watermark.protectedHash')} (Protected Digest)
                  </span>
                  <code className="text-[11px] font-mono text-cyan-300 break-all select-all block bg-slate-950 p-1.5 rounded-md border border-cyan-900/60">
                    {processedResult.protectedHash}
                  </code>
                </div>
              </div>

              {/* Extraction / Verification tool for Invisible Payload */}
              {(processedResult.mode === 'invisible' || processedResult.mode === 'both') && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">
                      Reversible LSB Payload Verification
                    </span>
                    <button
                      type="button"
                      onClick={handleExtractInvisible}
                      className="px-3 py-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 text-xs font-medium rounded-lg border border-indigo-700 transition-colors cursor-pointer"
                    >
                      {t('watermark.extractButton')}
                    </button>
                  </div>

                  {extractedData && (
                    <div className="text-xs">
                      {extractedData.found ? (
                        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Verified Payload: <strong className="font-mono">{extractedData.payload}</strong></span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>No invisible payload extracted.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions: Download & Save to Evidence Vault */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>{t('watermark.downloadButton')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToVault}
                  disabled={vaultSaved}
                  className={`py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    vaultSaved
                      ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{vaultSaved ? t('watermark.savedSuccess') : t('watermark.saveVaultButton')}</span>
                </button>
              </div>

              {/* Limitation Notice */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-500 leading-relaxed">
                ⚠️ <span className="font-semibold text-slate-400">Notice:</span> {t('watermark.limitationNotice')}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
