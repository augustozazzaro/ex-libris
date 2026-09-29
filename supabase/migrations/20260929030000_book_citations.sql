create table if not exists public.book_citations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  family_id uuid not null
    references public.families(id)
    on delete cascade,

  edition_key text not null,

  quote_text text not null,

  page integer,

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint book_citations_page_check
    check (
      page is null
      or page >= 1
    )
);

create index if not exists book_citations_user_edition_idx
  on public.book_citations (
    user_id,
    family_id,
    edition_key,
    created_at desc
  );

alter table public.book_citations
  enable row level security;

drop policy if exists
  "Users can read own citations"
  on public.book_citations;

create policy
  "Users can read own citations"
on public.book_citations
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists
  "Users can insert own citations"
  on public.book_citations;

create policy
  "Users can insert own citations"
on public.book_citations
for insert
to authenticated
with check (
  user_id = auth.uid()

  and exists (
    select 1
    from public.family_members member

    where
      member.user_id = auth.uid()
      and member.family_id =
        book_citations.family_id
  )

  and exists (
    select 1
    from public.books book

    where
      book.family_id =
        book_citations.family_id
      and book.edition_key =
        book_citations.edition_key
  )
);

drop policy if exists
  "Users can update own citations"
  on public.book_citations;

create policy
  "Users can update own citations"
on public.book_citations
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

drop policy if exists
  "Users can delete own citations"
  on public.book_citations;

create policy
  "Users can delete own citations"
on public.book_citations
for delete
to authenticated
using (
  user_id = auth.uid()
);
