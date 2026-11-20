import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardCheck, Clock, GraduationCap, UserCheck, Users } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { EmployeeAttendanceRecord, ROLE_LABELS } from '../../types';

interface DashboardSummary {
  today: string;
  myTodayAttendance: EmployeeAttendanceRecord | null;
  myRecentAttendance: EmployeeAttendanceRecord[];
  totalStudents: number;
  totalEmployees: number;
  todayEmployeesPresent: number;
  todayStudentsPresent: number;
  todayStudentsTotalRecorded: number;
}

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  hadir: { label: 'Hadir', cls: 'text-emerald-700' },
  izin: { label: 'Izin', cls: 'text-amber-700' },
  sakit: { label: 'Sakit', cls: 'text-red-700' },
  dinas_luar: { label: 'Dinas Luar', cls: 'text-slate-700' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<DashboardSummary>('/api/dashboard/summary');
        if (active) setSummary(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isGuru = user.role === 'guru';

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Selamat datang, ${user.full_name} · ${ROLE_LABELS[user.role]}`}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Top Banner Card: Today's Personal Attendance Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-red-600 mb-1">{formattedDate}</p>
          <h2 className="text-xl font-bold text-slate-900">
            Status Presensi Anda Hari Ini
          </h2>
          {loading ? (
            <div className="h-5 w-64 bg-slate-100 rounded mt-2 animate-pulse" />
          ) : summary?.myTodayAttendance ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {STATUS_TEXT[summary.myTodayAttendance.status]?.label || summary.myTodayAttendance.status}
              </span>
              {summary.myTodayAttendance.jam_masuk && (
                <span className="tabular-nums">
                  Masuk: <strong className="text-slate-900">{summary.myTodayAttendance.jam_masuk.slice(0, 5)}</strong>
                </span>
              )}
              {summary.myTodayAttendance.jam_pulang ? (
                <span className="tabular-nums">
                  Pulang: <strong className="text-slate-900">{summary.myTodayAttendance.jam_pulang.slice(0, 5)}</strong>
                </span>
              ) : summary.myTodayAttendance.status === 'hadir' ? (
                <span className="text-amber-700 font-medium">Belum absen pulang</span>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Anda belum mencatat absensi karyawan untuk hari ini.
            </p>
          )}
        </div>

        <Link
          to="/app/absensi-karyawan"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <UserCheck className="w-4 h-4" />
          <span>
            {summary?.myTodayAttendance && !summary.myTodayAttendance.jam_pulang && summary.myTodayAttendance.status === 'hadir'
              ? 'Catat Absen Pulang'
              : 'Isi Absensi Karyawan'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Role-Specific Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Presensi Pribadi</span>
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {loading ? '—' : summary?.myRecentAttendance.length ?? 0} Hari
          </p>
          <p className="text-xs text-slate-500 mt-1">Riwayat tercatat 7 entri terakhir</p>
        </div>

        {(isAdmin || isGuru) && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">Total Siswa Aktif</span>
                <GraduationCap className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {loading ? '—' : summary?.totalStudents ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Terdaftar pada seluruh kelas</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">Siswa Hadir Hari Ini</span>
                <ClipboardCheck className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {loading
                  ? '—'
                  : `${summary?.todayStudentsPresent ?? 0} / ${summary?.todayStudentsTotalRecorded ?? 0}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">Dari siswa yang sudah diabsen hari ini</p>
            </div>
          </>
        )}

        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Karyawan Hadir Hari Ini</span>
              <Users className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {loading ? '—' : `${summary?.todayEmployeesPresent ?? 0} / ${summary?.totalEmployees ?? 0}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total seluruh guru & staf aktif</p>
          </div>
        )}
      </div>

      {/* Quick Actions + Recent Attendance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Absensi Karyawan Saya</h3>
            <Link
              to="/app/absensi-karyawan"
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-9 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : summary && summary.myRecentAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Jam Masuk</th>
                    <th className="px-4 py-3">Jam Pulang</th>
                    <th className="px-6 py-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.myRecentAttendance.map((row) => {
                    const st = STATUS_TEXT[row.status] || { label: row.status, cls: 'text-slate-700' };
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          {row.tanggal}
                        </td>
                        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${st.cls}`}>
                          {st.label}
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums font-mono text-xs">
                          {row.jam_masuk ? row.jam_masuk.slice(0, 5) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums font-mono text-xs">
                          {row.jam_pulang ? row.jam_pulang.slice(0, 5) : '—'}
                        </td>
                        <td className="px-6 py-3 text-slate-500 truncate max-w-[200px]">
                          {row.catatan || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600 mb-3">Belum ada riwayat absensi pribadi.</p>
              <Link
                to="/app/absensi-karyawan"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
              >
                Lakukan Absen Pertama
              </Link>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Pintasan Menu</h3>
          <div className="space-y-2.5">
            <Link
              to="/app/absensi-karyawan"
              className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Absensi Karyawan</p>
                <p className="text-xs text-slate-500">Presensi masuk, pulang, izin & sakit</p>
              </div>
              <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
            </Link>

            {(isAdmin || isGuru) && (
              <>
                <Link
                  to="/app/absensi-siswa"
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Absensi Siswa</p>
                    <p className="text-xs text-slate-500">Catat kehadiran siswa per kelas</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                </Link>

                <Link
                  to="/app/rekap/siswa"
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Rekap Absensi Siswa</p>
                    <p className="text-xs text-slate-500">Laporan & ekspor data kehadiran</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/app/data-siswa"
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Kelola Data Siswa</p>
                    <p className="text-xs text-slate-500">Tambah & perbarui NIS, nama, kelas</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                </Link>

                <Link
                  to="/app/users"
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">User Management</p>
                    <p className="text-xs text-slate-500">Sinkronisasi akun & hak akses peran</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
