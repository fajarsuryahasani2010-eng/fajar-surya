import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const hasServiceRole = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let supabaseAdmin: SupabaseClient | null = null;
let supabasePublic: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

if (hasServiceRole) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getUserScopedSupabase(token: string): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// ============================================================================
// Local JSON Store (Fallback jika env Supabase belum diisi)
// ============================================================================
const DATA_DIR = process.env.VERCEL
  ? '/tmp/smk-prima-unggul-data'
  : path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'smk-prima-unggul-local-secret-key';

interface LocalUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  nip: string | null;
  role: 'admin' | 'guru' | 'tenaga_kependidikan';
  jabatan: string | null;
  created_at: string;
}

interface LocalStudent {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jurusan: string | null;
  created_at: string;
}

interface LocalEmployeeAttendance {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: 'hadir' | 'izin' | 'sakit' | 'dinas_luar';
  catatan: string | null;
  created_at: string;
}

interface LocalStudentAttendance {
  id: string;
  student_id: string;
  tanggal: string;
  status: 'hadir' | 'sakit' | 'izin' | 'alpa';
  catatan: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface LocalStore {
  users: LocalUser[];
  students: LocalStudent[];
  employee_attendance: LocalEmployeeAttendance[];
  student_attendance: LocalStudentAttendance[];
}

function readLocalStore(): LocalStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial: LocalStore = {
      users: [],
      students: [],
      employee_attendance: [],
      student_attendance: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as LocalStore;
  } catch {
    return { users: [], students: [], employee_attendance: [], student_attendance: [] };
  }
}

function writeLocalStore(data: LocalStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signToken(payload: { userId: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      userId: string;
      exp: number;
    };
    if (Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

function sanitizeUser(u: LocalUser) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    nip: u.nip,
    role: u.role,
    jabatan: u.jabatan,
    created_at: u.created_at,
  };
}

interface AuthRequest extends Request {
  currentUser?: {
    id: string;
    email: string;
    full_name: string;
    nip: string | null;
    role: 'admin' | 'guru' | 'tenaga_kependidikan';
    jabatan: string | null;
    created_at: string;
  };
  dbClient?: SupabaseClient;
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' });
    return;
  }

  if (isSupabaseConfigured && supabasePublic) {
    const client = supabaseAdmin || getUserScopedSupabase(token)!;
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Token Supabase tidak valid atau kedaluwarsa.' });
      return;
    }

    let { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile && supabaseAdmin) {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      const fallbackRole =
        count === 0 ? 'admin' : data.user.user_metadata?.role || 'tenaga_kependidikan';
      const { data: inserted } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email || '',
          full_name:
            data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Pengguna',
          nip: data.user.user_metadata?.nip || null,
          role: fallbackRole,
          jabatan: data.user.user_metadata?.jabatan || null,
        })
        .select()
        .single();
      profile = inserted;
    }

    if (!profile) {
      profile = {
        id: data.user.id,
        email: data.user.email || '',
        full_name:
          data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Pengguna',
        nip: data.user.user_metadata?.nip || null,
        role: (data.user.user_metadata?.role as 'admin' | 'guru' | 'tenaga_kependidikan') || 'tenaga_kependidikan',
        jabatan: data.user.user_metadata?.jabatan || null,
        created_at: data.user.created_at || new Date().toISOString(),
      };
    }

    req.currentUser = profile;
    req.dbClient = client;
    next();
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
    return;
  }
  const store = readLocalStore();
  const user = store.users.find((u) => u.id === decoded.userId);
  if (!user) {
    res.status(401).json({ error: 'Akun pengguna sudah dihapus.' });
    return;
  }
  req.currentUser = sanitizeUser(user);
  next();
}

function requireRole(roles: Array<'admin' | 'guru' | 'tenaga_kependidikan'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk tindakan ini.' });
      return;
    }
    next();
  };
}

function inferJurusan(kelas: string): string | null {
  const upper = kelas.toUpperCase();
  const codes = ['TKJ', 'DKV', 'MPLB', 'AK', 'BC', 'BD'];
  for (const code of codes) {
    if (upper.includes(code)) return code;
  }
  return null;
}

