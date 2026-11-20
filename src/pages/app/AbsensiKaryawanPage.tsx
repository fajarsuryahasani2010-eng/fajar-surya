import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Download, Loader2, LogIn, LogOut } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { EmployeeAttendanceRecord, EmployeeAttendanceStatus } from '../../types';

const STATUS_LABEL: Record<EmployeeAttendanceStatus, { label: string; cls: string }> = {
  hadir: { label: 'Hadir', cls: 'text-emerald-700' },
  izin: { label: 'Izin', cls: 'text-amber-700' },
  sakit: { label: 'Sakit', cls: 'text-red-700' },
  dinas_luar: { label: 'Dinas Luar', cls: 'text-slate-700' },
};

export default function AbsensiKaryawanPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());
  const [statusMode, setStatusMode] = useState<EmployeeAttendanceStatus>('hadir');
  const [catatan, setCatatan] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ records: EmployeeAttendanceRecord[] }>(
        '/api/employee-attendance?scope=mine'
      );
      setRecords(res.records);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat riwayat absensi.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const todayRecord = records.find((r) => r.tanggal === todayStr) || null;

  async function handleSubmitAttendance(action: 'checkin' | 'checkout' | 'submit') {
    setFeedback(null);
    setSubmitting(true);
    try {
      const payload =
        action === 'checkout'
          ? { action: 'checkout', tanggal: todayStr, catatan: catatan || undefined }
          : {
              action,
              tanggal: todayStr,
              status: action === 'checkin' ? 'hadir' : statusMode,
              catatan: catatan || null,
            };

      await apiFetch('/api/employee-attendance', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCatatan('');
      setFeedback({
        type: 'success',
        text:
          action === 'checkout'
            ? 'Absen pulang hari ini berhasil dicatat.'
            : 'Presensi karyawan hari ini berhasil disimpan.',
      });
      await loadRecords();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan presensi.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function exportCsv() {
    const header = ['Tanggal', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'];
    const rows = records.map((r) => [
      r.tanggal,
      STATUS_LABEL[r.status]?.label || r.status,
      r.jam_masuk || '',
      r.jam_pulang || '',
      (r.catatan || '').replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absensi-karyawan-${user?.full_name.toLowerCase().replace(/\s+/g, '-') || 'saya'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const timeString = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <AppShell
      title="Absensi Karyawan"
      subtitle="Presensi mandiri harian untuk seluruh pegawai SMK Prima Unggul"
    >
      {feedback && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Live Clock & Action Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-red-600">Waktu Server Lokal</span>
              <Clock className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-4xl font-extrabold text-slate-950 font-mono tabular-nums tracking-tight">
              {timeString}
            </p>
            <p className="text-sm text-slate-600 mt-1">{dateString}</p>

            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-2">Status Hari Ini</p>
              {todayRecord ? (
                <div className="space-y-1.5 text-sm">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{STATUS_LABEL[todayRecord.status]?.label || todayRecord.status}</span>
                  </p>
                  <p className="text-slate-600 tabular-nums">
                    Jam Masuk: <strong className="text-slate-900">{todayRecord.jam_masuk ? todayRecord.jam_masuk.slice(0, 5) : '—'}</strong>
                    <span className="mx-2 text-slate-300">·</span>
                    Jam Pulang: <strong className="text-slate-900">{todayRecord.jam_pulang ? todayRecord.jam_pulang.slice(0, 5) : '—'}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Belum ada catatan presensi untuk tanggal {todayStr}.</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={submitting || Boolean(todayRecord?.jam_masuk)}
              onClick={() => handleSubmitAttendance('checkin')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{todayRecord?.jam_masuk ? 'Sudah Absen Masuk' : 'Absen Masuk'}</span>
            </button>

            <button
              type="button"
              disabled={
                submitting ||
                !todayRecord ||
                todayRecord.status !== 'hadir' ||
                Boolean(todayRecord.jam_pulang)
              }
              onClick={() => handleSubmitAttendance('checkout')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>{todayRecord?.jam_pulang ? 'Sudah Absen Pulang' : 'Absen Pulang'}</span>
            </button>
          </div>
        </div>

        {/* Alternative Status Submission Form (Hadir / Izin / Sakit / Dinas Luar) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Form Keterangan & Penyesuaian Kehadiran
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Gunakan formulir ini untuk mencatat status Izin, Sakit, Dinas Luar, atau memperbarui keterangan kehadiran hari ini.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitAttendance('submit');
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pilih Status Kehadiran
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { value: 'hadir', label: 'Hadir' },
                    { value: 'izin', label: 'Izin' },
                    { value: 'sakit', label: 'Sakit' },
                    { value: 'dinas_luar', label: 'Dinas Luar' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatusMode(item.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${
                      statusMode === item.value
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-red-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="catatan" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                id="catatan"
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Surat tugas rapat MKKS / Izin keperluan keluarga"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan Status Kehadiran</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Riwayat Kehadiran Pribadi</h3>
            <p className="text-xs text-slate-500">Menampilkan seluruh catatan presensi akun Anda</p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : records.length > 0 ? (
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
                {records.map((rec) => {
                  const st = STATUS_LABEL[rec.status] || { label: rec.status, cls: 'text-slate-700' };
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {rec.tanggal}
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
                      <td className="px-6 py-3 text-slate-600">{rec.catatan || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada data absensi karyawan yang tercatat.
          </div>
        )}
      </div>
    </AppShell>
  );
}
