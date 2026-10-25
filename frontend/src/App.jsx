import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import SafetyScoreScreen from './screens/SafetyScoreScreen';
import WatermarkScreen from './screens/WatermarkScreen';
import ComparisonScreen from './screens/ComparisonScreen';
import CommentsScreen from './screens/CommentsScreen';
import CastingScreen from './screens/CastingScreen';
import VaultScreen from './screens/VaultScreen';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout with conditional Navbar (Splash has NO extra navigation)
const AppLayout = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Screen 1: Splash Screen */}
          <Route path="/" element={<SplashScreen />} />

          {/* Screen 2: Login Screen */}
          <Route path="/login" element={<LoginScreen />} />

          {/* Screen 3: Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardScreen />
              </ProtectedRoute>
            }
          />

          {/* Feature 1: Photo Watermarking */}
          <Route
            path="/watermark"
            element={
              <ProtectedRoute>
                <WatermarkScreen />
              </ProtectedRoute>
            }
          />

          {/* Feature 2: Photo Comparison */}
          <Route
            path="/comparison"
            element={
              <ProtectedRoute>
                <ComparisonScreen />
              </ProtectedRoute>
            }
          />

          {/* Feature 3: Comment Safety */}
          <Route
            path="/comments"
            element={
              <ProtectedRoute>
                <CommentsScreen />
              </ProtectedRoute>
            }
          />

          {/* Feature 4: Casting Shield */}
          <Route
            path="/casting"
            element={
              <ProtectedRoute>
                <CastingScreen />
              </ProtectedRoute>
            }
          />

          {/* Feature 5: Evidence Vault */}
          <Route
            path="/vault"
            element={
              <ProtectedRoute>
                <VaultScreen />
              </ProtectedRoute>
            }
          />

          {/* Supporting: Creator Safety Score Details */}
          <Route
            path="/safety-score"
            element={
              <ProtectedRoute>
                <SafetyScoreScreen />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Router>
          <AppLayout />
        </Router>
      </AuthProvider>
    </I18nProvider>
  );
}
