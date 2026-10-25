import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  GitCompare, 
  UploadCloud, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Layers, 
  FileCheck,
  Eye,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { saveVaultRecord } from '../utils/vaultStorage';

export default function ComparisonScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Dual File State
  const [origFile, setOrigFile] = useState(null);
  const [origPreview, setOrigPreview] = useState(null);
  const [origMeta, setOrigMeta] = useState(null);

  const [suspFile, setSuspFile] = useState(null);
  const [suspPreview, setSuspPreview] = useState(null);
  const [suspMeta, setSuspMeta] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState(null);
  const [activeViewMode, setActiveViewMode] = useState('redOverlay'); // redOverlay, heatmap, diffMask, sideBySide
  const [vaultSaved, setVaultSaved] = useState(false);

  const origInputRef = useRef(null);
  const suspInputRef = useRef(null);

  const handleOrigSelect = (file) => {
    setErrorMsg('');
    setResults(null);
    setVaultSaved(false);
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Original: Unsupported format. Please select JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Original: File exceeds 10 MB limit.');
      return;
    }

    setOrigFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOrigMeta({ width: img.naturalWidth, height: img.naturalHeight, size: file.size });
        setOrigPreview(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSuspSelect = (file) => {
    setErrorMsg('');
    setResults(null);
    setVaultSaved(false);
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Suspected: Unsupported format. Please select JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Suspected: File exceeds 10 MB limit.');
      return;
    }

    setSuspFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setSuspMeta({ width: img.naturalWidth, height: img.naturalHeight, size: file.size });
        setSuspPreview(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async () => {
    if (!origFile || !suspFile) {
      setErrorMsg('Please select both Original and Suspected images to compare.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg('');
      setResults(null);
      setVaultSaved(false);

      // Multi-step progress tracking
      setCurrentStep(t('comparison.steps.validating'));
      await new Promise(r => setTimeout(r, 120));

      setCurrentStep(t('comparison.steps.hashing'));
      await new Promise(r => setTimeout(r, 120));

      setCurrentStep(t('comparison.steps.normalizing'));
      const formData = new FormData();
      formData.append('original', origFile);
      formData.append('suspected', suspFile);

      setCurrentStep(t('comparison.steps.pixelDiff'));
      const response = await fetch('/api/comparison/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Forensic comparison request failed.');
      }

      setCurrentStep(t('comparison.steps.visualizing'));
      const data = await response.json();

      setCurrentStep(t('comparison.steps.complete'));
      await new Promise(r => setTimeout(r, 150));

      setResults(data);
    } catch (err) {
      console.error('Comparison error:', err);
      setErrorMsg(err.message || 'Comparison failed.');
    } finally {
      setIsAnalyzing(false);
      setCurrentStep('');
    }
  };

  const handleSaveToVault = async () => {
    if (!results) return;
    try {
      await saveVaultRecord({
        type: 'comparison',
        title: `Forensic Comparison: ${origFile.name} vs ${suspFile.name}`,
        origFileName: origFile.name,
        suspFileName: suspFile.name,
        originalHash: results.original_hash,
        suspectedHash: results.suspected_hash,
        isIdentical: results.is_identical,
        pixelDiffPercent: results.pixel_diff_percent,
        ssimScore: results.ssim_score,
        detectedRegionsCount: results.detected_regions_count,
        interpretation: results.interpretation,
        summary: `${results.pixel_diff_percent}% measured pixel deviation (SSIM: ${results.ssim_score}). ${results.detected_regions_count} cluster(s) localized.`,
        previewDataUrl: results.overlay_base64 || results.heatmap_base64,
      });
      setVaultSaved(true);
    } catch (err) {
      console.error('Vault save error:', err);
      setErrorMsg('Could not save comparison to Evidence Vault.');
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
            <GitCompare className="w-7 h-7 text-indigo-400" />
            <span>{t('comparison.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('comparison.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
            OpenCV & scikit-image SSIM Engine
          </span>
        </div>
      </div>

      {/* Dual Upload Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Panel 1: Original Image */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('comparison.originalPanel')}</span>
            </h2>
            {origPreview && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => origInputRef.current?.click()}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrigFile(null);
                    setOrigPreview(null);
                    setOrigMeta(null);
                    setResults(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          <input
            ref={origInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => handleOrigSelect(e.target.files?.[0])}
            className="hidden"
          />

          {!origPreview ? (
            <div
              onClick={() => origInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleOrigSelect(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-8 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
            >
              <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-200">
                Select Reference / Original Photo
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('comparison.uploadHelp')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-64 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center relative">
                <img src={origPreview} alt="Original" className="h-full w-full object-contain" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-md text-[10px] font-mono text-cyan-300">
                  {origMeta?.width} × {origMeta?.height} px
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate">
                {origFile?.name}
              </p>
            </div>
          )}
        </div>

        {/* Panel 2: Suspected Image */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('comparison.suspectedPanel')}</span>
            </h2>
            {suspPreview && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => suspInputRef.current?.click()}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuspFile(null);
                    setSuspPreview(null);
                    setSuspMeta(null);
                    setResults(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          <input
            ref={suspInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => handleSuspSelect(e.target.files?.[0])}
            className="hidden"
          />

          {!suspPreview ? (
            <div
              onClick={() => suspInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleSuspSelect(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-slate-700 hover:border-rose-500 rounded-xl p-8 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
            >
              <UploadCloud className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-200">
                Select Suspected / Altered Photo
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('comparison.uploadHelp')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-64 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center relative">
                <img src={suspPreview} alt="Suspected" className="h-full w-full object-contain" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-md text-[10px] font-mono text-rose-300">
                  {suspMeta?.width} × {suspMeta?.height} px
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate">
                {suspFile?.name}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Run Analysis Action Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={!origFile || !suspFile || isAnalyzing}
          className={`py-3.5 px-8 rounded-xl text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-2.5 cursor-pointer ${
            !origFile || !suspFile || isAnalyzing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400 hover:from-indigo-400 hover:to-teal-300 text-slate-950 shadow-xl shadow-cyan-500/20'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>{currentStep || t('comparison.processing')}</span>
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4 text-slate-950" />
              <span>{t('comparison.runButton')}</span>
            </>
          )}
        </button>
      </div>

      {/* Results Workspace */}
      {results && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-indigo-800/60 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <span>{t('comparison.resultsTitle')}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {results.interpretation}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveToVault}
              disabled={vaultSaved}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                vaultSaved
                  ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{vaultSaved ? 'Saved to Vault' : t('comparison.saveVault')}</span>
            </button>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Pixel Difference */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block mb-1">
                {t('comparison.metricPixelDiff')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold font-mono ${results.pixel_diff_percent > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {results.pixel_diff_percent}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Normalized pixel deviation
              </span>
            </div>

            {/* SSIM */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block mb-1">
                {t('comparison.metricSSIM')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold font-mono ${results.ssim_score > 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {results.ssim_score}
                </span>
                <span className="text-[10px] text-slate-500">/ 1.0</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Structural correlation
              </span>
            </div>

            {/* Difference Clusters */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block mb-1">
                {t('comparison.metricRegions')}
              </span>
              <span className="text-2xl font-bold font-mono text-cyan-400 block">
                {results.detected_regions_count}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Localized contour clusters
              </span>
            </div>

            {/* File Match Status */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block mb-1">
                Cryptographic Identity
              </span>
              <span className={`text-sm font-bold block mt-1 ${results.is_identical ? 'text-emerald-400' : 'text-slate-300'}`}>
                {results.is_identical ? 'Exact Identical File' : 'Distinct File Hashes'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                SHA-256 Digest Match
              </span>
            </div>
          </div>

          {/* View Mode Toggle Controls */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Forensic Visualizations</span>
              </h3>

              <div className="inline-flex rounded-xl bg-slate-900/90 border border-slate-800 p-1 gap-1 text-xs">
                {[
                  { id: 'redOverlay', label: t('comparison.viewModes.redOverlay') },
                  { id: 'heatmap', label: t('comparison.viewModes.heatmap') },
                  { id: 'diffMask', label: t('comparison.viewModes.diffMask') },
                  { id: 'sideBySide', label: t('comparison.viewModes.sideBySide') },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setActiveViewMode(mode.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      activeViewMode === mode.id
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Visualization Display */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 min-h-[380px] flex items-center justify-center">
              {activeViewMode === 'redOverlay' && (
                <div className="text-center space-y-2 w-full">
                  <img
                    src={results.overlay_base64}
                    alt="Red Difference Overlay"
                    className="max-h-[440px] max-w-full mx-auto rounded-lg object-contain"
                  />
                  <p className="text-[11px] text-rose-300 font-mono">
                    Red tint and bounding boxes show coordinates where pixels differ from the reference image.
                  </p>
                </div>
              )}

              {activeViewMode === 'heatmap' && (
                <div className="text-center space-y-2 w-full">
                  <img
                    src={results.heatmap_base64}
                    alt="Thermal Heatmap"
                    className="max-h-[440px] max-w-full mx-auto rounded-lg object-contain"
                  />
                  <p className="text-[11px] text-cyan-300 font-mono">
                    Colormap spectrum: Blue = Zero difference | Yellow/Red = High absolute deviation
                  </p>
                </div>
              )}

              {activeViewMode === 'diffMask' && (
                <div className="text-center space-y-2 w-full">
                  <img
                    src={results.mask_base64}
                    alt="Threshold Difference Mask"
                    className="max-h-[440px] max-w-full mx-auto rounded-lg object-contain"
                  />
                  <p className="text-[11px] text-slate-400 font-mono">
                    Binary difference mask (white pixels highlight points exceeding significance threshold).
                  </p>
                </div>
              )}

              {activeViewMode === 'sideBySide' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold block text-center">Reference</span>
                    <img src={origPreview} alt="Reference" className="max-h-80 mx-auto rounded-lg object-contain" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-rose-400 font-semibold block text-center">Suspected Alteration</span>
                    <img src={suspPreview} alt="Suspected" className="max-h-80 mx-auto rounded-lg object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic Hashes Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Original Reference SHA-256:</span>
              <code className="text-cyan-400 break-all select-all block bg-slate-950 p-1.5 rounded">
                {results.original_hash}
              </code>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Suspected Image SHA-256:</span>
              <code className="text-rose-400 break-all select-all block bg-slate-950 p-1.5 rounded">
                {results.suspected_hash}
              </code>
            </div>
          </div>

          {/* Honest Forensic Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-cyan-300">Forensic Interpretation Notice:</span> {t('comparison.interpretation.honestDisclaimer')}
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
