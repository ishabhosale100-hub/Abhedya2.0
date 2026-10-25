import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft, Globe, LogOut } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { language, setLanguage, languages, t } = useI18n();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isFeaturePage = [
    '/watermark',
    '/comparison',
    '/comments',
    '/casting',
    '/vault',
    '/safety-score'
  ].includes(location.pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity / Back button */}
        <div className="flex items-center gap-4">
          {isFeaturePage && (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/50 rounded-lg transition-colors cursor-pointer"
              title={t('nav.back')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('nav.backToFeatures')}</span>
            </button>
          )}

          <div
            onClick={() => isAuthenticated ? navigate('/dashboard') : navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-wider text-slate-100 group-hover:text-cyan-400 transition-colors">
                {t('brand.name')}
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-mono">
                {t('brand.tagline')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Language Selector & User Auth actions */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
            <Globe className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              aria-label={t('login.languageSelect')}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                  {lang.native}
                </option>
              ))}
            </select>
          </div>

          {/* User Status / Logout */}
          {isAuthenticated && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="hidden md:inline-block text-xs text-slate-400 font-mono">
                {user?.username}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
