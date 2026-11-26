-- ============================================================================
-- SMK PRIMA UNGGUL - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Script ini idempoten (aman dijalankan ulang di SQL Editor Supabase).
-- ============================================================================

-- 1. Tabel Profil Karyawan / Pengguna (tersinkronisasi dengan auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  nip text,
  role text not null check (role in ('admin', 'guru', 'tenaga_kependidikan')),
  jabatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabel Data Siswa
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nama text not null,
  kelas text not null,
  jurusan text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabel Absensi Karyawan (Admin, Guru, Tenaga Kependidikan)
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null default current_date,
  jam_masuk time,
  jam_pulang time,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'dinas_luar')),
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tanggal)
);

-- 4. Tabel Absensi Siswa (Diisi oleh Guru / Admin)
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tanggal date not null default current_date,
  status text not null check (status in ('hadir', 'sakit', 'izin', 'alpa')),
  catatan text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, tanggal)
);

-- 5. Trigger Otomatis: User Pertama di Supabase Auth Menjadi 'admin'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
  assigned_role text;
begin
  select count(*) into user_count from public.profiles;

  if user_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'tenaga_kependidikan');
    if assigned_role not in ('admin', 'guru', 'tenaga_kependidikan') then
      assigned_role := 'tenaga_kependidikan';
    end if;
  end if;

  insert into public.profiles (id, email, full_name, nip, role, jabatan)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'nip', ''),
    assigned_role,
    nullif(new.raw_user_meta_data->>'jabatan', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    nip = coalesce(excluded.nip, public.profiles.nip),
    role = excluded.role,
    jabatan = coalesce(excluded.jabatan, public.profiles.jabatan),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Aktifkan Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

-- Helper function cek role user aktif & cek apakah sudah ada user terdaftar
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.has_any_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles);
$$;

grant execute on function public.has_any_user() to anon, authenticated;

-- RLS: profiles
drop policy if exists "Profiles readable by authenticated users" on public.profiles;
create policy "Profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.current_user_role() = 'admin')
  with check (auth.uid() = id or public.current_user_role() = 'admin');

-- RLS: students
drop policy if exists "Students readable by authenticated users" on public.students;
create policy "Students readable by authenticated users"
  on public.students for select
  to authenticated
  using (true);

drop policy if exists "Admin can manage students" on public.students;
create policy "Admin can manage students"
  on public.students for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- RLS: employee_attendance
drop policy if exists "Users see own attendance or admin sees all" on public.employee_attendance;
create policy "Users see own attendance or admin sees all"
  on public.employee_attendance for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Users can insert own employee attendance" on public.employee_attendance;
create policy "Users can insert own employee attendance"
  on public.employee_attendance for insert
  to authenticated
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Users can update own employee attendance" on public.employee_attendance;
create policy "Users can update own employee attendance"
  on public.employee_attendance for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

-- RLS: student_attendance
drop policy if exists "Admin and guru can read student attendance" on public.student_attendance;
create policy "Admin and guru can read student attendance"
  on public.student_attendance for select
  to authenticated
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin and guru can write student attendance" on public.student_attendance;
create policy "Admin and guru can write student attendance"
  on public.student_attendance for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin and guru can update student attendance" on public.student_attendance;
create policy "Admin and guru can update student attendance"
  on public.student_attendance for update
  to authenticated
  using (public.current_user_role() in ('admin', 'guru'))
  with check (public.current_user_role() in ('admin', 'guru'));
