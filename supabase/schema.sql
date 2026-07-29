-- Jalankan file ini di Supabase Dashboard -> SQL Editor -> New query -> Run
-- Aman dijalankan berkali-kali (pakai "if not exists").

-- 1. Profil pengguna, dibuat otomatis saat orang mendaftar
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  subscription_status text not null default 'free', -- 'free' | 'premium'
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Pengguna bisa baca profil sendiri"
  on profiles for select using (auth.uid() = id);
create policy "Pengguna bisa update profil sendiri"
  on profiles for update using (auth.uid() = id);

-- Buat baris profile otomatis tiap ada user baru daftar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Riwayat perhitungan
create table if not exists calculation_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  equip_key text not null,       -- mis. 'trafo', 'kha', 'motor'
  equip_label text not null,     -- mis. 'Trafo Daya'
  summary text,                  -- ringkasan singkat, mis. 'XLPE 3 Core 300 mm²'
  input_snapshot jsonb,          -- simpan nilai input untuk dibuka lagi nanti
  created_at timestamptz not null default now()
);

alter table calculation_history enable row level security;

create policy "Pengguna hanya lihat riwayat sendiri"
  on calculation_history for select using (auth.uid() = user_id);
create policy "Pengguna bisa tambah riwayat sendiri"
  on calculation_history for insert with check (auth.uid() = user_id);
create policy "Pengguna bisa hapus riwayat sendiri"
  on calculation_history for delete using (auth.uid() = user_id);

create index if not exists idx_history_user_created
  on calculation_history (user_id, created_at desc);

-- 3. Favorit
create table if not exists favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  equip_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, equip_key)
);

alter table favorites enable row level security;

create policy "Pengguna kelola favorit sendiri"
  on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