export function createApiApp() {
  const app = express();
  app.use(express.json());

  // 1. Public Config & First-User Detection
  app.get('/api/config', async (_req, res) => {
    try {
      if (isSupabaseConfigured) {
        let hasUsers = false;
        if (supabaseAdmin) {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          hasUsers = (count ?? 0) > 0;
        } else if (supabasePublic) {
          const { data: rpcExists, error: rpcErr } = await supabasePublic.rpc('has_any_user');
          if (!rpcErr && typeof rpcExists === 'boolean') {
            hasUsers = rpcExists;
          } else {
            const { count } = await supabasePublic
              .from('profiles')
              .select('id', { count: 'exact', head: true });
            hasUsers = (count ?? 0) > 0;
          }
        }
        res.json({
          supabaseEnabled: true,
          supabaseUrl: SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
          hasUsers,
        });
        return;
      }

      const store = readLocalStore();
      res.json({
        supabaseEnabled: false,
        supabaseUrl: null,
        supabaseAnonKey: null,
        hasUsers: store.users.length > 0,
      });
    } catch {
      res.status(500).json({ error: 'Gagal memuat konfigurasi server.' });
    }
  });

  // 2. Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, full_name, nip, jabatan, role } = req.body as {
        email?: string;
        password?: string;
        full_name?: string;
        nip?: string;
        jabatan?: string;
        role?: 'admin' | 'guru' | 'tenaga_kependidikan';
      };

      if (!email || !password || !full_name) {
        res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        return;
      }

      if (isSupabaseConfigured && supabasePublic) {
        const cleanEmail = email.trim().toLowerCase();

        if (supabaseAdmin) {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1,
          });
          const isFirstUser = (count ?? 0) === 0 && (authList?.users?.length ?? 0) === 0;
          const assignedRole = isFirstUser
            ? 'admin'
            : role && ['guru', 'tenaga_kependidikan'].includes(role)
            ? role
            : 'tenaga_kependidikan';

          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: full_name.trim(),
              nip: nip?.trim() || null,
              jabatan: jabatan?.trim() || (isFirstUser ? 'Administrator Sistem' : null),
              role: assignedRole,
            },
          });

          if (createErr || !created.user) {
            res.status(400).json({ error: createErr?.message || 'Gagal membuat akun di Supabase.' });
            return;
          }

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: created.user.id,
              email: cleanEmail,
              full_name: full_name.trim(),
              nip: nip?.trim() || null,
              role: assignedRole,
              jabatan: jabatan?.trim() || (isFirstUser ? 'Administrator Sistem' : null),
            })
            .select()
            .single();

          const { data: signedIn, error: signInErr } = await supabasePublic.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInErr || !signedIn.session) {
            res.status(201).json({
              user: profile,
              token: null,
              isFirstUser,
            });
            return;
          }

          res.status(201).json({
            user: profile,
            token: signedIn.session.access_token,
            session: signedIn.session,
            isFirstUser,
          });
          return;
        }

        // Anon-key signup fallback (mengandalkan trigger handle_new_user di schema.sql)
        const { data: signUpData, error: signUpErr } = await supabasePublic.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: full_name.trim(),
              nip: nip?.trim() || null,
              jabatan: jabatan?.trim() || null,
            },
          },
        });

        if (signUpErr || !signUpData.user) {
          res.status(400).json({ error: signUpErr?.message || 'Gagal mendaftar di Supabase.' });
          return;
        }

        if (!signUpData.session) {
          res.status(201).json({
            user: null,
            token: null,
            isFirstUser: false,
            message: 'Pendaftaran berhasil. Silakan cek email untuk verifikasi sebelum login.',
          });
          return;
        }

        const scoped = getUserScopedSupabase(signUpData.session.access_token)!;
        const { data: profile } = await scoped
          .from('profiles')
          .select('*')
          .eq('id', signUpData.user.id)
          .maybeSingle();

        res.status(201).json({
          user: profile || {
            id: signUpData.user.id,
            email: cleanEmail,
            full_name: full_name.trim(),
            nip: nip?.trim() || null,
            role: 'admin',
            jabatan: jabatan?.trim() || null,
            created_at: new Date().toISOString(),
          },
          token: signUpData.session.access_token,
          session: signUpData.session,
          isFirstUser: profile?.role === 'admin',
        });
        return;
      }

      // Local Mode
      const store = readLocalStore();
      const normalizedEmail = email.trim().toLowerCase();
      if (store.users.some((u) => u.email === normalizedEmail)) {
        res.status(409).json({ error: 'Email sudah terdaftar di sistem.' });
        return;
      }

      const isFirstUser = store.users.length === 0;
      const assignedRole: 'admin' | 'guru' | 'tenaga_kependidikan' = isFirstUser
        ? 'admin'
        : role && ['guru', 'tenaga_kependidikan'].includes(role)
        ? role
        : 'tenaga_kependidikan';

      const newUser: LocalUser = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password_hash: hashPassword(password),
        full_name: full_name.trim(),
        nip: nip?.trim() || null,
        role: assignedRole,
        jabatan: jabatan?.trim() || (isFirstUser ? 'Administrator Sistem' : null),
        created_at: new Date().toISOString(),
      };

      store.users.push(newUser);
      writeLocalStore(store);

      const token = signToken({ userId: newUser.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      res.status(201).json({
        user: sanitizeUser(newUser),
        token,
        isFirstUser,
      });
    } catch {
      res.status(500).json({ error: 'Terjadi kesalahan saat mendaftarkan akun.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
        return;
      }

      if (isSupabaseConfigured && supabasePublic) {
        const { data, error } = await supabasePublic.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error || !data.session || !data.user) {
          res.status(401).json({ error: 'Email atau kata sandi salah.' });
          return;
        }
        const reader = supabaseAdmin || getUserScopedSupabase(data.session.access_token)!;
        const { data: profile } = await reader
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        res.json({
          user: profile || {
            id: data.user.id,
            email: data.user.email || email.trim().toLowerCase(),
            full_name:
              data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Pengguna',
            nip: data.user.user_metadata?.nip || null,
            role: data.user.user_metadata?.role || 'tenaga_kependidikan',
            jabatan: data.user.user_metadata?.jabatan || null,
            created_at: data.user.created_at,
          },
          token: data.session.access_token,
          session: data.session,
        });
        return;
      }

      const store = readLocalStore();
      const user = store.users.find((u) => u.email === email.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password_hash)) {
        res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
        return;
      }

      const token = signToken({ userId: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      res.json({
        user: sanitizeUser(user),
        token,
      });
    } catch {
      res.status(500).json({ error: 'Gagal memproses login.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.currentUser });
  });

  // 3. User Management (Admin Only - Full Sync & Hard Delete to Supabase Auth)
  app.get('/api/users', requireAuth, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      if (isSupabaseConfigured && req.dbClient) {
        const { data: profiles, error } = await req.dbClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.json({ users: profiles || [] });
        return;
      }

      const store = readLocalStore();
      res.json({ users: store.users.map(sanitizeUser) });
    } catch {
      res.status(500).json({ error: 'Gagal mengambil daftar pengguna.' });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { email, password, full_name, nip, role, jabatan } = req.body as {
        email?: string;
        password?: string;
        full_name?: string;
        nip?: string;
        role?: 'admin' | 'guru' | 'tenaga_kependidikan';
        jabatan?: string;
      };

      if (!email || !password || !full_name || !role) {
        res.status(400).json({ error: 'Nama, email, kata sandi, dan peran wajib diisi.' });
        return;
      }
      if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
        res.status(400).json({ error: 'Peran pengguna tidak valid.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        return;
      }

      if (isSupabaseConfigured) {
        if (!supabaseAdmin) {
          res.status(400).json({
            error:
              'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi pada server untuk membuat user langsung ke Supabase Authentication.',
          });
          return;
        }
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name.trim(),
            nip: nip?.trim() || null,
            role,
            jabatan: jabatan?.trim() || null,
          },
        });
        if (createErr || !created.user) {
          res.status(400).json({ error: createErr?.message || 'Gagal membuat user di Supabase Auth.' });
          return;
        }
        const { data: profile, error: profErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: created.user.id,
            email: email.trim().toLowerCase(),
            full_name: full_name.trim(),
            nip: nip?.trim() || null,
            role,
            jabatan: jabatan?.trim() || null,
          })
          .select()
          .single();
        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }
        res.status(201).json({ user: profile });
        return;
      }

      const store = readLocalStore();
      const normalizedEmail = email.trim().toLowerCase();
      if (store.users.some((u) => u.email === normalizedEmail)) {
        res.status(409).json({ error: 'Email sudah digunakan akun lain.' });
        return;
      }
      const newUser: LocalUser = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password_hash: hashPassword(password),
        full_name: full_name.trim(),
        nip: nip?.trim() || null,
        role,
        jabatan: jabatan?.trim() || null,
        created_at: new Date().toISOString(),
      };
      store.users.push(newUser);
      writeLocalStore(store);
      res.status(201).json({ user: sanitizeUser(newUser) });
    } catch {
      res.status(500).json({ error: 'Gagal menambahkan pengguna baru.' });
    }
  });

  app.patch('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { email, password, full_name, nip, role, jabatan } = req.body as {
        email?: string;
        password?: string;
        full_name?: string;
        nip?: string;
        role?: 'admin' | 'guru' | 'tenaga_kependidikan';
        jabatan?: string;
      };

      if (isSupabaseConfigured) {
        if (!supabaseAdmin) {
          res.status(400).json({
            error:
              'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi pada server untuk menyinkronkan perubahan ke Supabase Authentication.',
          });
          return;
        }
        const authUpdates: {
          email?: string;
          password?: string;
          user_metadata?: Record<string, unknown>;
        } = {
          user_metadata: {
            full_name: full_name?.trim(),
            nip: nip?.trim() || null,
            role,
            jabatan: jabatan?.trim() || null,
          },
        };
        if (email) authUpdates.email = email.trim().toLowerCase();
        if (password && password.length >= 6) authUpdates.password = password;

        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
        if (authErr) {
          res.status(400).json({ error: authErr.message });
          return;
        }

        const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (email !== undefined) profileUpdate.email = email.trim().toLowerCase();
        if (full_name !== undefined) profileUpdate.full_name = full_name.trim();
        if (nip !== undefined) profileUpdate.nip = nip.trim() || null;
        if (role !== undefined) profileUpdate.role = role;
        if (jabatan !== undefined) profileUpdate.jabatan = jabatan.trim() || null;

        const { data: updated, error: profErr } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', id)
          .select()
          .single();

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }
        res.json({ user: updated });
        return;
      }

      const store = readLocalStore();
      const idx = store.users.findIndex((u) => u.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        return;
      }
      const existing = store.users[idx];
      if (email && email.trim().toLowerCase() !== existing.email) {
        if (store.users.some((u) => u.email === email.trim().toLowerCase() && u.id !== id)) {
          res.status(409).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
          return;
        }
        existing.email = email.trim().toLowerCase();
      }
      if (password && password.length >= 6) {
        existing.password_hash = hashPassword(password);
      }
      if (full_name !== undefined) existing.full_name = full_name.trim();
      if (nip !== undefined) existing.nip = nip.trim() || null;
      if (role !== undefined && ['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
        existing.role = role;
      }
      if (jabatan !== undefined) existing.jabatan = jabatan.trim() || null;

      store.users[idx] = existing;
      writeLocalStore(store);
      res.json({ user: sanitizeUser(existing) });
    } catch {
      res.status(500).json({ error: 'Gagal memperbarui data pengguna.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (req.currentUser?.id === id) {
        res.status(400).json({ error: 'Anda tidak dapat menghapus akun yang sedang aktif digunakan.' });
        return;
      }

      if (isSupabaseConfigured) {
        if (!supabaseAdmin) {
          res.status(400).json({
            error:
              'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi pada server untuk melakukan hard delete hingga Supabase Authentication.',
          });
          return;
        }
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id, false);
        if (authErr) {
          res.status(400).json({ error: authErr.message });
          return;
        }
        await supabaseAdmin.from('profiles').delete().eq('id', id);
        res.json({ deleted: true, id });
        return;
      }

      const store = readLocalStore();
      const before = store.users.length;
      store.users = store.users.filter((u) => u.id !== id);
      if (store.users.length === before) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        return;
      }
      store.employee_attendance = store.employee_attendance.filter((a) => a.user_id !== id);
      writeLocalStore(store);
      res.json({ deleted: true, id });
    } catch {
      res.status(500).json({ error: 'Gagal menghapus pengguna secara permanen.' });
    }
  });

  // 4. Data Siswa Routes
  app.get('/api/students', requireAuth, requireRole(['admin', 'guru']), async (req: AuthRequest, res) => {
    try {
      if (isSupabaseConfigured && req.dbClient) {
        const { data, error } = await req.dbClient
          .from('students')
          .select('*')
          .order('kelas', { ascending: true })
          .order('nama', { ascending: true });
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.json({ students: data || [] });
        return;
      }

      const store = readLocalStore();
      const sorted = [...store.students].sort(
        (a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama)
      );
      res.json({ students: sorted });
    } catch {
      res.status(500).json({ error: 'Gagal memuat data siswa.' });
    }
  });

  app.post('/api/students', requireAuth, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const { nis, nama, kelas } = req.body as { nis?: string; nama?: string; kelas?: string };
      if (!nis || !nama || !kelas) {
        res.status(400).json({ error: 'NIS, nama siswa, dan kelas wajib diisi.' });
        return;
      }
      const jurusan = inferJurusan(kelas);

      if (isSupabaseConfigured && req.dbClient) {
        const { data, error } = await req.dbClient
          .from('students')
          .insert({
            nis: nis.trim(),
            nama: nama.trim(),
            kelas: kelas.trim(),
            jurusan,
            created_by: req.currentUser?.id || null,
          })
          .select()
          .single();
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.status(201).json({ student: data });
        return;
      }

      const store = readLocalStore();
      if (store.students.some((s) => s.nis === nis.trim())) {
        res.status(409).json({ error: `NIS ${nis.trim()} sudah terdaftar.` });
        return;
      }
      const student: LocalStudent = {
        id: crypto.randomUUID(),
        nis: nis.trim(),
        nama: nama.trim(),
        kelas: kelas.trim(),
        jurusan,
        created_at: new Date().toISOString(),
      };
      store.students.push(student);
      writeLocalStore(store);
      res.status(201).json({ student });
    } catch {
      res.status(500).json({ error: 'Gagal menambahkan data siswa.' });
    }
  });

  app.post('/api/students/bulk', requireAuth, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const { items } = req.body as { items?: Array<{ nis: string; nama: string; kelas: string }> };
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Daftar siswa tidak boleh kosong.' });
        return;
      }

      if (isSupabaseConfigured && req.dbClient) {
        const rows = items.map((item) => ({
          nis: item.nis.trim(),
          nama: item.nama.trim(),
          kelas: item.kelas.trim(),
          jurusan: inferJurusan(item.kelas),
          created_by: req.currentUser?.id || null,
        }));
        const { data, error } = await req.dbClient
          .from('students')
          .upsert(rows, { onConflict: 'nis' })
          .select();
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.status(201).json({ students: data || [] });
        return;
      }

      const store = readLocalStore();
      const inserted: LocalStudent[] = [];
      for (const item of items) {
        const cleanNis = item.nis.trim();
        if (!store.students.some((s) => s.nis === cleanNis)) {
          const st: LocalStudent = {
            id: crypto.randomUUID(),
            nis: cleanNis,
            nama: item.nama.trim(),
            kelas: item.kelas.trim(),
            jurusan: inferJurusan(item.kelas),
            created_at: new Date().toISOString(),
          };
          store.students.push(st);
          inserted.push(st);
        }
      }
      writeLocalStore(store);
      res.status(201).json({ students: inserted });
    } catch {
      res.status(500).json({ error: 'Gagal mengimpor data siswa.' });
    }
  });

  app.patch('/api/students/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { nis, nama, kelas } = req.body as { nis?: string; nama?: string; kelas?: string };
      if (!nis || !nama || !kelas) {
        res.status(400).json({ error: 'NIS, nama siswa, dan kelas wajib diisi.' });
        return;
      }
      const jurusan = inferJurusan(kelas);

      if (isSupabaseConfigured && req.dbClient) {
        const { data, error } = await req.dbClient
          .from('students')
          .update({
            nis: nis.trim(),
            nama: nama.trim(),
            kelas: kelas.trim(),
            jurusan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.json({ student: data });
        return;
      }

      const store = readLocalStore();
      const idx = store.students.findIndex((s) => s.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
        return;
      }
      if (store.students.some((s) => s.nis === nis.trim() && s.id !== id)) {
        res.status(409).json({ error: 'NIS sudah digunakan siswa lain.' });
        return;
      }
      store.students[idx] = {
        ...store.students[idx],
        nis: nis.trim(),
        nama: nama.trim(),
        kelas: kelas.trim(),
        jurusan,
      };
      writeLocalStore(store);
      res.json({ student: store.students[idx] });
    } catch {
      res.status(500).json({ error: 'Gagal memperbarui data siswa.' });
    }
  });

  app.delete('/api/students/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (isSupabaseConfigured && req.dbClient) {
        const { error } = await req.dbClient.from('students').delete().eq('id', id);
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.json({ deleted: true });
        return;
      }

      const store = readLocalStore();
      store.students = store.students.filter((s) => s.id !== id);
      store.student_attendance = store.student_attendance.filter((a) => a.student_id !== id);
      writeLocalStore(store);
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Gagal menghapus data siswa.' });
    }
  });

  // 5. Absensi Karyawan Routes
  app.get('/api/employee-attendance', requireAuth, async (req: AuthRequest, res) => {
    try {
      const scope = req.query.scope as string | undefined;
      const dateFrom = req.query.from as string | undefined;
      const dateTo = req.query.to as string | undefined;
      const isAll = scope === 'all' && req.currentUser?.role === 'admin';

      if (isSupabaseConfigured && req.dbClient) {
        let query = req.dbClient
          .from('employee_attendance')
          .select('*, profile:profiles(full_name, email, role, nip, jabatan)')
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false });

        if (!isAll) {
          query = query.eq('user_id', req.currentUser!.id);
        }
        if (dateFrom) query = query.gte('tanggal', dateFrom);
        if (dateTo) query = query.lte('tanggal', dateTo);

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.json({ records: data || [] });
        return;
      }

      const store = readLocalStore();
      let list = store.employee_attendance.filter((r) => isAll || r.user_id === req.currentUser!.id);
      if (dateFrom) list = list.filter((r) => r.tanggal >= dateFrom);
      if (dateTo) list = list.filter((r) => r.tanggal <= dateTo);

      const enriched = list
        .map((r) => {
          const p = store.users.find((u) => u.id === r.user_id);
          return {
            ...r,
            profile: p
              ? { full_name: p.full_name, email: p.email, role: p.role, nip: p.nip, jabatan: p.jabatan }
              : undefined,
          };
        })
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));

      res.json({ records: enriched });
    } catch {
      res.status(500).json({ error: 'Gagal memuat riwayat absensi karyawan.' });
    }
  });

  app.post('/api/employee-attendance', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { tanggal, jam_masuk, jam_pulang, status, catatan, action } = req.body as {
        tanggal?: string;
        jam_masuk?: string | null;
        jam_pulang?: string | null;
        status?: 'hadir' | 'izin' | 'sakit' | 'dinas_luar';
        catatan?: string | null;
        action?: 'checkin' | 'checkout' | 'submit';
      };

      const today = tanggal || new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toTimeString().slice(0, 8);
      const userId = req.currentUser!.id;

      if (isSupabaseConfigured && req.dbClient) {
        const { data: existing } = await req.dbClient
          .from('employee_attendance')
          .select('*')
          .eq('user_id', userId)
          .eq('tanggal', today)
          .maybeSingle();

        if (action === 'checkout') {
          if (!existing) {
            res.status(400).json({ error: 'Anda belum melakukan absen masuk hari ini.' });
            return;
          }
          const { data, error } = await req.dbClient
            .from('employee_attendance')
            .update({
              jam_pulang: jam_pulang || nowTime,
              catatan: catatan ?? existing.catatan,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select('*, profile:profiles(full_name, email, role, nip, jabatan)')
            .single();
          if (error) {
            res.status(500).json({ error: error.message });
            return;
          }
          res.json({ record: data });
          return;
        }

        const payload = {
          user_id: userId,
          tanggal: today,
          status: status || 'hadir',
          jam_masuk: (status || 'hadir') === 'hadir' ? jam_masuk || existing?.jam_masuk || nowTime : null,
          jam_pulang: jam_pulang ?? existing?.jam_pulang ?? null,
          catatan: catatan ?? null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await req.dbClient
          .from('employee_attendance')
          .upsert(payload, { onConflict: 'user_id,tanggal' })
          .select('*, profile:profiles(full_name, email, role, nip, jabatan)')
          .single();

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.status(201).json({ record: data });
        return;
      }

      const store = readLocalStore();
      const idx = store.employee_attendance.findIndex((r) => r.user_id === userId && r.tanggal === today);

      if (action === 'checkout') {
        if (idx === -1) {
          res.status(400).json({ error: 'Anda belum melakukan absen masuk hari ini.' });
          return;
        }
        store.employee_attendance[idx].jam_pulang = jam_pulang || nowTime;
        if (catatan !== undefined) store.employee_attendance[idx].catatan = catatan;
        writeLocalStore(store);
        res.json({ record: store.employee_attendance[idx] });
        return;
      }

      const resolvedStatus = status || 'hadir';
      if (idx >= 0) {
        const existing = store.employee_attendance[idx];
        store.employee_attendance[idx] = {
          ...existing,
          status: resolvedStatus,
          jam_masuk: resolvedStatus === 'hadir' ? jam_masuk || existing.jam_masuk || nowTime : null,
          jam_pulang: jam_pulang ?? existing.jam_pulang,
          catatan: catatan ?? existing.catatan,
        };
        writeLocalStore(store);
        res.json({ record: store.employee_attendance[idx] });
        return;
      }

      const newRec: LocalEmployeeAttendance = {
        id: crypto.randomUUID(),
        user_id: userId,
        tanggal: today,
        jam_masuk: resolvedStatus === 'hadir' ? jam_masuk || nowTime : null,
        jam_pulang: jam_pulang || null,
        status: resolvedStatus,
        catatan: catatan || null,
        created_at: new Date().toISOString(),
      };
      store.employee_attendance.push(newRec);
      writeLocalStore(store);
      res.status(201).json({ record: newRec });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan absensi karyawan.' });
    }
  });

  // 6. Absensi Siswa Routes
  app.get('/api/student-attendance', requireAuth, requireRole(['admin', 'guru']), async (req: AuthRequest, res) => {
    try {
      const tanggal = req.query.tanggal as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const kelas = req.query.kelas as string | undefined;

      if (isSupabaseConfigured && req.dbClient) {
        let query = req.dbClient
          .from('student_attendance')
          .select('*, student:students(nis, nama, kelas, jurusan), recorder:profiles(full_name)')
          .order('tanggal', { ascending: false });

        if (tanggal) query = query.eq('tanggal', tanggal);
        if (from) query = query.gte('tanggal', from);
        if (to) query = query.lte('tanggal', to);

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        const filtered = kelas
          ? (data || []).filter((item: { student?: { kelas?: string } }) => item.student?.kelas === kelas)
          : data || [];
        res.json({ records: filtered });
        return;
      }

      const store = readLocalStore();
      let records = store.student_attendance;
      if (tanggal) records = records.filter((r) => r.tanggal === tanggal);
      if (from) records = records.filter((r) => r.tanggal >= from);
      if (to) records = records.filter((r) => r.tanggal <= to);

      const enriched = records
        .map((r) => {
          const student = store.students.find((s) => s.id === r.student_id);
          const recorder = store.users.find((u) => u.id === r.recorded_by);
          return {
            ...r,
            student: student
              ? { nis: student.nis, nama: student.nama, kelas: student.kelas, jurusan: student.jurusan }
              : undefined,
            recorder: recorder ? { full_name: recorder.full_name } : undefined,
          };
        })
        .filter((r) => (!kelas ? true : r.student?.kelas === kelas))
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

      res.json({ records: enriched });
    } catch {
      res.status(500).json({ error: 'Gagal memuat data absensi siswa.' });
    }
  });

  app.post('/api/student-attendance/batch', requireAuth, requireRole(['admin', 'guru']), async (req: AuthRequest, res) => {
    try {
      const { tanggal, entries } = req.body as {
        tanggal?: string;
        entries?: Array<{
          student_id: string;
          status: 'hadir' | 'sakit' | 'izin' | 'alpa';
          catatan?: string | null;
        }>;
      };

      if (!tanggal || !Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: 'Tanggal dan daftar absensi siswa wajib diisi.' });
        return;
      }

      if (isSupabaseConfigured && req.dbClient) {
        const rows = entries.map((e) => ({
          student_id: e.student_id,
          tanggal,
          status: e.status,
          catatan: e.catatan || null,
          recorded_by: req.currentUser?.id || null,
          updated_at: new Date().toISOString(),
        }));
        const { data, error } = await req.dbClient
          .from('student_attendance')
          .upsert(rows, { onConflict: 'student_id,tanggal' })
          .select();
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.status(201).json({ records: data || [] });
        return;
      }

      const store = readLocalStore();
      const saved: LocalStudentAttendance[] = [];
      for (const entry of entries) {
        const idx = store.student_attendance.findIndex(
          (r) => r.student_id === entry.student_id && r.tanggal === tanggal
        );
        if (idx >= 0) {
          store.student_attendance[idx] = {
            ...store.student_attendance[idx],
            status: entry.status,
            catatan: entry.catatan || null,
            recorded_by: req.currentUser?.id || null,
          };
          saved.push(store.student_attendance[idx]);
        } else {
          const rec: LocalStudentAttendance = {
            id: crypto.randomUUID(),
            student_id: entry.student_id,
            tanggal,
            status: entry.status,
            catatan: entry.catatan || null,
            recorded_by: req.currentUser?.id || null,
            created_at: new Date().toISOString(),
          };
          store.student_attendance.push(rec);
          saved.push(rec);
        }
      }
      writeLocalStore(store);
      res.status(201).json({ records: saved });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan absensi siswa.' });
    }
  });

  // 7. Dashboard Overview Stats
  app.get('/api/dashboard/summary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const role = req.currentUser!.role;

      if (isSupabaseConfigured && req.dbClient) {
        const { data: myToday } = await req.dbClient
          .from('employee_attendance')
          .select('*')
          .eq('user_id', req.currentUser!.id)
          .eq('tanggal', today)
          .maybeSingle();

        let totalStudents = 0;
        let totalEmployees = 0;
        let todayEmployeesPresent = 0;
        let todayStudentsPresent = 0;
        let todayStudentsTotalRecorded = 0;

        if (role === 'admin' || role === 'guru') {
          const { count: stCount } = await req.dbClient
            .from('students')
            .select('id', { count: 'exact', head: true });
          totalStudents = stCount ?? 0;

          const { data: stAtt } = await req.dbClient
            .from('student_attendance')
            .select('status')
            .eq('tanggal', today);
          todayStudentsTotalRecorded = stAtt?.length ?? 0;
          todayStudentsPresent = (stAtt || []).filter((r) => r.status === 'hadir').length;
        }

        if (role === 'admin') {
          const { count: empCount } = await req.dbClient
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          totalEmployees = empCount ?? 0;

          const { data: empAtt } = await req.dbClient
            .from('employee_attendance')
            .select('status')
            .eq('tanggal', today);
          todayEmployeesPresent = (empAtt || []).filter((r) => r.status === 'hadir').length;
        }

        const { data: myRecent } = await req.dbClient
          .from('employee_attendance')
          .select('*')
          .eq('user_id', req.currentUser!.id)
          .order('tanggal', { ascending: false })
          .limit(7);

        res.json({
          today,
          myTodayAttendance: myToday || null,
          myRecentAttendance: myRecent || [],
          totalStudents,
          totalEmployees,
          todayEmployeesPresent,
          todayStudentsPresent,
          todayStudentsTotalRecorded,
        });
        return;
      }

      const store = readLocalStore();
      const myTodayAttendance =
        store.employee_attendance.find((r) => r.user_id === req.currentUser!.id && r.tanggal === today) || null;
      const myRecentAttendance = store.employee_attendance
        .filter((r) => r.user_id === req.currentUser!.id)
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
        .slice(0, 7);

      const todayStAtt = store.student_attendance.filter((r) => r.tanggal === today);
      const todayEmpAtt = store.employee_attendance.filter((r) => r.tanggal === today);

      res.json({
        today,
        myTodayAttendance,
        myRecentAttendance,
        totalStudents: role === 'admin' || role === 'guru' ? store.students.length : 0,
        totalEmployees: role === 'admin' ? store.users.length : 0,
        todayEmployeesPresent: role === 'admin' ? todayEmpAtt.filter((r) => r.status === 'hadir').length : 0,
        todayStudentsPresent: role === 'admin' || role === 'guru' ? todayStAtt.filter((r) => r.status === 'hadir').length : 0,
        todayStudentsTotalRecorded: role === 'admin' || role === 'guru' ? todayStAtt.length : 0,
      });
    } catch {
      res.status(500).json({ error: 'Gagal memuat ringkasan dashboard.' });
    }
  });

  return app;
}
