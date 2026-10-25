import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquareWarning, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  FileCheck, 
  History, 
  Info,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { saveVaultRecord } from '../utils/vaultStorage';

export default function CommentsScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [commentText, setCommentText] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [saveFullText, setSaveFullText] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [vaultSaved, setVaultSaved] = useState(false);

  const handleAnalyze = async () => {
    if (!commentText.trim()) {
      setErrorMsg('Please enter or paste a comment to analyze.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg('');
      setAnalysisResult(null);
      setVaultSaved(false);

      const response = await fetch('/api/comments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          author_id: authorId.trim() || undefined,
          preserve_text_in_vault: saveFullText
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed.');
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Comment analysis error:', err);
      setErrorMsg(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setCommentText('');
    setAuthorId('');
    setAnalysisResult(null);
    setErrorMsg('');
    setVaultSaved(false);
  };

  const handleSaveToVault = async () => {
    if (!analysisResult) return;
    try {
      await saveVaultRecord({
        type: 'comments',
        title: `Comment Alert: ${analysisResult.category.toUpperCase()} (${analysisResult.risk_level.toUpperCase()})`,
        authorId: analysisResult.author_id,
        category: analysisResult.category,
        riskLevel: analysisResult.risk_level,
        matchedSignals: analysisResult.matched_signals,
        suggestedActions: analysisResult.suggested_actions,
        // Privacy rule: store raw comment ONLY if user explicitly checked the box
        commentText: saveFullText ? commentText : '[Redacted for Creator Privacy]',
        summary: `Evaluated ${analysisResult.category} (${analysisResult.risk_level} risk) with ${analysisResult.matched_signals.length} matched pattern(s).`,
      });
      setVaultSaved(true);
    } catch (err) {
      console.error('Vault save error:', err);
      setErrorMsg('Could not save incident to Evidence Vault.');
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'critical':
        return 'text-rose-400 bg-rose-950/80 border-rose-800';
      case 'high':
        return 'text-orange-400 bg-orange-950/80 border-orange-800';
      case 'medium':
        return 'text-amber-400 bg-amber-950/80 border-amber-800';
      case 'low':
      default:
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-800';
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
            <MessageSquareWarning className="w-7 h-7 text-emerald-400" />
            <span>{t('comments.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('comments.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            Multilingual Rules & Replaceable ML
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Input Panel (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Comment Intake
            </h2>

            {/* Comment Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('comments.inputLabel')}
              </label>
              <textarea
                rows={5}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('comments.inputPlaceholder')}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            {/* Demo Author ID Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('comments.demoIdLabel')}
              </label>
              <input
                type="text"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                placeholder={t('comments.demoIdPlaceholder')}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used strictly to evaluate repeated harassment patterns for this demo identifier.
              </p>
            </div>

            {/* Privacy Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveFullText}
                  onChange={(e) => setSaveFullText(e.target.checked)}
                  className="mt-0.5 accent-emerald-500 rounded"
                />
                <span className="leading-relaxed">
                  {t('comments.saveCommentTextCheckbox')}
                </span>
              </label>
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
                disabled={isAnalyzing || !commentText.trim()}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isAnalyzing || !commentText.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <MessageSquareWarning className="w-4 h-4 text-slate-950" />
                    <span>{t('comments.analyzeButton')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                {t('comments.clearButton')}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Analysis & Repeated Behavior Findings (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {analysisResult ? (
            <div className="glass-panel rounded-2xl p-6 border border-emerald-800/60 space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    {t('comments.categoryLabel')}
                  </span>
                  <span className="text-lg font-bold text-slate-100">
                    {t(`comments.categories.${analysisResult.category}`, analysisResult.category)}
                  </span>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${getRiskBadge(analysisResult.risk_level)}`}>
                  {t(`comments.risks.${analysisResult.risk_level}`, analysisResult.risk_level)}
                </div>
              </div>

              {/* Matched Signals */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {t('comments.matchedSignals')}
                </h3>
                {analysisResult.matched_signals.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    No high-risk abusive, threat, or doxxing patterns detected.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {analysisResult.matched_signals.map((sig, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 font-mono">
                        ⚠️ {sig}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Actions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {t('comments.suggestedActions')}
                </h3>
                <div className="space-y-1.5">
                  {analysisResult.suggested_actions.map((actKey, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{t(`comments.actions.${actKey}`, actKey)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repeated Behavior Tracker (Author ID History) */}
              {analysisResult.author_id !== 'anonymous' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('comments.repeatedBehaviorTitle')}</span>
                    </span>
                    <span className="font-mono text-cyan-400">
                      @{analysisResult.author_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">{t('comments.incidentCount')}</span>
                      <span className="text-base font-bold text-slate-200">{analysisResult.repeated_incidents_count}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">{t('comments.trendLabel')}</span>
                      <span className={`text-base font-bold ${analysisResult.severity_trend === 'Escalating' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {analysisResult.severity_trend}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Engine Status */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span>{analysisResult.engine}</span>
                </span>
                <span>{analysisResult.ml_model_status}</span>
              </div>

              {/* Save to Vault Action */}
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
                  <span>{vaultSaved ? t('comments.savedSuccess') : t('comments.saveVault')}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">
                Ready for Comment Screening
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Paste any comment or DM to run multilingual pattern checks for threats, sexual harassment, and doxxing.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
