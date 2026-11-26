import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig, UserProfile } from '../types';

const TOKEN_STORAGE_KEY = 'smk_prima_unggul_token';

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let cachedSupabase: SupabaseClient | null = null;

export function getSupabaseClient(url?: string | null, anonKey?: string | null): SupabaseClient | null {
  const targetUrl = url || ENV_SUPABASE_URL;
  const targetKey = anonKey || ENV_SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return null;
  if (!cachedSupabase) {
    cachedSupabase = createClient(targetUrl, targetKey);
  }
  return cachedSupabase;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function inferJurusan(kelas: string): string | null {
  const upper = kelas.toUpperCase();
  for (const code of ['TKJ', 'DKV', 'MPLB', 'AK', 'BC', 'BD']) {
    if (upper.includes(code)) return code;
  }
  return null;
}

async function fallbackDirectSupabase<T>(url: string, options: RequestInit): Promise<T | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const parsed = new URL(url, window.location.origin);
  const pathname = parsed.pathname;

  if (pathname === '/api/config' && method === 'GET') {
    let hasUsers = false;
    const { data: rpcExists, error: rpcErr } = await sb.rpc('has_any_user');
    if (!rpcErr && typeof rpcExists === 'boolean') {
      hasUsers = rpcExists;
    } else {
      const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true });
      hasUsers = (count ?? 0) > 0;
    }
    return {
      supabaseEnabled: true,
      supabaseUrl: ENV_SUPABASE_URL,
      supabaseAnonKey: ENV_SUPABASE_ANON_KEY,
      hasUsers,
    } as T;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const { data, error } = await sb.auth.signInWithPassword({
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || ''),
    });
    if (error || !data.session || !data.user) {
      throw new Error(error?.message || 'Email atau kata sandi salah.');
    }
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const user: UserProfile = profile || {
      id: data.user.id,
      email: data.user.email || '',
      full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Pengguna',
      nip: data.user.user_metadata?.nip || null,
      role: data.user.user_metadata?.role || 'tenaga_kependidikan',
      jabatan: data.user.user_metadata?.jabatan || null,
      created_at: data.user.created_at,
    };

    return { user, token: data.session.access_token, session: data.session } as T;
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const { data, error } = await sb.auth.signUp({
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || ''),
      options: {
        data: {
          full_name: String(body.full_name || '').trim(),
          nip: body.nip || null,
          jabatan: body.jabatan || null,
        },
      },
    });
    if (error || !data.user) {
      throw new Error(error?.message || 'Gagal mendaftar akun.');
    }
    if (!data.session) {
      throw new Error('Pendaftaran berhasil. Silakan verifikasi email Anda terlebih dahulu sebelum masuk.');
    }
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const user: UserProfile = profile || {
      id: data.user.id,
      email: data.user.email || '',
      full_name: String(body.full_name || '').trim(),
      nip: body.nip || null,
      role: 'admin',
      jabatan: body.jabatan || null,
      created_at: new Date().toISOString(),
    };

    return {
      user,
      token: data.session.access_token,
      session: data.session,
      isFirstUser: user.role === 'admin',
    } as T;
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new Error('Sesi berakhir.');
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!profile) throw new Error('Profil pengguna tidak ditemukan.');
    return { user: profile } as T;
  }

  if (pathname === '/api/users' && method === 'GET') {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return { users: data || [] } as T;
  }

  if (pathname === '/api/students' && method === 'GET') {
    const { data, error } = await sb
      .from('students')
      .select('*')
      .order('kelas', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return { students: data || [] } as T;
  }

  if (pathname === '/api/students' && method === 'POST') {
    const { data: authData } = await sb.auth.getUser();
    const { data, error } = await sb
      .from('students')
      .insert({
        nis: String(body.nis).trim(),
        nama: String(body.nama).trim(),
        kelas: String(body.kelas).trim(),
        jurusan: inferJurusan(String(body.kelas)),
        created_by: authData.user?.id || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { student: data } as T;
  }

  if (pathname === '/api/students/bulk' && method === 'POST') {
    const { data: authData } = await sb.auth.getUser();
    const rows = (body.items || []).map((i: { nis: string; nama: string; kelas: string }) => ({
      nis: i.nis.trim(),
      nama: i.nama.trim(),
      kelas: i.kelas.trim(),
      jurusan: inferJurusan(i.kelas),
      created_by: authData.user?.id || null,
    }));
    const { data, error } = await sb.from('students').upsert(rows, { onConflict: 'nis' }).select();
    if (error) throw new Error(error.message);
    return { students: data || [] } as T;
  }

  if (pathname.startsWith('/api/students/') && method === 'PATCH') {
    const id = pathname.split('/').pop()!;
    const { data, error } = await sb
      .from('students')
      .update({
        nis: String(body.nis).trim(),
        nama: String(body.nama).trim(),
        kelas: String(body.kelas).trim(),
        jurusan: inferJurusan(String(body.kelas)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { student: data } as T;
  }

  if (pathname.startsWith('/api/students/') && method === 'DELETE') {
    const id = pathname.split('/').pop()!;
    const { error } = await sb.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { deleted: true } as T;
  }

  if (pathname === '/api/employee-attendance' && method === 'GET') {
    const { data: authData } = await sb.auth.getUser();
    const scope = parsed.searchParams.get('scope');
    const from = parsed.searchParams.get('from');
    const to = parsed.searchParams.get('to');
    let query = sb
      .from('employee_attendance')
      .select('*, profile:profiles(full_name, email, role, nip, jabatan)')
      .order('tanggal', { ascending: false });
    if (scope !== 'all' && authData.user) {
      query = query.eq('user_id', authData.user.id);
    }
    if (from) query = query.gte('tanggal', from);
    if (to) query = query.lte('tanggal', to);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { records: data || [] } as T;
  }

  if (pathname === '/api/employee-attendance' && method === 'POST') {
    const { data: authData } = await sb.auth.getUser();
    if (!authData.user) throw new Error('Sesi tidak ditemukan.');
    const today = body.tanggal || new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);
    const { data: existing } = await sb
      .from('employee_attendance')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('tanggal', today)
      .maybeSingle();

    if (body.action === 'checkout') {
      if (!existing) throw new Error('Anda belum melakukan absen masuk hari ini.');
      const { data, error } = await sb
        .from('employee_attendance')
        .update({ jam_pulang: body.jam_pulang || nowTime, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*, profile:profiles(full_name, email, role, nip, jabatan)')
        .single();
      if (error) throw new Error(error.message);
      return { record: data } as T;
    }

    const st = body.status || 'hadir';
    const { data, error } = await sb
      .from('employee_attendance')
      .upsert(
        {
          user_id: authData.user.id,
          tanggal: today,
          status: st,
          jam_masuk: st === 'hadir' ? body.jam_masuk || existing?.jam_masuk || nowTime : null,
          jam_pulang: body.jam_pulang ?? existing?.jam_pulang ?? null,
          catatan: body.catatan ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tanggal' }
      )
      .select('*, profile:profiles(full_name, email, role, nip, jabatan)')
      .single();
    if (error) throw new Error(error.message);
    return { record: data } as T;
  }

  if (pathname === '/api/student-attendance' && method === 'GET') {
    const tanggal = parsed.searchParams.get('tanggal');
    const from = parsed.searchParams.get('from');
    const to = parsed.searchParams.get('to');
    let query = sb
      .from('student_attendance')
      .select('*, student:students(nis, nama, kelas, jurusan), recorder:profiles(full_name)')
      .order('tanggal', { ascending: false });
    if (tanggal) query = query.eq('tanggal', tanggal);
    if (from) query = query.gte('tanggal', from);
    if (to) query = query.lte('tanggal', to);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { records: data || [] } as T;
  }

  if (pathname === '/api/student-attendance/batch' && method === 'POST') {
    const { data: authData } = await sb.auth.getUser();
    const rows = (body.entries || []).map((e: { student_id: string; status: string; catatan?: string }) => ({
      student_id: e.student_id,
      tanggal: body.tanggal,
      status: e.status,
      catatan: e.catatan || null,
      recorded_by: authData.user?.id || null,
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await sb
      .from('student_attendance')
      .upsert(rows, { onConflict: 'student_id,tanggal' })
      .select();
    if (error) throw new Error(error.message);
    return { records: data || [] } as T;
  }

  if (pathname === '/api/dashboard/summary' && method === 'GET') {
    const { data: authData } = await sb.auth.getUser();
    if (!authData.user) throw new Error('Sesi berakhir.');
    const today = new Date().toISOString().slice(0, 10);
    const { data: myToday } = await sb
      .from('employee_attendance')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('tanggal', today)
      .maybeSingle();
    const { data: myRecent } = await sb
      .from('employee_attendance')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('tanggal', { ascending: false })
      .limit(7);
    const { count: stCount } = await sb.from('students').select('id', { count: 'exact', head: true });
    const { count: empCount } = await sb.from('profiles').select('id', { count: 'exact', head: true });
    const { data: stAtt } = await sb.from('student_attendance').select('status').eq('tanggal', today);
    const { data: empAtt } = await sb.from('employee_attendance').select('status').eq('tanggal', today);

    return {
      today,
      myTodayAttendance: myToday || null,
      myRecentAttendance: myRecent || [],
      totalStudents: stCount ?? 0,
      totalEmployees: empCount ?? 0,
      todayEmployeesPresent: (empAtt || []).filter((r) => r.status === 'hadir').length,
      todayStudentsPresent: (stAtt || []).filter((r) => r.status === 'hadir').length,
      todayStudentsTotalRecorded: stAtt?.length ?? 0,
    } as T;
  }

  return null;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 404 && url.startsWith('/api/')) {
    const direct = await fallbackDirectSupabase<T>(url, options);
    if (direct !== null) {
      return direct;
    }
    throw new Error(
      'Endpoint server /api tidak ditemukan (404). Pastikan vercel.json & folder api/ ikut ter-deploy atau isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || `Permintaan gagal (${response.status})`);
  }
  return payload as T;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  return apiFetch<AppConfig>('/api/config');
}
