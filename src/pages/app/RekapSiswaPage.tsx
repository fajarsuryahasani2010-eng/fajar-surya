import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import { Student, StudentAttendanceRecord } from '../../types';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  hadir: { label: 'Hadir', cls: 'text-emerald-700' },
  sakit: { label: 'Sakit', cls: 'text-amber-700' },
  izin: { label: 'Izin', cls: 'text-slate-700' },
  alpa: { label: 'Alpa', cls: 'text-red-700' },
};

export default function RekapSiswaPage() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kelasFilter, setKelasFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const [attRes, stRes] = await Promise.all([
        apiFetch<{ records: StudentAttendanceRecord[] }>(
          `/api/student-attendance?${params.toString()}`
        ),
        apiFetch<{ students: Student[] }>('/api/students'),
      ]);

      setRecords(attRes.records);
      setStudents(stRes.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kelasList = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchesKelas = kelasFilter === 'all' || r.student?.kelas === kelasFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesQuery =
        !q ||
        (r.student?.nama || '').toLowerCase().includes(q) ||
        (r.student?.nis || '').toLowerCase().includes(q);
      return matchesKelas && matchesStatus && matchesQuery;
    });
  }, [records, kelasFilter, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      hadir: filtered.filter((r) => r.status === 'hadir').length,
      sakit: filtered.filter((r) => r.status === 'sakit').length,
      izin: filtered.filter((r) => r.status === 'izin').length,
      alpa: filtered.filter((r) => r.status === 'alpa').length,
    };
  }, [filtered]);

  function exportCsv() {
    const header = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Dicatat Oleh', 'Catatan'];
    const rows = filtered.map((r) => [
      r.tanggal,
      r.student?.nis || '',
      r.student?.nama || '',
      r.student?.kelas || '',
      STATUS_LABELS[r.status]?.label || r.status,
      r.recorder?.full_name || '',
      (r.catatan || '').replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-siswa.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Rekap Absensi Siswa"
      subtitle="Laporan kehadiran siswa seluruh jurusan untuk Guru dan Administrator"
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-2">
          <label htmlFor="fromSiswa" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Dari Tanggal
          </label>
          <input
            id="fromSiswa"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
          />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="toSiswa" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Sampai Tanggal
          </label>
          <input
            id="toSiswa"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
          />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="kelasSiswa" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Kelas
          </label>
          <select
            id="kelasSiswa"
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-red-600 focus:outline-none"
          >
            <option value="all">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="statusSiswa" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Status
          </label>
          <select
            id="statusSiswa"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-red-600 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="sakit">Sakit</option>
            <option value="izin">Izin</option>
            <option value="alpa">Alpa</option>
          </select>
        </div>
        <div className="lg:col-span-4">
          <label htmlFor="searchSiswa" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Cari Siswa
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="searchSiswa"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="NIS atau nama siswa..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 rounded-xl bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200 mb-6">
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500">Total Catatan</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.total}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-emerald-700">Hadir</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.hadir}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-amber-700">Sakit</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.sakit}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-600">Izin</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.izin}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-red-700">Alpa</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.alpa}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-900">Data Rekapitulasi Siswa</h3>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pencatat</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((rec) => {
                  const st = STATUS_LABELS[rec.status] || { label: rec.status, cls: 'text-slate-700' };
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {rec.tanggal}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {rec.student?.nis || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {rec.student?.nama || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {rec.student?.kelas || '—'}
                      </td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {rec.recorder?.full_name || '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-500 max-w-[200px] truncate">
                        {rec.catatan || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada catatan absensi siswa untuk filter yang dipilih.
          </div>
        )}
      </div>
    </AppShell>
  );
}
