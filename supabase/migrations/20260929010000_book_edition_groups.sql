alter table public.books
  add column if not exists edition_key text,
  add column if not exists copy_number integer not null default 1;

update public.books
set edition_key = id::text
where edition_key is null;

alter table public.books
  alter column edition_key set not null;

create unique index if not exists books_family_edition_copy_unique
  on public.books (
    family_id,
    edition_key,
    copy_number
  );

create index if not exists books_family_edition_key_idx
  on public.books (
    family_id,
    edition_key
  );
