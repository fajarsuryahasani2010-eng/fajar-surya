import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, config, loading, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heroError, setHeroError] = useState(false);

  const isFirstSetup = config ? !config.hasUsers : false;

  useEffect(() => {
    if (isFirstSetup) {
      setMode('register');
    }
  }, [isFirstSetup]);

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/app', { replace: true });
      } else {
        await register({
          full_name: fullName,
          email,
          password,
          nip: nip || undefined,
          jabatan: jabatan || undefined,
        });
        navigate('/app', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-5/12 bg-red-700 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-red-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="mt-10 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-red-700 font-extrabold text-base">
              PU
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight">SMK Prima Unggul</p>
              <p className="text-xs text-red-200">Sistem Presensi Siswa & Karyawan</p>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mt-10 mb-4">
            Portal Kedisiplinan & Presensi Digital Sekolah
          </h1>
          <p className="text-red-100 text-sm lg:text-base leading-relaxed max-w-md">
            Kelola absensi harian guru, tenaga kependidikan, serta kehadiran siswa di seluruh
            program keahlian TKJ, DKV, AK, BC, MPLB, dan BD dalam satu tempat.
          </p>
        </div>

        <div className="relative z-10 mt-10">
          <div className="rounded-xl overflow-hidden border border-red-500/40 bg-red-800/40 aspect-[16/9]">
            {!heroError ? (
              <img
                src="/src/assets/images/hero_prima_campus_1795137533606.jpg"
                alt="Kampus SMK Prima Unggul"
                referrerPolicy="no-referrer"
                onError={() => setHeroError(true)}
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-red-100">
                Kampus SMK Prima Unggul
              </div>
            )}
          </div>
          <p className="text-xs text-red-200 mt-4">
            Autentikasi terintegrasi dengan kontrol peran Administrator, Guru, dan Tenaga Kependidikan.
          </p>
        </div>
      </div>

      {/* Right Auth Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-semibold text-red-600 mb-1.5">
              {isFirstSetup ? 'Inisialisasi Sistem Pertama Kali' : 'Akses Portal Aplikasi'}
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              {mode === 'login' ? 'Masuk ke Akun Anda' : isFirstSetup ? 'Buat Akun Admin Pertama' : 'Daftar Akun Baru'}
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              {isFirstSetup
                ? 'Belum ada pengguna terdaftar. Akun pertama yang dibuat otomatis memperoleh peran Administrator.'
                : mode === 'login'
                ? 'Masukkan email dan kata sandi yang terdaftar di sistem.'
                : 'Lengkapi data diri untuk membuat akun pengguna baru.'}
            </p>
          </div>

          {/* Segmented Mode Switch */}
          {!isFirstSetup && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Akun
              </button>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Suryana"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nip" className="block text-sm font-semibold text-slate-800 mb-1.5">
                      NIP / NUPTK (Opsional)
                    </label>
                    <input
                      id="nip"
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="19850412..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="jabatan" className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Jabatan (Opsional)
                    </label>
                    <input
                      id="jabatan"
                      type="text"
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      placeholder={isFirstSetup ? 'Administrator Sistem' : 'Staf / Guru Mapel'}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@smkprimaunggul.sch.id"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 mt-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'login'
                  ? 'Masuk ke Aplikasi'
                  : isFirstSetup
                  ? 'Daftarkan Admin Pertama'
                  : 'Daftar Sekarang'}
              </span>
            </button>
          </form>

          {mode === 'register' && isFirstSetup && (
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              Setelah akun Administrator pertama dibuat, Anda dapat menambahkan akun Guru dan Tenaga
              Kependidikan dari menu User Management.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
