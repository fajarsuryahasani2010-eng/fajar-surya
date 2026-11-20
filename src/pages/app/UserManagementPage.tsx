import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { ROLE_LABELS, UserProfile, UserRole } from '../../types';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { id: routeUserId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create/Edit Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hard Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ users: UserProfile[] }>('/api/users');
      setUsers(res.users);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Support dynamic route /app/users/:id to open edit modal directly
  useEffect(() => {
    if (routeUserId && users.length > 0) {
      const matched = users.find((u) => u.id === routeUserId);
      if (matched) {
        openEditModal(matched);
      }
    }
  }, [routeUserId, users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesQuery =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, roleFilter, search]);

  function openCreateModal() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('guru');
    setNip('');
    setJabatan('');
    setFormOpen(true);
  }

  function openEditModal(u: UserProfile) {
    setEditingUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setNip(u.nip || '');
    setJabatan(u.jabatan || '');
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    if (routeUserId) {
      navigate('/app/users', { replace: true });
    }
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      if (editingUser) {
        await apiFetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            full_name: fullName,
            email,
            role,
            nip,
            jabatan,
            ...(password.trim() ? { password: password.trim() } : {}),
          }),
        });
        setFeedback({
          type: 'success',
          text: `Data pengguna ${fullName} berhasil diperbarui dan disinkronkan.`,
        });
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            role,
            nip,
            jabatan,
          }),
        });
        setFeedback({
          type: 'success',
          text: `Pengguna baru ${fullName} (${ROLE_LABELS[role]}) berhasil dibuat dan disinkronkan dengan autentikasi.`,
        });
      }
      closeFormModal();
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan pengguna.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmHardDelete() {
    if (!deleteTarget) return;
    setFeedback(null);
    setDeleting(true);
    try {
      await apiFetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({
        type: 'success',
        text: `Akun ${deleteTarget.full_name} (${deleteTarget.email}) telah dihapus permanen (hard delete) hingga sistem autentikasi.`,
      });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus pengguna.',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell
      title="User Management"
      subtitle="Kelola seluruh pengguna, peran akses, sinkronisasi, dan hard delete hingga Supabase Authentication"
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
            <label htmlFor="searchUser" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cari Pengguna
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="searchUser"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama, email, atau NIP..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="filterRoleUser" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filter Peran
            </label>
            <select
              id="filterRoleUser"
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
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tabular-nums">
            Pengguna Terdaftar ({filtered.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-11 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Nama Lengkap</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">NIP</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Jabatan</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {u.full_name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-medium text-red-600">(Anda)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{u.email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {u.nip || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        {ROLE_LABELS[u.role]}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {u.jabatan || '—'}
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus permanen sampai Auth'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada pengguna yang cocok dengan filter pencarian.
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit Data User' : 'Tambah User Baru'}
              </h3>
              <button
                type="button"
                onClick={closeFormModal}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label htmlFor="uName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="uName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati, S.Pd."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="uEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Login
                  </label>
                  <input
                    id="uEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkprimaunggul.sch.id"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="uRole" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Peran (Role)
                  </label>
                  <select
                    id="uRole"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-red-600 focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="uNip" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    id="uNip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19890211..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="uJabatan" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jabatan / Mapel (Opsional)
                  </label>
                  <input
                    id="uJabatan"
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Guru Produktif TKJ / Tata Usaha"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="uPass" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
                </label>
                <input
                  id="uPass"
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeFormModal}
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
                  <span>{editingUser ? 'Simpan Perubahan' : 'Buat User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Hapus Pengguna Secara Permanen?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Anda akan melakukan <strong>hard delete</strong> terhadap akun{' '}
              <strong className="text-slate-900">{deleteTarget.full_name}</strong> ({deleteTarget.email}).
              Data profil, riwayat absensi, dan kredensial di Supabase Authentication akan dihapus permanen dan tidak dapat dipulihkan.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmHardDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
