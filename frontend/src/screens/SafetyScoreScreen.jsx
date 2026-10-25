import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  Clock, 
  GitCompare, 
  MessageSquareWarning, 
  ExternalLink 
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { getVaultRecords } from '../utils/vaultStorage';
import { calculateCreatorSafetyScore, SCORE_WEIGHTS } from '../utils/safetyScoreCalculator';

export default function SafetyScoreScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [metrics, setMetrics] = useState({
    score: 0,
    band: 'low',
    bandKey: 'safetyScore.band.low',
    breakdown: {
      commentsHarassment: 0,
      threatsPii: 0,
      imageAlteration: 0,
      recentDecay: 0,
    },
    contributingFactors: [],
    recordsCount: 0,
    hasData: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const records = await getVaultRecords();
        const res = calculateCreatorSafetyScore(records);
        setMetrics(res);
      } catch (err) {
        console.warn('Could not compute score metrics:', err);
      }
    }
    load();
  }, []);

  const getBandStyles = (band) => {
    switch (band) {
      case 'severe':
        return {
          color: 'text-rose-400',
          bg: 'bg-rose-950/60 border-rose-800/80',
          gauge: 'bg-rose-500',
        };
      case 'high':
        return {
          color: 'text-orange-400',
          bg: 'bg-orange-950/60 border-orange-800/80',
          gauge: 'bg-orange-500',
        };
      case 'moderate':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-950/60 border-amber-800/80',
          gauge: 'bg-amber-500',
        };
      case 'low':
      default:
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/60 border-emerald-800/80',
          gauge: 'bg-emerald-500',
        };
    }
  };

  const bandStyles = getBandStyles(metrics.band);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/50 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('nav.back')}</span>
        </button>
        <span className="text-xs font-mono text-slate-500">
          Module: Safety Indicator Engine
        </span>
      </div>

      {/* Main Score Overview Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                {t('safetyScore.title')}
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {t('safetyScore.weightsNotice')}
            </p>
          </div>

          {/* Big Score Gauge Display */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-slate-400 block font-mono">
                {t('safetyScore.scoreLabel')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-100">
                  {metrics.score}
                </span>
                <span className="text-sm font-mono text-slate-500">/100</span>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl border ${bandStyles.bg} text-center`}>
              <span className={`text-xs font-bold block ${bandStyles.color}`}>
                {t(metrics.bandKey)}
              </span>
              <span className="text-[10px] text-slate-400">
                {metrics.recordsCount} evidence records
              </span>
            </div>
          </div>
        </div>

        {/* Mandatory Disclaimer Box */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-cyan-300">Mandatory Safety Disclaimer:</span> {t('safetyScore.disclaimer')}
          </p>
        </div>
      </div>

      {/* Factor Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Breakdown Chart / Weighted Bars */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Score Factor Contribution</span>
          </h2>

          <div className="space-y-4 text-xs">
            {/* Factor 1: Comments */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <MessageSquareWarning className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('safetyScore.factors.comments')}</span>
                </span>
                <span className="font-mono text-slate-400">
                  {metrics.breakdown.commentsHarassment} / {SCORE_WEIGHTS.COMMENTS_HARASSMENT_MAX} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(metrics.breakdown.commentsHarassment / SCORE_WEIGHTS.COMMENTS_HARASSMENT_MAX) * 100}%` }}
                />
              </div>
            </div>

            {/* Factor 2: Threats & PII */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('safetyScore.factors.threats')}</span>
                </span>
                <span className="font-mono text-slate-400">
                  {metrics.breakdown.threatsPii} / {SCORE_WEIGHTS.THREATS_PII_MAX} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 transition-all duration-500" 
                  style={{ width: `${(metrics.breakdown.threatsPii / SCORE_WEIGHTS.THREATS_PII_MAX) * 100}%` }}
                />
              </div>
            </div>

            {/* Factor 3: Image Comparison Alteration */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('safetyScore.factors.comparison')}</span>
                </span>
                <span className="font-mono text-slate-400">
                  {metrics.breakdown.imageAlteration} / {SCORE_WEIGHTS.IMAGE_ALTERATION_MAX} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${(metrics.breakdown.imageAlteration / SCORE_WEIGHTS.IMAGE_ALTERATION_MAX) * 100}%` }}
                />
              </div>
            </div>

            {/* Factor 4: Temporal Recency */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('safetyScore.factors.recency')}</span>
                </span>
                <span className="font-mono text-slate-400">
                  {metrics.breakdown.recentDecay} / {SCORE_WEIGHTS.RECENT_DECAY_MAX} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${(metrics.breakdown.recentDecay / SCORE_WEIGHTS.RECENT_DECAY_MAX) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contributing Factors & Vault Link */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center justify-between">
              <span>Top Contributing Signals</span>
              <button
                onClick={() => navigate('/vault')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{t('safetyScore.viewInVault')}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </h2>

            {metrics.contributingFactors.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('safetyScore.noData')}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {metrics.contributingFactors.map((factor, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {t(factor.key)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {factor.detail}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-800/50">
                      +{factor.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500">
            Internal calculation timestamp: {new Date().toLocaleTimeString()}
          </div>
        </div>

      </div>

    </div>
  );
}
