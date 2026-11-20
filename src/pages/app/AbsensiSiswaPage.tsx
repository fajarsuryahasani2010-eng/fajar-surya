import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, GraduationCap, Loader2, Save, Search } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { Student, StudentAttendanceRecord, StudentAttendanceStatus } from '../../types';

interface DraftEntry {
  status: StudentAttendanceStatus;
  catatan: string;
}

const STATUS_BUTTONS: Array<{ value: StudentAttendanceStatus; label: string; activeCls: string }> = [
  { value: 'hadir', label: 'Hadir', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'sakit', label: 'Sakit', activeCls: 'bg-amber-600 text-white border-amber-600' },
  { value: 'izin', label: 'Izin', activeCls: 'bg-slate-800 text-white border-slate-800' },
  { value: 'alpa', label: 'Alpa', activeCls: 'bg-red-600 text-white border-red-600' },
];

export default function AbsensiSiswaPage() {
  const { user } = useAuth();
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedKelas, setSelectedKelas] = useState<string>(
    kelasParam ? decodeURIComponent(kelasParam) : ''
  );
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, attRes] = await Promise.all([
        apiFetch<{ students: Student[] }>('/api/students'),
        apiFetch<{ records: StudentAttendanceRecord[] }>(
          `/api/student-attendance?tanggal=${encodeURIComponent(tanggal)}`
        ),
      ]);

      setStudents(stRes.students);

      const distinctClasses = Array.from(new Set(stRes.students.map((s) => s.kelas))).sort();
      if (!kelasParam && !selectedKelas && distinctClasses.length > 0) {
        setSelectedKelas(distinctClasses[0]);
      }

      const nextDrafts: Record<string, DraftEntry> = {};
      const existingMap = new Map(attRes.records.map((r) => [r.student_id, r]));

      for (const s of stRes.students) {
        const existing = existingMap.get(s.id);
        nextDrafts[s.id] = {
          status: existing ? existing.status : 'hadir',
          catatan: existing?.catatan || '',
        };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, [tanggal, kelasParam, selectedKelas]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kelasList = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const visibleStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesKelas = !selectedKelas || s.kelas === selectedKelas;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
      return matchesKelas && matchesSearch;
    });
  }, [students, selectedKelas, search]);

  function handleSelectKelas(kelas: string) {
    setSelectedKelas(kelas);
    if (kelas) {
      navigate(`/app/absensi-siswa/${encodeURIComponent(kelas)}`);
    } else {
      navigate('/app/absensi-siswa');
    }
  }

  function updateDraft(studentId: string, patch: Partial<DraftEntry>) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'hadir',
        catatan: prev[studentId]?.catatan || '',
        ...patch,
      },
    }));
  }

  function markAllPresent() {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of visibleStudents) {
        next[s.id] = { status: 'hadir', catatan: next[s.id]?.catatan || '' };
      }
      return next;
    });
  }

  async function handleSaveBatch() {
    if (visibleStudents.length === 0) return;
    setFeedback(null);
    setSaving(true);
    try {
      const entries = visibleStudents.map((s) => ({
        student_id: s.id,
        status: drafts[s.id]?.status || 'hadir',
        catatan: drafts[s.id]?.catatan || null,
      }));

      await apiFetch('/api/student-attendance/batch', {
        method: 'POST',
        body: JSON.stringify({ tanggal, entries }),
      });

      setFeedback({
        type: 'success',
        text: `Absensi untuk ${entries.length} siswa (${selectedKelas || 'Semua Kelas'}) pada ${tanggal} berhasil disimpan.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
      });
    } finally {
      setSaving(false);
    }
  }

  const summaryCounts = useMemo(() => {
    const counts = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
    for (const s of visibleStudents) {
      const st = drafts[s.id]?.status || 'hadir';
      counts[st]++;
    }
    return counts;
  }, [visibleStudents, drafts]);

  return (
    <AppShell
      title="Absensi Siswa"
      subtitle="Pencatatan kehadiran siswa per kelas oleh Guru dan Administrator"
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

      {/* Filter & Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label htmlFor="attDate" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Absensi
            </label>
            <input
              id="attDate"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
            />
          </div>

          <div className="md:col-span-4">
            <label htmlFor="kelasSelect" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Kelas (Dynamic Route)
            </label>
            <select
              id="kelasSelect"
              value={selectedKelas}
              onChange={(e) => handleSelectKelas(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-red-600 focus:outline-none"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label htmlFor="searchStudent" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cari NIS atau Nama Siswa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="searchStudent"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau NIS..."
                className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Class Quick Tabs */}
        {kelasList.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">Kelas:</span>
            {kelasList.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleSelectKelas(k)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedKelas === k
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 tabular-nums">
            <span className="text-sm font-bold text-slate-900">
              Daftar Siswa {selectedKelas || 'Semua Kelas'} ({visibleStudents.length})
            </span>
            <span className="text-emerald-700">Hadir: {summaryCounts.hadir}</span>
            <span className="text-amber-700">Sakit: {summaryCounts.sakit}</span>
            <span className="text-slate-700">Izin: {summaryCounts.izin}</span>
            <span className="text-red-700">Alpa: {summaryCounts.alpa}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={markAllPresent}
              disabled={visibleStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tandai Semua Hadir</span>
            </button>
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={saving || visibleStudents.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Absensi</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-11 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Belum Ada Data Siswa</p>
            <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
              Administrator perlu menambahkan data siswa (NIS, Nama, Kelas) terlebih dahulu sebelum guru dapat melakukan absensi.
            </p>
            {user?.role === 'admin' && (
              <Link
                to="/app/data-siswa"
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Kelola Data Siswa
              </Link>
            )}
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada siswa yang sesuai dengan filter kelas atau pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3 w-12">No</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status Kehadiran</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleStudents.map((s, idx) => {
                  const draft = drafts[s.id] || { status: 'hadir', catatan: '' };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {s.nis}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {s.nama}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.kelas}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1">
                          {STATUS_BUTTONS.map((btn) => (
                            <button
                              key={btn.value}
                              type="button"
                              onClick={() => updateDraft(s.id, { status: btn.value })}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
                                draft.status === btn.value
                                  ? btn.activeCls
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={draft.catatan}
                          onChange={(e) => updateDraft(s.id, { catatan: e.target.value })}
                          placeholder="Keterangan opsional..."
                          className="w-full min-w-[160px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:border-red-600 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
