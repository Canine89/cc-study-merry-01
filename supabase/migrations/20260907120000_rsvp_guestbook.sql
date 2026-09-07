-- ===========================================================
-- 참석 회신(rsvp) · 방명록(guestbook)
--
-- 두 표 모두 회원가입 없이 익명(anon)으로 쓸 수 있게 열되,
-- RLS로 "할 수 있는 일"을 최소한으로 제한한다.
--   rsvp      : 넣기만 가능, 읽기 불가 (대시보드에서만 확인)
--   guestbook : 넣기 + 읽기 가능 (페이지에 최근 20개 표시)
-- ===========================================================

-- -----------------------------------------------------------
-- 참석 회신
-- -----------------------------------------------------------
create table if not exists public.rsvp (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  headcount   smallint    not null,
  meal        boolean     not null,
  created_at  timestamptz not null default now(),

  constraint rsvp_name_len      check (char_length(btrim(name)) between 1 and 20),
  constraint rsvp_headcount_rng check (headcount between 1 and 20)
);

comment on table  public.rsvp is '참석 회신 (화면에는 표시하지 않음)';
comment on column public.rsvp.headcount is '본인 포함 참석 인원';
comment on column public.rsvp.meal      is '식사 여부';

-- 같은 사람이 여러 번 회신하지 못하게 — 대소문자·공백 무시하고 이름 하나당 한 번
create unique index if not exists rsvp_name_once
  on public.rsvp (lower(btrim(name)));

-- -----------------------------------------------------------
-- 방명록
-- -----------------------------------------------------------
create table if not exists public.guestbook (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  message     text        not null,
  created_at  timestamptz not null default now(),

  constraint guestbook_name_len check (char_length(btrim(name))    between 1 and 20),
  constraint guestbook_msg_len  check (char_length(btrim(message)) between 1 and 200)
);

comment on table public.guestbook is '방명록 (페이지에 최근 20개 표시)';

create unique index if not exists guestbook_name_once
  on public.guestbook (lower(btrim(name)));

-- 최근 20개를 빠르게 뽑기 위한 정렬 인덱스
create index if not exists guestbook_created_at_desc
  on public.guestbook (created_at desc);

-- -----------------------------------------------------------
-- RLS
-- -----------------------------------------------------------
alter table public.rsvp      enable row level security;
alter table public.guestbook enable row level security;

-- rsvp: 누구나 넣을 수 있지만 아무도 읽을 수 없다.
-- (select 정책을 만들지 않는 것이 곧 "읽기 금지"다)
drop policy if exists "누구나 참석 회신을 남길 수 있다" on public.rsvp;
create policy "누구나 참석 회신을 남길 수 있다"
  on public.rsvp for insert to anon, authenticated
  with check (true);

-- guestbook: 누구나 넣고, 누구나 읽는다.
drop policy if exists "누구나 방명록을 남길 수 있다" on public.guestbook;
create policy "누구나 방명록을 남길 수 있다"
  on public.guestbook for insert to anon, authenticated
  with check (true);

drop policy if exists "누구나 방명록을 읽을 수 있다" on public.guestbook;
create policy "누구나 방명록을 읽을 수 있다"
  on public.guestbook for select to anon, authenticated
  using (true);

-- 수정·삭제 정책은 만들지 않는다 → 익명 사용자는 고치거나 지울 수 없다.
