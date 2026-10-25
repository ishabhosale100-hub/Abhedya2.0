import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { saveVaultRecord } from '../utils/vaultStorage';

export default function CastingScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [vaultSaved, setVaultSaved] = useState(false);

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

      const response = await fetch('/api/casting/analyze', {
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

  const getRiskStyles = (risk) => {
    switch (risk) {
      case 'critical':
        return {
          badge: 'text-rose-400 bg-rose-950/80 border-rose-800',
          banner: 'bg-rose-950/50 border-rose-800/80 text-rose-200',
        };
      case 'high':
        return {
          badge: 'text-orange-400 bg-orange-950/80 border-orange-800',
          banner: 'bg-orange-950/50 border-orange-800/80 text-orange-200',
        };
      case 'medium':
        return {
          badge: 'text-amber-400 bg-amber-950/80 border-amber-800',
          banner: 'bg-amber-950/50 border-amber-800/80 text-amber-200',
        };
      case 'unclear':
        return {
          badge: 'text-slate-400 bg-slate-900 border-slate-700',
          banner: 'bg-slate-900 border-slate-700 text-slate-300',
        };
      case 'low':
      default:
        return {
          badge: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
          banner: 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200',
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
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
            <ShieldAlert className="w-7 h-7 text-amber-400" />
            <span>{t('casting.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('casting.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
            Coercion & Secrecy Rule Engine
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Message Intake (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Message Screening
            </h2>

            {/* Message Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('casting.inputLabel')}
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('casting.inputPlaceholder')}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>

            {/* Additional Context */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('casting.contextLabel')}
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t('casting.contextPlaceholder')}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
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
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Screening message...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-slate-950" />
                    <span>{t('casting.analyzeButton')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                {t('casting.clearButton')}
              </button>
            </div>
          </div>

          {/* Future Scope Declaration: Audition Video & Camera Screening */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>{t('casting.futureScopeTitle')}</span>
              <span className="text-[10px] font-mono bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800 text-indigo-300">
                Future Architecture
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('casting.futureScopeNotice')}
            </p>
          </div>
        </div>

        {/* Right: Results Panel (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {analysisResult ? (
            <div className="glass-panel rounded-2xl p-6 border border-amber-800/60 space-y-6">
              
              {/* Header Risk Band */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    {t('casting.assessmentTitle')}
                  </span>
                  <span className="text-sm text-slate-300 font-medium">
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {t('casting.matchedPhrases')}
                </h3>
                {analysisResult.matched_phrases.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    No explicit red-flag coercion or extortion phrases detected.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.matched_phrases.map((phrase, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800/80 text-xs font-mono text-rose-300">
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contextual Analysis */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  {t('casting.explanation')}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  {analysisResult.explanation}
                </p>
              </div>

              {/* Suggested Actions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {t('casting.suggestedActions')}
                </h3>
                <div className="space-y-1.5">
                  {analysisResult.suggested_actions.map((actKey, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
                      ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{vaultSaved ? t('casting.savedSuccess') : t('casting.saveIncident')}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">
                Ready to Screen Opportunity
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Paste audition details, WhatsApp casting messages, or DMs to review for red flags, upfront fee scams, and private content requests.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
