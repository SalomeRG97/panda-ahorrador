import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { ChineseDecoration } from './components/common/ChineseDecoration';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LandingPage } from './pages/landing/LandingPage';
import { YearListPage } from './pages/years/YearListPage';
import { YearDashboardPage } from './pages/years/YearDashboardPage';
import { MonthLayoutPage } from './pages/months/MonthLayoutPage';
import { WeekDetailPage } from './pages/weeks/WeekDetailPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ShareManagementPage } from './pages/share/ShareManagementPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

export const App: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="app-layout">
            <ChineseDecoration />
            <Navbar />
            <main className="main-content">
              <Routes>
                {/* Rutas públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Rutas protegidas */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <LandingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/years"
                  element={
                    <ProtectedRoute>
                      <YearListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/years/:yearId"
                  element={
                    <ProtectedRoute>
                      <YearDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/years/:yearId/months/:monthId"
                  element={
                    <ProtectedRoute>
                      <MonthLayoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/years/:yearId/months/:monthId/weeks/:weekId"
                  element={
                    <ProtectedRoute>
                      <WeekDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/share"
                  element={
                    <ProtectedRoute allowedRoles={['regular', 'admin']}>
                      <ShareManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UserManagementPage />
                    </ProtectedRoute>
                  }
                />

                {/* Comodín */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <footer className="app-footer">
              <div className="footer-container">
                <span>🌸 熊猫理财 El panda ahorrador &copy; {currentYear}</span>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
