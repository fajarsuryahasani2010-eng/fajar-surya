export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type EmployeeAttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'dinas_luar';
export type StudentAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  role: UserRole;
  jabatan: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jurusan: string | null;
  created_at: string;
}

export interface EmployeeAttendanceRecord {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: EmployeeAttendanceStatus;
  catatan: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    role: UserRole;
    nip: string | null;
    jabatan: string | null;
  };
}

export interface StudentAttendanceRecord {
  id: string;
  student_id: string;
  tanggal: string;
  status: StudentAttendanceStatus;
  catatan: string | null;
  recorded_by: string | null;
  created_at: string;
  student?: {
    nis: string;
    nama: string;
    kelas: string;
    jurusan: string | null;
  };
  recorder?: {
    full_name: string;
  };
}

export interface AppConfig {
  supabaseEnabled: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  hasUsers: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

export const JURUSAN_LIST = [
  {
    kode: 'TKJ',
    nama: 'Teknik Komputer dan Jaringan',
    rumpun: 'Teknologi Informasi & Komunikasi',
    deskripsi: 'Infrastruktur jaringan enterprise, administrasi server Linux/Windows, keamanan siber, dan routing switching.',
  },
  {
    kode: 'DKV',
    nama: 'Desain Komunikasi Visual',
    rumpun: 'Teknologi Informasi & Komunikasi',
    deskripsi: 'Desain grafis editorial, identitas merek, ilustrasi digital, fotografi komersial, dan antarmuka produk digital.',
  },
  {
    kode: 'BC',
    nama: 'Broadcasting dan Perfilman',
    rumpun: 'Teknologi Informasi & Komunikasi',
    deskripsi: 'Produksi siaran televisi dan radio, sinematografi, penyutradaraan, tata cahaya studio, dan pascaproduksi film.',
  },
  {
    kode: 'AK',
    nama: 'Akuntansi',
    rumpun: 'Keuangan & Akuntansi',
    deskripsi: 'Pembukuan perusahaan jasa dan dagang, perpajakan terapan, audit dasar, dan sistem informasi akuntansi digital.',
  },
  {
    kode: 'MPLB',
    nama: 'Manajemen Perkantoran dan Layanan Bisnis',
    rumpun: 'Bisnis & Manajemen',
    deskripsi: 'Korespondensi eksekutif, tata kelola kearsipan elektronik, administrasi perkantoran modern, dan pelayanan prima.',
  },
  {
    kode: 'BD',
    nama: 'Bisnis Digital',
    rumpun: 'Bisnis & Manajemen',
    deskripsi: 'Pemasaran digital berbasis data, pengelolaan niaga elektronik (e-commerce), riset pasar, dan kewirausahaan ritel.',
  },
] as const;

export const RUMPUN_JURUSAN = [
  {
    nomor: '01',
    nama: 'Rumpun Teknologi & Media Kreatif',
    kodeList: ['TKJ', 'DKV', 'BC'],
    ringkasan: 'Memadukan rekayasa infrastruktur jaringan, desain visual terapan, dan produksi penyiaran standar industri.',
  },
  {
    nomor: '02',
    nama: 'Rumpun Manajemen & Bisnis Digital',
    kodeList: ['MPLB', 'BD'],
    ringkasan: 'Mencetak tenaga administrasi eksekutif dan praktisi niaga elektronik yang tangkas mengelola operasional bisnis modern.',
  },
  {
    nomor: '03',
    nama: 'Rumpun Akuntansi & Keuangan',
    kodeList: ['AK'],
    ringkasan: 'Membekali ketelitian pelaporan keuangan, kepatuhan perpajakan, dan penguasaan perangkat lunak akuntansi.',
  },
] as const;

export const DEFAULT_KELAS_OPTIONS = [
  'X TKJ 1', 'X DKV 1', 'X AK 1', 'X BC 1', 'X MPLB 1', 'X BD 1',
  'XI TKJ 1', 'XI DKV 1', 'XI AK 1', 'XI BC 1', 'XI MPLB 1', 'XI BD 1',
  'XII TKJ 1', 'XII DKV 1', 'XII AK 1', 'XII BC 1', 'XII MPLB 1', 'XII BD 1',
];
