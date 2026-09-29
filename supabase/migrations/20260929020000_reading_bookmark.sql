alter table public.user_book_state
  add column if not exists bookmark_page integer,
  add column if not exists bookmark_updated_at timestamptz;

alter table public.user_book_state
  drop constraint if exists user_book_state_bookmark_page_check;

alter table public.user_book_state
  add constraint user_book_state_bookmark_page_check
  check (
    bookmark_page is null
    or bookmark_page >= 0
  );
