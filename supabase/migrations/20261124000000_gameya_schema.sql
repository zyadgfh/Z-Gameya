-- تطبيق «الجمعية» — مخطط قاعدة البيانات (Phase 0 + Phase 1)
-- القاعدة الذهبية: لا يُخزَّن مال ولا يُحوَّل داخل التطبيق. التتبع فقط.

-- ============ الأدوار ============
-- organizer: منشئ الجمعية | member: عضو | owner: مالك التطبيق
create type user_role as enum ('organizer', 'member', 'owner');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  display_name text,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- ============ الجمعيات ============
create type cycle_type as enum ('weekly', 'monthly', 'custom');
create type gameya_status as enum ('draft', 'active', 'completed', 'cancelled');
create type payout_order_mode as enum ('lottery', 'manual');

create table public.gameyas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  installment numeric(12,2) not null check (installment > 0),
  member_count int not null check (member_count >= 2),
  cycle_type cycle_type not null,
  custom_days int check (custom_days is null or custom_days > 0),
  start_date date not null,
  payout_order_mode payout_order_mode not null default 'lottery',
  grace_days int not null default 3 check (grace_days >= 0),
  fee_rate numeric(5,4) not null default 0.005 check (fee_rate >= 0 and fee_rate <= 1),
  invite_code text unique not null default substr(md5(gen_random_uuid()::text), 1, 8),
  invite_expires_at timestamptz,
  status gameya_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ============ الأعضاء والأدوار ============
-- كل عضو له دور قبض واحد (cycle_index). الدور الفارغ = لا يوجد صف بعد.
create table public.gameya_members (
  id uuid primary key default gen_random_uuid(),
  gameya_id uuid not null references public.gameyas(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  phone text not null,
  display_name text,
  cycle_index int not null check (cycle_index >= 1),
  is_organizer boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (gameya_id, cycle_index),
  unique (gameya_id, phone)
);

-- ============ الأقساط (جدول الدفعات) ============
create type payment_status as enum ('pending', 'claimed', 'confirmed', 'rejected', 'late');

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  gameya_id uuid not null references public.gameyas(id) on delete cascade,
  member_id uuid not null references public.gameya_members(id) on delete cascade,
  cycle_index int not null,
  due_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  status payment_status not null default 'pending',
  receipt_url text, -- رابط صورة الإيصال في Storage
  claimed_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (gameya_id, member_id, cycle_index)
);

-- ============ القبض ============
create type payout_status as enum ('scheduled', 'fee_pending', 'ready', 'paid', 'blocked');

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  gameya_id uuid not null references public.gameyas(id) on delete cascade,
  member_id uuid not null references public.gameya_members(id) on delete cascade,
  cycle_index int not null,
  amount numeric(12,2) not null check (amount >= 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  fee_paid boolean not null default false,
  status payout_status not null default 'scheduled',
  paid_at timestamptz,
  unique (gameya_id, cycle_index)
);

-- ============ الدعوات (Phase 2) ============
create type invite_status as enum ('pending', 'accepted', 'rejected', 'expired', 'queued');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  gameya_id uuid not null references public.gameyas(id) on delete cascade,
  cycle_index int not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invitee_phone text not null,
  status invite_status not null default 'pending',
  queue_position int,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ============ الغرامات (Phase 3) ============
create table public.fines (
  id uuid primary key default gen_random_uuid(),
  gameya_id uuid not null references public.gameyas(id) on delete cascade,
  member_id uuid not null references public.gameya_members(id) on delete cascade,
  installment_id uuid references public.installments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============ الإشعارات داخل التطبيق ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ سجل التدقيق ============
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  gameya_id uuid references public.gameyas(id) on delete set null,
  action text not null, -- payment_confirmed | payment_rejected | order_changed | invite_accepted ...
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============ RLS: العضو لا يرى إلا جمعياته ============
alter table public.profiles enable row level security;
alter table public.gameyas enable row level security;
alter table public.gameya_members enable row level security;
alter table public.installments enable row level security;
alter table public.payouts enable row level security;
alter table public.invitations enable row level security;
alter table public.fines enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- profiles: كل واحد يقرأ/يعدل ملفه
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- gameyas: المنظم يرى جمعياته، والعضو يرى الجمعيات المنضم لها
create policy "gameya access" on public.gameyas
  for all using (
    organizer_id = auth.uid()
    or exists (select 1 from public.gameya_members m where m.gameya_id = gameyas.id and m.user_id = auth.uid())
  ) with check (organizer_id = auth.uid());

create policy "members access" on public.gameya_members
  for all using (
    user_id = auth.uid()
    or exists (select 1 from public.gameyas g where g.id = gameya_members.gameya_id and g.organizer_id = auth.uid())
    or exists (select 1 from public.gameya_members m2 where m2.gameya_id = gameya_members.gameya_id and m2.user_id = auth.uid())
  );

create policy "installments access" on public.installments
  for all using (
    exists (select 1 from public.gameya_members m where m.id = installments.member_id and m.user_id = auth.uid())
    or exists (select 1 from public.gameyas g where g.id = installments.gameya_id and g.organizer_id = auth.uid())
  );

create policy "payouts access" on public.payouts
  for all using (
    exists (select 1 from public.gameya_members m where m.id = payouts.member_id and m.user_id = auth.uid())
    or exists (select 1 from public.gameyas g where g.id = payouts.gameya_id and g.organizer_id = auth.uid())
  );

create policy "invitations access" on public.invitations
  for all using (
    invited_by = auth.uid()
    or exists (select 1 from public.gameyas g where g.id = invitations.gameya_id and g.organizer_id = auth.uid())
  );

create policy "fines access" on public.fines
  for all using (
    exists (select 1 from public.gameya_members m where m.id = fines.member_id and m.user_id = auth.uid())
    or exists (select 1 from public.gameyas g where g.id = fines.gameya_id and g.organizer_id = auth.uid())
  );

create policy "own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit_log: للقراءة فقط للمنظم والمالك
create policy "audit read" on public.audit_log
  for select using (
    exists (select 1 from public.gameyas g where g.id = audit_log.gameya_id and g.organizer_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
  );
create policy "audit insert" on public.audit_log
  for insert with check (auth.uid() = actor_id);

-- ============ دالة حجز الدور (Phase 2) — التسابق يُحسم في DB ============
-- أول من يقبل يفوز؛ الثاني يرجع queued. القفل عبر unique constraint + FOR UPDATE
create or replace function public.accept_invitation(p_invitation_id uuid)
returns text language plpgsql security definer as $$
declare
  v_inv public.invitations%rowtype;
  v_existing int;
  v_queue int;
begin
  select * into v_inv from public.invitations where id = p_invitation_id for update;
  if not found then return 'not_found'; end if;
  if v_inv.status <> 'pending' then return v_inv.status::text; end if;
  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = p_invitation_id;
    return 'expired';
  end if;

  -- هل الدور محجوز أصلاً؟
  select count(*) into v_existing from public.gameya_members
   where gameya_id = v_inv.gameya_id and cycle_index = v_inv.cycle_index;

  if v_existing = 0 then
    update public.invitations set status = 'accepted' where id = p_invitation_id;
    return 'accepted';
  else
    select coalesce(max(queue_position), 0) + 1 into v_queue from public.invitations
     where gameya_id = v_inv.gameya_id and cycle_index = v_inv.cycle_index and status = 'queued';
    update public.invitations set status = 'queued', queue_position = v_queue where id = p_invitation_id;
    return 'queued';
  end if;
end;
$$;

-- ============ Storage: إيصالات ============
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts own" on storage.objects
  for all using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
