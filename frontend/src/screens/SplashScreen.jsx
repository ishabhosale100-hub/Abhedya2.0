import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
        {/* ABHEDYA, prominently displayed */}
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-widest bg-gradient-to-r from-slate-100 via-cyan-200 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm mb-4">
          ABHEDYA
        </h1>

        {/* The tagline directly beneath it */}
        <p className="text-lg sm:text-xl font-medium text-cyan-400 tracking-wide mb-12">
          Protect. Prove. Prevail.
        </p>

        {/* One button: 'Get Started' */}
        <button
          onClick={() => navigate('/login')}
          className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
        >
          {t('splash.getStarted')}
        </button>
      </div>
    </div>
  );
}
