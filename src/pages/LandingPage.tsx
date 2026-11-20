import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { JURUSAN_LIST, RUMPUN_JURUSAN } from '../types';

export default function LandingPage() {
  const { user } = useAuth();
  const [heroImgError, setHeroImgError] = useState(false);
  const [techImgError, setTechImgError] = useState(false);
  const [studioImgError, setStudioImgError] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white font-extrabold text-sm">
              PU
            </span>
            <span>SMK Prima Unggul</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#profil" className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0">
              Profil Sekolah
            </a>
            <a href="#jurusan" className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0">
              Program Keahlian
            </a>
            <a href="#absensi" className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0">
              Sistem Absensi
            </a>
            <a href="#kontak" className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0">
              Informasi
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={user ? '/app' : '/login'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{user ? 'Buka Aplikasi' : 'Masuk Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-red-600 tracking-tight mb-4">
                  Sekolah Menengah Kejuruan Terakreditasi · Berbasis Industri Digital
                </p>
                <h1
                  className="font-extrabold tracking-tight text-slate-950 leading-[1.1] mb-6"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
                >
                  Pendidikan Vokasi Unggul dengan Tata Kelola Presensi Digital Terpadu.
                </h1>
                <p className="text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                  SMK Prima Unggul membekali peserta didik melalui 3 rumpun keahlian dan 6 kompetensi
                  keahlian unggulan (TKJ, DKV, AK, BC, MPLB, dan BD) yang ditunjang kedisiplinan
                  absensi siswa serta karyawan secara real-time.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to={user ? '/app' : '/login'}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <span>{user ? 'Masuk ke Dashboard' : 'Masuk Sistem Absensi'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#jurusan"
                    className="inline-flex items-center px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    Jelajahi Jurusan
                  </a>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                <span>Kurikulum Merdeka Vokasi</span>
                <span aria-hidden="true">·</span>
                <span>Sinkronisasi Supabase Auth</span>
                <span aria-hidden="true">·</span>
                <span>Rekapitulasi Kehadiran Harian</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[320px] lg:min-h-[460px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_prima_campus_1795137533606.jpg"
                    alt="Gedung kampus modern SMK Prima Unggul bernuansa merah dan putih"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-50 via-white to-slate-100 text-slate-700">
                    <Building2 className="w-12 h-12 text-red-600 mb-3" />
                    <p className="font-semibold text-slate-900">Kampus SMK Prima Unggul</p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                  <p className="text-xs font-medium text-red-200 mb-1">Lingkungan Belajar Modern</p>
                  <p className="text-sm font-semibold">
                    Gedung Akademik & Laboratorium Terpadu SMK Prima Unggul
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-column Institutional Metrics Strip */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/70">
            <div className="p-6">
              <p className="text-3xl font-extrabold text-red-600 tabular-nums">3 Rumpun</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">Bidang Keahlian Utama</p>
              <p className="text-xs text-slate-500 mt-0.5">Teknologi, Bisnis Manajemen, Akuntansi</p>
            </div>
            <div className="p-6">
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">6 Jurusan</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">Kompetensi Keahlian</p>
              <p className="text-xs text-slate-500 mt-0.5">TKJ, DKV, AK, BC, MPLB, dan BD</p>
            </div>
            <div className="p-6">
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">3 Peran</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">Kontrol Akses Terstruktur</p>
              <p className="text-xs text-slate-500 mt-0.5">Admin, Guru, Tenaga Kependidikan</p>
            </div>
            <div className="p-6">
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">100%</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">Rekap Digital Terpusat</p>
              <p className="text-xs text-slate-500 mt-0.5">Presensi siswa dan karyawan harian</p>
            </div>
          </div>
        </section>

        {/* Profil SMK Prima Unggul */}
        <section id="profil" className="border-t border-slate-200 bg-slate-50/50 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold text-red-600 mb-2">Tentang Sekolah</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 leading-tight mb-4">
                  Profil SMK Prima Unggul
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  SMK Prima Unggul adalah institusi pendidikan kejuruan yang berfokus pada penguasaan
                  keterampilan praktis, karakter kerja disiplin, dan kesiapan terjun ke dunia usaha serta
                  dunia industri (DUDI).
                </p>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <span>Kurikulum adaptif yang diselaraskan dengan mitra industri nasional.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <span>Fasilitas laboratorium jaringan, studio desain, studio siaran, dan perkantoran.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <span>Kedisiplinan kehadiran siswa dan tenaga pendidik terpantau setiap hari.</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    {!techImgError ? (
                      <img
                        src="/src/assets/images/jurusan_tech_media_1795137518103.jpg"
                        alt="Laboratorium Teknik Komputer Jaringan dan Desain Komunikasi Visual"
                        referrerPolicy="no-referrer"
                        onError={() => setTechImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-700 font-semibold">
                        Laboratorium Teknologi & Desain
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900">
                      Laboratorium Teknologi & Desain
                    </h3>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Praktik langsung infrastruktur server, jaringan fiber, dan perangkat lunak kreatif
                      standar industri.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    {!studioImgError ? (
                      <img
                        src="/src/assets/images/jurusan_broadcast_business_1795137518530.jpg"
                        alt="Studio Broadcasting dan Ruang Praktik Manajemen Bisnis"
                        referrerPolicy="no-referrer"
                        onError={() => setStudioImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-700 font-semibold">
                        Studio Siaran & Bisnis Digital
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900">
                      Studio Siaran & Simulasi Bisnis
                    </h3>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Ruang produksi audio-visual, manajemen perkantoran modern, dan laboratorium akuntansi
                      digital.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Rumpun Jurusan & 6 Kompetensi Keahlian */}
        <section id="jurusan" className="py-16 lg:py-20 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-red-600 mb-2">Struktur Akademik</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 mb-3">
                3 Rumpun Jurusan & 6 Kompetensi Keahlian
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Seluruh kompetensi keahlian di SMK Prima Unggul dikelompokkan dalam 3 rumpun utama yang
                mencakup TKJ, DKV, AK, BC, MPLB, dan BD.
              </p>
            </div>

            {/* 3 Rumpun Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              {RUMPUN_JURUSAN.map((rumpun) => (
                <div
                  key={rumpun.nomor}
                  className="p-6 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-red-600 tabular-nums mb-2">
                      {rumpun.nomor}. Rumpun Keahlian
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{rumpun.nama}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{rumpun.ringkasan}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200 text-xs font-semibold text-slate-800">
                    Program: {rumpun.kodeList.join(' · ')}
                  </div>
                </div>
              ))}
            </div>

            {/* 6 Kompetensi Keahlian Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {JURUSAN_LIST.map((j) => (
                <div
                  key={j.kode}
                  className="p-6 rounded-xl border border-slate-200 bg-white hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xl font-extrabold text-red-600 tracking-tight">{j.kode}</span>
                    <span className="text-xs font-medium text-slate-500">{j.rumpun}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{j.nama}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{j.deskripsi}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sistem Absensi & Role Access */}
        <section id="absensi" className="py-16 lg:py-20 border-t border-slate-200 bg-slate-50/60">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-red-600 mb-2">Tata Kelola Presensi</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 mb-3">
                  Alur Absensi Siswa & Karyawan Berbasis Peran
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Setiap pegawai melakukan presensi harian secara mandiri, sementara guru dan
                  administrator mencatat serta memantau kehadiran siswa per kelas secara akurat.
                </p>
              </div>
              <Link
                to={user ? '/app' : '/login'}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
              >
                <span>{user ? 'Buka Ruang Kerja' : 'Masuk ke Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">01. Administrator</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Akun pertama yang terdaftar otomatis berperan sebagai Admin. Mengelola user yang
                  tersinkronisasi penuh hingga hard-delete di Supabase Auth, data master siswa, serta
                  rekap absensi karyawan dan siswa.
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Akses: Dashboard · Absensi Karyawan · Absensi Siswa · Rekap Lengkap · Data Siswa · User Management
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">02. Guru</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Melakukan presensi harian sebagai karyawan sekaligus mencatat kehadiran siswa per
                  kelas serta meninjau laporan rekapitulasi absensi siswa lintas tanggal.
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Akses: Dashboard · Absensi Karyawan · Absensi Siswa · Rekap Absensi Siswa
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">03. Tenaga Kependidikan</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Melakukan check-in masuk, check-out pulang, serta pengajuan status izin, sakit,
                  atau dinas luar secara mandiri dengan riwayat yang tercatat rapi.
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Akses: Dashboard · Absensi Karyawan Mandiri
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer id="kontak" className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-slate-900">SMK Prima Unggul</p>
            <p className="text-sm text-slate-500 mt-1">
              Sistem Informasi Presensi Siswa & Karyawan · TKJ, DKV, AK, BC, MPLB, dan BD
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <a href="#profil" className="hover:text-red-600 transition-colors">
              Profil
            </a>
            <a href="#jurusan" className="hover:text-red-600 transition-colors">
              Jurusan
            </a>
            <Link to="/login" className="font-semibold text-red-600 hover:text-red-700 transition-colors">
              Login Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
