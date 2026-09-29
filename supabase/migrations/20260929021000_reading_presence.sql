create or replace function public.get_edition_reading_presence(
  p_edition_key text
)
returns table (
  user_id uuid,
  full_name text,
  nickname text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select distinct
    state.user_id,
    profile.full_name,
    profile.nickname,
    profile.avatar_url

  from public.books as book

  join public.user_book_state as state
    on state.book_id = book.id
   and state.reading_status = 'reading'

  left join public.profiles as profile
    on profile.id = state.user_id

  where
    book.edition_key = p_edition_key

    and exists (
      select 1
      from public.family_members as member

      where
        member.user_id = auth.uid()
        and member.family_id = book.family_id
    );
$$;

revoke all
on function public.get_edition_reading_presence(text)
from public;

grant execute
on function public.get_edition_reading_presence(text)
to authenticated;
