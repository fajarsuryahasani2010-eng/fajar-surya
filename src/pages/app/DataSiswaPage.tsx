import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import { DEFAULT_KELAS_OPTIONS, Student } from '../../types';

const SAMPLE_STUDENTS = [
  { nis: '20260101', nama: 'Bagus Pratama', kelas: 'X TKJ 1' },
  { nis: '20260102', nama: 'Siti Nurhaliza', kelas: 'X TKJ 1' },
  { nis: '20260201', nama: 'Raka Mahendra', kelas: 'X DKV 1' },
  { nis: '20260202', nama: 'Nadia Kusuma', kelas: 'X DKV 1' },
  { nis: '20260301', nama: 'Dewi Anggraini', kelas: 'X AK 1' },
  { nis: '20260401', nama: 'Fajar Ramadhan', kelas: 'X BC 1' },
  { nis: '20260501', nama: 'Putri Wulandari', kelas: 'X MPLB 1' },
  { nis: '20260601', nama: 'Dimas Setiawan', kelas: 'X BD 1' },
];

export default function DataSiswaPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [kelasFilter, setKelasFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('X TKJ 1');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ students: Student[] }>('/api/students');
      setStudents(res.students);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const kelasList = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesKelas = kelasFilter === 'all' || s.kelas === kelasFilter;
      const matchesQuery =
        !q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
      return matchesKelas && matchesQuery;
    });
  }, [students, kelasFilter, search]);

  function openCreateModal() {
    setEditingStudent(null);
    setNis('');
    setNama('');
    setKelas('X TKJ 1');
    setModalOpen(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setNis(student.nis);
    setNama(student.nama);
    setKelas(student.kelas);
    setModalOpen(true);
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      if (editingStudent) {
        await apiFetch(`/api/students/${editingStudent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nis, nama, kelas }),
        });
        setFeedback({ type: 'success', text: `Data siswa ${nama} berhasil diperbarui.` });
      } else {
        await apiFetch('/api/students', {
          method: 'POST',
          body: JSON.stringify({ nis, nama, kelas }),
        });
        setFeedback({ type: 'success', text: `Siswa ${nama} berhasil ditambahkan.` });
      }
      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStudent(student: Student) {
    setFeedback(null);
    setDeletingId(student.id);
    try {
      await apiFetch(`/api/students/${student.id}`, { method: 'DELETE' });
      setFeedback({ type: 'success', text: `Siswa ${student.nama} (${student.nis}) telah dihapus.` });
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus siswa.',
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSeedSample() {
    setFeedback(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/students/bulk', {
        method: 'POST',
        body: JSON.stringify({ items: SAMPLE_STUDENTS }),
      });
      setFeedback({
        type: 'success',
        text: '8 contoh data siswa lintas jurusan (TKJ, DKV, AK, BC, MPLB, BD) berhasil ditambahkan.',
      });
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menambahkan contoh data siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Data Siswa"
      subtitle="Master data siswa (NIS, Nama, Kelas) untuk pencatatan absensi oleh Guru"
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

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-2xl">
          <div>
            <label htmlFor="searchMaster" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cari NIS atau Nama
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="searchMaster"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="filterMasterKelas" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filter Kelas
            </label>
            <select
              id="filterMasterKelas"
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
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tabular-nums">
            Daftar Siswa Terdaftar ({filtered.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900 mb-1">Belum Ada Data Siswa</p>
            <p className="text-xs text-slate-500 mb-5 max-w-md mx-auto">
              Tambahkan siswa satu per satu atau isi contoh data siswa awal untuk seluruh 6 kompetensi keahlian.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Siswa Manual</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSeedSample}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Isi Contoh Data 6 Jurusan</span>
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada data siswa yang cocok dengan filter pencarian.
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
                  <th className="px-4 py-3">Jurusan</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 tabular-nums whitespace-nowrap">
                      {s.nis}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {s.nama}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{s.kelas}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {s.jurusan || '—'}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDeleteStudent(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white rounded-md transition-colors"
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label htmlFor="nisInput" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NIS (Nomor Induk Siswa)
                </label>
                <input
                  id="nisInput"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 20260101"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="namaInput" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="namaInput"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Bagus Pratama"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="kelasInput" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kelas (TKJ / DKV / AK / BC / MPLB / BD)
                </label>
                <input
                  id="kelasInput"
                  list="kelas-options"
                  required
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: X TKJ 1"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                />
                <datalist id="kelas-options">
                  {DEFAULT_KELAS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
