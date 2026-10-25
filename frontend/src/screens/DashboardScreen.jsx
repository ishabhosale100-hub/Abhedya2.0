import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Stamp, 
  GitCompare, 
  MessageSquareWarning, 
  ShieldAlert, 
  Archive, 
  ChevronRight, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';
import { getVaultRecords } from '../utils/vaultStorage';
import { calculateCreatorSafetyScore } from '../utils/safetyScoreCalculator';

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const [safetyMetrics, setSafetyMetrics] = useState({
    score: 0,
    band: 'low',
    bandKey: 'safetyScore.band.low',
    recordsCount: 0,
    hasData: false,
    breakdown: {}
  });

  useEffect(() => {
    async function loadVault() {
      try {
        const records = await getVaultRecords();
        const scoreData = calculateCreatorSafetyScore(records);
        setSafetyMetrics(scoreData);
      } catch (err) {
        console.warn('Could not read vault storage:', err);
      }
    }
    loadVault();
  }, []);

  // EXACT FIVE primary feature cards in this exact order:
  // 1. Photo Watermarking
  // 2. Photo Comparison
  // 3. Comment Safety
  // 4. Casting Shield
  // 5. Evidence Vault
  const featureCards = [
    {
      id: 'watermark',
      title: t('dashboard.cards.watermark.title'),
      description: t('dashboard.cards.watermark.description'),
      icon: Stamp,
      route: '/watermark',
      accent: 'cyan',
      borderColor: 'hover:border-cyan-500/50',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
      glow: 'group-hover:shadow-cyan-500/15',
    },
    {
      id: 'comparison',
      title: t('dashboard.cards.comparison.title'),
      description: t('dashboard.cards.comparison.description'),
      icon: GitCompare,
      route: '/comparison',
      accent: 'indigo',
      borderColor: 'hover:border-indigo-500/50',
      badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
      glow: 'group-hover:shadow-indigo-500/15',
    },
    {
      id: 'comments',
      title: t('dashboard.cards.comments.title'),
      description: t('dashboard.cards.comments.description'),
      icon: MessageSquareWarning,
      route: '/comments',
      accent: 'emerald',
      borderColor: 'hover:border-emerald-500/50',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
      glow: 'group-hover:shadow-emerald-500/15',
    },
    {
      id: 'casting',
      title: t('dashboard.cards.casting.title'),
      description: t('dashboard.cards.casting.description'),
      icon: ShieldAlert,
      route: '/casting',
      accent: 'amber',
      borderColor: 'hover:border-amber-500/50',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      glow: 'group-hover:shadow-amber-500/15',
    },
    {
      id: 'vault',
      title: t('dashboard.cards.vault.title'),
      description: t('dashboard.cards.vault.description'),
      icon: Archive,
      route: '/vault',
      accent: 'purple',
      borderColor: 'hover:border-purple-500/50',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
      glow: 'group-hover:shadow-purple-500/15',
    },
  ];

  // Band badge color helper
  const getBandBadge = (band) => {
    switch (band) {
      case 'severe':
        return 'text-rose-400 bg-rose-950/80 border-rose-800/80';
      case 'high':
        return 'text-orange-400 bg-orange-950/80 border-orange-800/80';
      case 'moderate':
        return 'text-amber-400 bg-amber-950/80 border-amber-800/80';
      case 'low':
      default:
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Heading & Identity */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 mb-2">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>{t('dashboard.status')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            {t('dashboard.welcome')}, <span className="text-cyan-400">{user?.username || 'Creator'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Compact Creator Safety Score Summary Indicator (Supporting indicator, NOT a 6th feature card) */}
        <div 
          onClick={() => navigate('/safety-score')}
          className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group flex items-center justify-between gap-6 shrink-0 md:w-80 shadow-lg"
          title={t('dashboard.viewScoreDetails')}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('dashboard.scoreWidgetTitle')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                {safetyMetrics.score}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 100</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getBandBadge(safetyMetrics.band)}`}>
                {t(safetyMetrics.bandKey)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {safetyMetrics.recordsCount} {t('safetyScore.supportingRecords')}
            </p>
          </div>

          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-800 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Feature Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-200">
            {t('dashboard.featureCardsTitle')}
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            5 Dedicated Workspaces
          </span>
        </div>

        {/* EXACT FIVE PRIMARY FEATURE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.route)}
                className={`glass-panel rounded-2xl p-6 border border-slate-800/80 ${card.borderColor} shadow-lg hover:shadow-2xl ${card.glow} transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 group-hover:text-slate-400">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors mb-2">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <span>Enter Workspace</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust & Local Processing Assurance Banner */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start sm:items-center gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-300">Client-Side Privacy Guarantee:</span> Uploaded media files and comment inputs remain in your browser session or in-memory. No raw data is saved to permanent storage unless you explicitly click <span className="text-cyan-300">Save to Evidence Vault</span>.
        </p>
      </div>

    </div>
  );
}
