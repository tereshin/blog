-- Каталог реакций: произвольный набор с именем и статусом вместо четырёх фиксированных видов.

alter table settings drop constraint settings_reaction_appearances_chk;

update settings
set reaction_appearances = (
  select jsonb_agg(
    jsonb_strip_nulls(
      jsonb_build_object(
        'kind', item ->> 'kind',
        'label', coalesce(
          nullif(btrim(item ->> 'label'), ''),
          case item ->> 'kind'
            when 'laugh' then case settings.locale when 'en' then 'Laugh' when 'sr' then 'Smeh' else 'Смех' end
            when 'heart' then case settings.locale when 'en' then 'Heart' when 'sr' then 'Srce' else 'Сердце' end
            when 'thumb' then case settings.locale when 'en' then 'Thumbs up' when 'sr' then 'Palac nagore' else 'Палец вверх' end
            when 'fire' then case settings.locale when 'en' then 'Fire' when 'sr' then 'Vatra' else 'Огонь' end
            else coalesce(nullif(btrim(item ->> 'kind'), ''), 'Реакция')
          end
        ),
        'status', case when item ->> 'status' in ('active', 'retired') then item ->> 'status' else 'active' end,
        'presentation', item ->> 'presentation',
        'emoji', case when item ->> 'presentation' = 'emoji' then item ->> 'emoji' else null end,
        'image_url', case when item ->> 'presentation' = 'image' then item ->> 'image_url' else null end
      )
    )
    order by ordinality
  )
  from jsonb_array_elements(settings.reaction_appearances) with ordinality as element(item, ordinality)
);

create or replace function reaction_appearances_valid(value jsonb) returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(value) = 'array'
    and jsonb_array_length(value) between 1 and 100
    and not exists (
      select 1
      from jsonb_array_elements(value) as item
      where coalesce(item ->> 'kind', '') = ''
        or (
          item ->> 'kind' not in ('laugh', 'heart', 'thumb', 'fire')
          and item ->> 'kind' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        )
        or char_length(btrim(coalesce(item ->> 'label', ''))) not between 1 and 50
        or item ->> 'status' not in ('active', 'retired')
        or item ->> 'presentation' not in ('emoji', 'image')
        or (item ->> 'presentation' = 'emoji' and coalesce(item ->> 'emoji', '') = '')
        or (item ->> 'presentation' = 'image' and coalesce(item ->> 'image_url', '') = '')
    )
    and (
      select count(*)
      from jsonb_array_elements(value) as item
      where item ->> 'status' = 'active'
    ) between 1 and 20
    and (
      select count(distinct item ->> 'kind')
      from jsonb_array_elements(value) as item
    ) = jsonb_array_length(value)
    and not exists (
      select 1
      from jsonb_array_elements(value) with ordinality as earlier(item, n)
      join jsonb_array_elements(value) with ordinality as later(item, n) on earlier.n < later.n
      where earlier.item ->> 'status' = 'retired'
        and later.item ->> 'status' = 'active'
    );
$$;

alter table settings
  alter column reaction_appearances set default '[{"kind":"heart","label":"Сердце","status":"active","presentation":"emoji","emoji":"❤️"},{"kind":"laugh","label":"Смех","status":"active","presentation":"emoji","emoji":"😄"},{"kind":"thumb","label":"Палец вверх","status":"active","presentation":"emoji","emoji":"👍"},{"kind":"fire","label":"Огонь","status":"active","presentation":"emoji","emoji":"🔥"}]'::jsonb;

alter table settings
  add constraint settings_reaction_appearances_chk
  check (reaction_appearances_valid(reaction_appearances));
