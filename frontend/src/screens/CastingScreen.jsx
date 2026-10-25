import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  FileCheck, 
  Video, 
  Lock, 
  Info,
  HelpCircle,
  AlertCircle,
  Camera,
  Activity,
  XCircle,
  Eye
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { saveVaultRecord } from '../utils/vaultStorage';

export default function CastingScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Existing Message Screening States
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [vaultSaved, setVaultSaved] = useState(false);

  // Expression Scan & MediaPipe Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [detectedExpression, setDetectedExpression] = useState('calm'); // 'calm' or 'flagged'
  const [expressionLabel, setExpressionLabel] = useState('Calm / Neutral Expression');
  const [alertDismissed, setAlertDismissed] = useState(false);

  // MediaPipe & Detection States
  const [modelStatus, setModelStatus] = useState('idle'); // idle | loading | ready | fallback
  const [debugScores, setDebugScores] = useState({ open: 0, lip: 0, swings: 0 });

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const flagUntilRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const historyRef = useRef([]);

  // API Base URL helper for backend routing
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // ----------------------------------------------------
  // Existing Message Analysis Handlers
  // ----------------------------------------------------
  const handleAnalyze = async () => {
    if (!message.trim()) {
      setErrorMsg('Please enter or paste the casting or audition message.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg('');
      setAnalysisResult(null);
      setVaultSaved(false);

      const response = await fetch(`${API_BASE_URL}/api/casting/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: context.trim() || undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Casting message analysis failed.');
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Casting analysis error:', err);
      setErrorMsg(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setMessage('');
    setContext('');
    setAnalysisResult(null);
    setErrorMsg('');
    setVaultSaved(false);
  };

  const handleSaveToVault = async () => {
    if (!analysisResult) return;
    try {
      await saveVaultRecord({
        type: 'casting',
        title: `Casting Screening: ${analysisResult.risk_level.toUpperCase()}`,
        riskLevel: analysisResult.risk_level,
        matchedPhrases: analysisResult.matched_phrases,
        explanation: analysisResult.explanation,
        suggestedActions: analysisResult.suggested_actions,
        contextInfo: context.trim() || 'No additional context provided',
        summary: `Screened audition message (${analysisResult.risk_level} concern level) with ${analysisResult.matched_phrases.length} red flag trigger(s).`,
      });
      setVaultSaved(true);
    } catch (err) {
      console.error('Vault save error:', err);
      setErrorMsg('Could not save casting incident to Evidence Vault.');
    }
  };

  // ----------------------------------------------------
  // Camera & Expression Scan Handlers
  // ----------------------------------------------------
  const handleStartExpressionScan = async () => {
    setCameraError('');
    setAlertDismissed(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera permission denied or device unavailable. Please check browser permissions.');
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError('');
    historyRef.current = [];
  };

  // Attach camera stream to video element when active
  useEffect(() => {
    const video = videoRef.current;
    if (isCameraActive && cameraStream && video) {
      video.srcObject = cameraStream;
      video.play().catch(() => {});
    }
  }, [isCameraActive, cameraStream]);

  // Tunable detection settings for mouth/lip gestures
  const MOUTH_CFG = {
    windowMs: 2000,   // look at the last 2 seconds
    minSwings: 3,     // mouth open/close reversals needed in that window
    swingDelta: 0.04, // minimum jaw movement that counts as a swing
    lipTrigger: 0.25, // lip-roll / pucker level that must also appear
    holdMs: 3000,     // keep the red alert visible after a trigger
  };

  const countSwings = (vals, delta) => {
    if (vals.length < 3) return 0;
    let swings = 0, dir = 0, ext = vals[0];
    for (let i = 1; i < vals.length; i++) {
      const v = vals[i];
      if (dir === 0) {
        if (v - ext > delta) { dir = 1; ext = v; }
        else if (ext - v > delta) { dir = -1; ext = v; }
      } else if (dir === 1) {
        if (v > ext) ext = v;
        else if (ext - v > delta) { swings++; dir = -1; ext = v; }
      } else {
        if (v < ext) ext = v;
        else if (v - ext > delta) { swings++; dir = 1; ext = v; }
      }
    }
    return swings;
  };

  // MediaPipe Face Landmarker loop
  useEffect(() => {
    if (!isCameraActive) return;

    let cancelled = false;
    let rafId = null;
    let useFallback = false;
    let prevFrameData = null;
    let frameCount = 0;
    const history = []; // { t, open, lip }

    const raiseFlag = (now, label) => {
      if (flagUntilRef.current < now) setAlertDismissed(false);
      flagUntilRef.current = now + MOUTH_CFG.holdMs;
      setExpressionLabel(label);
    };

    const refreshState = (now) => {
      const active = now < flagUntilRef.current;
      setDetectedExpression(active && !alertDismissed ? 'flagged' : 'calm');
      if (!active) setExpressionLabel('Calm / Neutral Expression');
    };

    const loadLandmarker = async () => {
      if (faceLandmarkerRef.current) { setModelStatus('ready'); return; }
      setModelStatus('loading');
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        const lm = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        if (cancelled) { lm.close(); return; }
        faceLandmarkerRef.current = lm;
        setModelStatus('ready');
      } catch (e) {
        console.warn('Face model failed to load, using motion fallback:', e);
        useFallback = true;
        setModelStatus('fallback');
      }
    };

    const loop = () => {
      const video = videoRef.current;
      const now = performance.now();

      if (video && video.readyState >= 2) {
        const lm = faceLandmarkerRef.current;

        if (lm && !useFallback) {
          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            const res = lm.detectForVideo(video, now);
            const cats = res.faceBlendshapes?.[0]?.categories;

            if (!cats) {
              setExpressionLabel('No face detected. Face the camera');
            } else {
              const s = {};
              cats.forEach((c) => { s[c.categoryName] = c.score; });

              const open = s.jawOpen || 0;
              const lip = Math.max(
                s.mouthRollLower || 0,
                s.mouthRollUpper || 0,
                s.mouthPucker || 0,
                s.mouthFunnel || 0
              );

              history.push({ t: now, open, lip });
              while (history.length && now - history[0].t > MOUTH_CFG.windowMs) history.shift();

              const swings = countSwings(history.map((h) => h.open), MOUTH_CFG.swingDelta);
              const peakLip = Math.max(...history.map((h) => h.lip));

              if (swings >= MOUTH_CFG.minSwings && peakLip >= MOUTH_CFG.lipTrigger) {
                raiseFlag(now, 'Review Required: Lip / Mouth Gesture Detected');
              }

              frameCount++;
              if (frameCount % 6 === 0) {
                setDebugScores({
                  open: +open.toFixed(2),
                  lip: +peakLip.toFixed(2),
                  swings,
                });
              }
            }
            refreshState(now);
          }
        } else if (useFallback) {
          // Fallback: motion check around lower-middle frame
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const w = 160, h = 120;
            canvas.width = w; canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            let diffSum = 0, n = 0;
            for (let y = 60; y < 100; y += 2) {
              for (let x = 50; x < 110; x += 2) {
                const i = (y * w + x) * 4;
                if (prevFrameData) {
                  diffSum += Math.abs(data[i] - prevFrameData[i]) +
                             Math.abs(data[i + 1] - prevFrameData[i + 1]) +
                             Math.abs(data[i + 2] - prevFrameData[i + 2]);
                }
                n++;
              }
            }
            prevFrameData = data;
            const motion = n ? diffSum / n : 0;
            historyRef.current.push(motion);
            if (historyRef.current.length > 5) historyRef.current.shift();
            const avg = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;
            if (avg > 10) raiseFlag(now, 'Review Required: Mouth / Lip Gesture Detected');
            refreshState(now);
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    loadLandmarker().then(() => {
      if (!cancelled) rafId = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isCameraActive, alertDismissed]);

  // Release MediaPipe model when leaving component
  useEffect(() => {
    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  const getRiskStyles = (risk) => {
    switch (risk) {
      case 'critical':
        return { badge: 'text-rose-700 bg-rose-100 border-rose-300', banner: 'bg-rose-50 border-rose-300 text-rose-900' };
      case 'high':
        return { badge: 'text-orange-700 bg-orange-100 border-orange-300', banner: 'bg-orange-50 border-orange-300 text-orange-900' };
      case 'medium':
        return { badge: 'text-amber-700 bg-amber-100 border-amber-300', banner: 'bg-amber-50 border-amber-300 text-amber-900' };
      case 'unclear':
        return { badge: 'text-slate-700 bg-slate-100 border-slate-300', banner: 'bg-slate-50 border-slate-300 text-slate-800' };
      case 'low':
      default:
        return { badge: 'text-emerald-700 bg-emerald-100 border-emerald-300', banner: 'bg-emerald-50 border-emerald-300 text-emerald-900' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hidden processing canvas for fallback */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EEDFDF]">
        <div>
          <button
            onClick={() => {
              handleStopCamera();
              navigate('/dashboard');
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#D96E5F] bg-[#F4E6E6] hover:bg-[#EBD5D5] border border-[#E2CECE] rounded-lg transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('nav.back')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D2627] flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-[#D96E5F]" />
            <span>{t('casting.title')}</span>
          </h1>
          <p className="text-xs text-[#7D6E72] mt-1">
            {t('casting.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#F4E6E6] text-[#A3473D] border border-[#E2CECE]">
            Coercion & Secrecy Rule Engine
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Message Intake & Expression Camera Demo (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Message Intake Form */}
          <div className="glass-panel rounded-2xl p-6 border border-[#EEDFDF] space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#2D2627]">
              Message Screening
            </h2>

            {/* Message Input */}
            <div>
              <label className="block text-xs font-semibold text-[#2D2627] mb-1.5">
                {t('casting.inputLabel')}
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('casting.inputPlaceholder')}
                className="w-full bg-white border border-[#EEDFDF] rounded-xl p-3.5 text-sm text-[#2D2627] placeholder-[#A39598] focus:outline-none focus:border-[#D96E5F] focus:ring-1 focus:ring-[#D96E5F] transition-colors"
              />
            </div>

            {/* Additional Context */}
            <div>
              <label className="block text-xs font-semibold text-[#2D2627] mb-1.5">
                {t('casting.contextLabel')}
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t('casting.contextPlaceholder')}
                className="w-full bg-white border border-[#EEDFDF] rounded-xl px-3.5 py-2 text-xs text-[#2D2627] placeholder-[#A39598] focus:outline-none focus:border-[#D96E5F]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !message.trim()}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isAnalyzing || !message.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#D96E5F] hover:bg-[#C45B4B] text-white shadow-md'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Screening message...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-white" />
                    <span>{t('casting.analyzeButton')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="py-3 px-4 bg-white hover:bg-[#FAF6F6] text-[#7D6E72] hover:text-[#2D2627] rounded-xl text-xs font-medium border border-[#EEDFDF] transition-colors cursor-pointer"
              >
                {t('casting.clearButton')}
              </button>
            </div>
          </div>

          {/* Live Facial Expression Scan Workspace */}
          <div className="glass-panel rounded-2xl p-6 border border-[#EEDFDF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#2D2627] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#D96E5F]" />
                  <span>Live Facial Expression Safety Demo</span>
                </h2>
                <p className="text-xs text-[#7D6E72] mt-0.5">
                  On-device expression monitoring during virtual auditions. Processed entirely in browser memory.
                </p>
              </div>

              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={handleStartExpressionScan}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#D96E5F] hover:bg-[#C45B4B] text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Activity className="w-4 h-4" />
                  <span>Start Expression Scan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Stop Camera</span>
                </button>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {isCameraActive && (
              <div className="space-y-4 pt-2">
                
                {/* Status Banners */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>CAMERA ACTIVE</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    DEMO MODE — NO VIDEO CALL
                  </span>
                </div>

                {/* Video Container with Overlays */}
                <div
                  className={`relative rounded-2xl overflow-hidden aspect-video w-full max-w-xl mx-auto transition-all duration-200 ${
                    detectedExpression === 'flagged' && !alertDismissed
                      ? 'ring-4 ring-red-600 animate-pulse'
                      : 'ring-1 ring-[#EEDFDF]'
                  }`}
                  style={{ backgroundColor: '#000' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
                  />

                  {/* Expression label */}
                  <div
                    className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border z-10"
                    style={{
                      backgroundColor: detectedExpression === 'flagged' && !alertDismissed ? 'rgba(179,38,30,.92)' : 'rgba(0,0,0,.7)',
                      borderColor: 'rgba(255,255,255,.25)',
                    }}
                  >
                    <Eye className="w-4 h-4" style={{ color: '#fff' }} />
                    <span style={{ color: '#fff' }}>{expressionLabel}</span>
                  </div>

                  {modelStatus === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20" style={{ backgroundColor: 'rgba(0,0,0,.6)' }}>
                      <span style={{ color: '#fff' }} className="text-xs font-semibold">Loading face model...</span>
                    </div>
                  )}

                  {/* Tuning readout */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md text-[10px] font-mono z-10" style={{ backgroundColor: 'rgba(0,0,0,.6)' }}>
                    <span style={{ color: '#fff' }}>
                      open {debugScores.open} · lip {debugScores.lip} · swings {debugScores.swings}
                    </span>
                  </div>
                </div>

                {/* Expression Status Indicator Cards */}
                {detectedExpression === 'calm' && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wider">
                        Calm Expression Detected
                      </span>
                      <p className="mt-0.5 leading-relaxed text-emerald-800">
                        Visual analysis indicates a neutral or calm demeanor. Note: A calm expression does not guarantee audition safety or intent.
                      </p>
                    </div>
                  </div>
                )}

                {detectedExpression === 'flagged' && !alertDismissed && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block uppercase tracking-wider">
                          Review Required: Lip / Mouth Gesture Detected
                        </span>
                        <p className="mt-0.5 leading-relaxed text-rose-800">
                          Expression category flagged for experimental review (lip movement / gesture detected). Facial expressions alone cannot establish inappropriate behavior or intent.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlertDismissed(true)}
                      className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer shrink-0"
                      title="Dismiss Alert"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Control Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EEDFDF]">
                  <p className="text-[11px] text-[#7D6E72] italic">
                    Zero-retention local stream. No frames leave your device.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleStopCamera();
                      navigate('/dashboard');
                    }}
                    className="text-xs font-semibold text-[#D96E5F] hover:text-[#C45B4B] underline cursor-pointer"
                  >
                    Return to Casting Shield
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Future Scope Declaration */}
          <div className="p-5 rounded-2xl bg-white/60 border border-[#EEDFDF] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2D2627] uppercase tracking-wider">
              <Video className="w-4 h-4 text-[#D96E5F]" />
              <span>{t('casting.futureScopeTitle')}</span>
              <span className="text-[10px] font-mono bg-[#F4E6E6] px-2 py-0.5 rounded-full border border-[#E2CECE] text-[#A3473D]">
                Future Architecture
              </span>
            </div>
            <p className="text-xs text-[#7D6E72] leading-relaxed">
              {t('casting.futureScopeNotice')}
            </p>
          </div>
        </div>

        {/* Right Column: Message Results Panel (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {analysisResult ? (
            <div className="glass-panel rounded-2xl p-6 border border-[#EEDFDF] space-y-6">
              
              {/* Header Risk Band */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EEDFDF]">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#7D6E72] block">
                    {t('casting.assessmentTitle')}
                  </span>
                  <span className="text-sm text-[#2D2627] font-medium">
                    Evaluated against casting exploitation patterns
                  </span>
                </div>

                <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${getRiskStyles(analysisResult.risk_level).badge}`}>
                  {t(`casting.risks.${analysisResult.risk_level}`, analysisResult.risk_level)}
                </div>
              </div>

              {/* Warning Banner for High or Critical */}
              {(analysisResult.risk_level === 'high' || analysisResult.risk_level === 'critical') && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${getRiskStyles(analysisResult.risk_level).banner}`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block uppercase tracking-wider">
                      Elevated Risk Pattern Detected
                    </span>
                    <p className="leading-relaxed">
                      {analysisResult.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Detected Warning Phrases */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D2627] mb-2">
                  {t('casting.matchedPhrases')}
                </h3>
                {analysisResult.matched_phrases.length === 0 ? (
                  <p className="text-xs text-[#7D6E72] bg-[#FAF6F6] p-3 rounded-xl border border-[#EEDFDF]">
                    No explicit red-flag coercion or extortion phrases detected.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.matched_phrases.map((phrase, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-300 text-xs font-mono text-rose-800">
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contextual Analysis */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D2627] mb-1.5">
                  {t('casting.explanation')}
                </h3>
                <p className="text-xs text-[#2D2627] leading-relaxed bg-[#FAF6F6] p-3.5 rounded-xl border border-[#EEDFDF]">
                  {analysisResult.explanation}
                </p>
              </div>

              {/* Suggested Actions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D2627] mb-2">
                  {t('casting.suggestedActions')}
                </h3>
                <div className="space-y-1.5">
                  {analysisResult.suggested_actions.map((actKey, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#EEDFDF] text-xs text-[#2D2627] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D96E5F] shrink-0" />
                      <span>{t(`casting.actions.${actKey}`, actKey)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Incident Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveToVault}
                  disabled={vaultSaved}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    vaultSaved
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                      : 'bg-[#D96E5F] hover:bg-[#C45B4B] text-white shadow-md'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{vaultSaved ? t('casting.savedSuccess') : t('casting.saveIncident')}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-[#EEDFDF] text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-[#A39598] mx-auto" />
              <h3 className="text-sm font-semibold text-[#2D2627]">
                Ready to Screen Opportunity
              </h3>
              <p className="text-xs text-[#7D6E72] max-w-sm mx-auto leading-relaxed">
                Paste audition details, WhatsApp casting messages, or DMs to review for red flags, upfront fee scams, and private content requests.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}