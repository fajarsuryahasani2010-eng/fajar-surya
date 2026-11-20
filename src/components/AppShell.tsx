import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AppShell({ title, subtitle, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(location.pathname.startsWith('/app/rekap'));

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isGuru = user.role === 'guru';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-600 text-white'
        : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
    }`;

  const subNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 pl-10 pr-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 text-red-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white font-extrabold text-sm shrink-0">
            PU
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900 truncate">
            SMK Prima Unggul
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links (Left Side Menu) */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1" aria-label="Menu Utama">
        <NavLink
          to="/app"
          end
          onClick={() => setSidebarOpen(false)}
          className={navItemClass}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        {/* Semua role merupakan karyawan dan memiliki menu Absensi Karyawan */}
        <NavLink
          to="/app/absensi-karyawan"
          onClick={() => setSidebarOpen(false)}
          className={navItemClass}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </NavLink>

        {/* Admin & Guru: Absensi Siswa */}
        {(isAdmin || isGuru) && (
          <NavLink
            to="/app/absensi-siswa"
            onClick={() => setSidebarOpen(false)}
            className={navItemClass}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Absensi Siswa</span>
          </NavLink>
        )}

        {/* Admin & Guru: Rekap Absensi Submenu */}
        {(isAdmin || isGuru) && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setRekapOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                location.pathname.startsWith('/app/rekap')
                  ? 'text-red-700 bg-red-50/70'
                  : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <span className="flex items-center gap-3 whitespace-nowrap">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              {rekapOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>

            {rekapOpen && (
              <div className="mt-1 space-y-1">
                {isAdmin && (
                  <NavLink
                    to="/app/rekap/karyawan"
                    onClick={() => setSidebarOpen(false)}
                    className={subNavItemClass}
                  >
                    <span>Absensi Karyawan</span>
                  </NavLink>
                )}
                <NavLink
                  to="/app/rekap/siswa"
                  onClick={() => setSidebarOpen(false)}
                  className={subNavItemClass}
                >
                  <span>Absensi Siswa</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Admin Only: Data Siswa & User Management */}
        {isAdmin && (
          <>
            <NavLink
              to="/app/data-siswa"
              onClick={() => setSidebarOpen(false)}
              className={navItemClass}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Data Siswa</span>
            </NavLink>

            <NavLink
              to="/app/users"
              onClick={() => setSidebarOpen(false)}
              className={navItemClass}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom User Summary inside Sidebar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80">
        <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {ROLE_LABELS[user.role]}
          {user.jabatan ? ` · ${user.jabatan}` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header: Breadcrumb / Title on left, Logout Button on top right */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-xs text-slate-500 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Top-Right Profile Info & Logout Button */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{user.full_name}</p>
              <p className="text-xs text-slate-500 leading-tight">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
