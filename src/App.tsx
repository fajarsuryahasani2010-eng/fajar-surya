import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/app/DashboardPage';
import AbsensiKaryawanPage from './pages/app/AbsensiKaryawanPage';
import AbsensiSiswaPage from './pages/app/AbsensiSiswaPage';
import RekapKaryawanPage from './pages/app/RekapKaryawanPage';
import RekapSiswaPage from './pages/app/RekapSiswaPage';
import DataSiswaPage from './pages/app/DataSiswaPage';
import UserManagementPage from './pages/app/UserManagementPage';
import { UserRole } from './types';

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
          <span>Memuat sesi portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/absensi-karyawan"
            element={
              <ProtectedRoute>
                <AbsensiKaryawanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/absensi-siswa"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <AbsensiSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/absensi-siswa/:kelas"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <AbsensiSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/rekap/karyawan"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RekapKaryawanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/rekap/siswa"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <RekapSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/data-siswa"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/users/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
