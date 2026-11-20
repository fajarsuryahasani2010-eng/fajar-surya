import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import { EmployeeAttendanceRecord, ROLE_LABELS, UserRole } from '../../types';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  hadir: { label: 'Hadir', cls: 'text-emerald-700' },
  izin: { label: 'Izin', cls: 'text-amber-700' },
  sakit: { label: 'Sakit', cls: 'text-red-700' },
  dinas_luar: { label: 'Dinas Luar', cls: 'text-slate-700' },
};

export default function RekapKaryawanPage() {
  const [records, setRecords] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scope: 'all' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await apiFetch<{ records: EmployeeAttendanceRecord[] }>(
        `/api/employee-attendance?${params.toString()}`
      );
      setRecords(res.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchesRole = roleFilter === 'all' || r.profile?.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesQuery =
        !q ||
        (r.profile?.full_name || '').toLowerCase().includes(q) ||
        (r.profile?.email || '').toLowerCase().includes(q) ||
        (r.profile?.nip || '').toLowerCase().includes(q);
      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [records, roleFilter, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      hadir: filtered.filter((r) => r.status === 'hadir').length,
      izin: filtered.filter((r) => r.status === 'izin').length,
      sakit: filtered.filter((r) => r.status === 'sakit').length,
      dinas_luar: filtered.filter((r) => r.status === 'dinas_luar').length,
    };
  }, [filtered]);

  function exportCsv() {
    const header = ['Tanggal', 'Nama', 'NIP', 'Peran', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'];
    const rows = filtered.map((r) => [
      r.tanggal,
      r.profile?.full_name || '',
      r.profile?.nip || '',
      r.profile?.role ? ROLE_LABELS[r.profile.role as UserRole] : '',
      STATUS_LABELS[r.status]?.label || r.status,
      r.jam_masuk || '',
      r.jam_pulang || '',
      (r.catatan || '').replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-karyawan.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Rekap Absensi Karyawan"
      subtitle="Laporan kehadiran seluruh Admin, Guru, dan Tenaga Kependidikan"
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-2">
          <label htmlFor="fromDate" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Dari Tanggal
          </label>
          <input
            id="fromDate"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
          />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="toDate" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Sampai Tanggal
          </label>
          <input
            id="toDate"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
          />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="roleFilter" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Peran
          </label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-red-600 focus:outline-none"
          >
            <option value="all">Semua Peran</option>
            <option value="admin">Administrator</option>
            <option value="guru">Guru</option>
            <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="statusFilter" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-red-600 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="dinas_luar">Dinas Luar</option>
          </select>
        </div>
        <div className="lg:col-span-4">
          <label htmlFor="searchEmp" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Cari Pegawai
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="searchEmp"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama, email, atau NIP..."
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
          <p className="text-xs font-semibold text-amber-700">Izin</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.izin}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-red-700">Sakit</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.sakit}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-600">Dinas Luar</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.dinas_luar}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-900">Data Rekapitulasi Karyawan</h3>
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
                  <th className="px-4 py-3">Nama Karyawan</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Masuk</th>
                  <th className="px-4 py-3">Pulang</th>
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
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{rec.profile?.full_name || '—'}</p>
                        {rec.profile?.nip && (
                          <p className="text-xs text-slate-500 font-mono tabular-nums">
                            NIP {rec.profile.nip}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {rec.profile?.role ? ROLE_LABELS[rec.profile.role as UserRole] : '—'}
                      </td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums">
                        {rec.jam_masuk ? rec.jam_masuk.slice(0, 5) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums">
                        {rec.jam_pulang ? rec.jam_pulang.slice(0, 5) : '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-600 max-w-[220px] truncate">
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
            Belum ada catatan absensi karyawan untuk filter yang dipilih.
          </div>
        )}
      </div>
    </AppShell>
  );
}
