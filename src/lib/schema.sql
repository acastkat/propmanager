-- ============================================================
-- PROPMANAGER — SCHEMA COMPLETO DE SUPABASE
-- Última actualización: junio 2026
-- Este archivo permite recrear la base de datos desde cero
-- si alguna vez hay que migrar a un proyecto nuevo de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- Perfiles de usuario
create table profiles (
  id uuid references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'owner',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Propiedades
create table properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  address text,
  type text not null,
  status text not null default 'vacia',
  floor text,
  unit text,
  services text[],
  is_incomplete boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Contratos de alquiler
create table contracts (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  tenant_name text not null,
  start_date date not null,
  end_date date not null,
  monthly_rent numeric not null,
  update_index text,
  update_months integer,
  last_update_date date,
  last_update_amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Pagos de alquiler
create table payments (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  contract_id uuid references contracts(id),
  type text not null,
  period text,
  amount numeric not null,
  payment_date date,
  payment_method text,
  status text not null default 'pendiente',
  notes text,
  receipt_number text,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Servicios (luz, gas, etc.)
create table services (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  type text not null,
  period_from date,
  period_to date,
  due_date date,
  amount numeric,
  paid_by_owner boolean default false,
  owner_payment_date date,
  paid_by_tenant boolean default false,
  tenant_payment_date date,
  status text not null default 'pendiente',
  invoice_url text,
  receipt_url text,
  receipt_number text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Historial de actualizaciones de monto de contrato
create table contract_updates (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references contracts(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  previous_amount numeric not null,
  new_amount numeric not null,
  update_date date not null,
  index_used text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================================
-- 2. TRIGGER — Crear perfil automáticamente al registrar usuario
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'owner'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 3. FUNCIÓN AUXILIAR — Verificar si el usuario actual es admin
-- (evita recursión infinita en las policies de profiles)
-- ============================================================

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================
-- 4. ROW LEVEL SECURITY — Activar en todas las tablas
-- ============================================================

alter table profiles         enable row level security;
alter table properties       enable row level security;
alter table contracts        enable row level security;
alter table payments         enable row level security;
alter table services         enable row level security;
alter table contract_updates enable row level security;

-- ── PROFILES ────────────────────────────────────────────────
create policy "select_own_profile"
  on profiles for select
  using (auth.uid() = id);

create policy "update_own_profile"
  on profiles for update
  using (auth.uid() = id);

create policy "insert_own_profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Admin ve todos los perfiles (usa la función para evitar recursión)
create policy "admin_select_all_profiles"
  on profiles for select
  using (is_admin());

-- ── PROPERTIES ──────────────────────────────────────────────
create policy "Usuario ve sus propiedades"
  on properties for select
  using (auth.uid() = user_id);

create policy "Usuario inserta sus propiedades"
  on properties for insert
  with check (auth.uid() = user_id);

create policy "Usuario modifica sus propiedades"
  on properties for update
  using (auth.uid() = user_id);

create policy "Usuario elimina sus propiedades"
  on properties for delete
  using (auth.uid() = user_id);

-- ── CONTRACTS ───────────────────────────────────────────────
create policy "Usuario ve sus contratos"
  on contracts for select
  using (
    exists (
      select 1 from properties
      where id = contracts.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario inserta sus contratos"
  on contracts for insert
  with check (
    exists (
      select 1 from properties
      where id = contracts.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario modifica sus contratos"
  on contracts for update
  using (
    exists (
      select 1 from properties
      where id = contracts.property_id and user_id = auth.uid()
    )
  );

-- ── PAYMENTS ────────────────────────────────────────────────
create policy "Usuario ve sus pagos"
  on payments for select
  using (
    exists (
      select 1 from properties
      where id = payments.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario inserta sus pagos"
  on payments for insert
  with check (
    exists (
      select 1 from properties
      where id = payments.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario modifica sus pagos"
  on payments for update
  using (
    exists (
      select 1 from properties
      where id = payments.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario elimina sus pagos"
  on payments for delete
  using (
    exists (
      select 1 from properties
      where id = payments.property_id and user_id = auth.uid()
    )
  );

-- ── SERVICES ────────────────────────────────────────────────
create policy "Usuario ve sus servicios"
  on services for select
  using (
    exists (
      select 1 from properties
      where id = services.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario inserta sus servicios"
  on services for insert
  with check (
    exists (
      select 1 from properties
      where id = services.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario modifica sus servicios"
  on services for update
  using (
    exists (
      select 1 from properties
      where id = services.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario elimina sus servicios"
  on services for delete
  using (
    exists (
      select 1 from properties
      where id = services.property_id and user_id = auth.uid()
    )
  );

-- ── CONTRACT UPDATES ────────────────────────────────────────
create policy "Usuario ve sus actualizaciones"
  on contract_updates for select
  using (
    exists (
      select 1 from properties
      where id = contract_updates.property_id and user_id = auth.uid()
    )
  );

create policy "Usuario inserta sus actualizaciones"
  on contract_updates for insert
  with check (
    exists (
      select 1 from properties
      where id = contract_updates.property_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. GRANTS — Permisos base a nivel de PostgreSQL
-- CRÍTICO: sin esto, RLS no alcanza — da "permission denied"
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles         to authenticated;
grant select, insert, update, delete on public.properties       to authenticated;
grant select, insert, update, delete on public.contracts        to authenticated;
grant select, insert, update, delete on public.payments         to authenticated;
grant select, insert, update, delete on public.services         to authenticated;
grant select, insert, update, delete on public.contract_updates to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- ============================================================
-- 6. STORAGE — Buckets y políticas para archivos
-- (Los buckets "invoices" y "receipts" se crean manualmente
-- desde el dashboard de Supabase → Storage → New bucket,
-- ambos como NO públicos. Después correr esto:)
-- ============================================================

create policy "Usuario sube sus facturas"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuario ve sus facturas"
  on storage.objects for select
  using (
    bucket_id = 'invoices' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuario sube sus comprobantes"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuario ve sus comprobantes"
  on storage.objects for select
  using (
    bucket_id = 'receipts' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 7. CREAR PRIMER USUARIO ADMIN (hacer manualmente)
-- ============================================================
-- 1. Dashboard → Authentication → Users → Add user → Create new user
--    (activar "Auto Confirm User")
-- 2. Copiar el UID generado
-- 3. Ejecutar:
--
-- update profiles
-- set role = 'admin', full_name = 'Tu Nombre'
-- where id = 'EL-UID-AQUI';
--
-- (El perfil ya se crea solo gracias al trigger handle_new_user,
-- por eso es UPDATE y no INSERT)

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================