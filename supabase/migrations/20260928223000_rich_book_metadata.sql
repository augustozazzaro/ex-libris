alter table public.books
  add column if not exists series text,
  add column if not exists translators text[] default '{}',
  add column if not exists editors text[] default '{}',
  add column if not exists illustrators text[] default '{}',
  add column if not exists introductions text[] default '{}',
  add column if not exists format text,
  add column if not exists bibliographic_notes text;
