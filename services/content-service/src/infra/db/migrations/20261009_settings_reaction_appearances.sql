alter table settings
  add column reaction_appearances jsonb not null
  default '[{"kind":"laugh","presentation":"emoji","emoji":"😄"},{"kind":"heart","presentation":"emoji","emoji":"❤️"},{"kind":"thumb","presentation":"emoji","emoji":"👍"},{"kind":"fire","presentation":"emoji","emoji":"🔥"}]'::jsonb;

alter table settings
  add constraint settings_reaction_appearances_chk
  check (
    jsonb_typeof(reaction_appearances) = 'array'
    and jsonb_array_length(reaction_appearances) = 4
    and reaction_appearances->0->>'kind' = 'laugh'
    and reaction_appearances->1->>'kind' = 'heart'
    and reaction_appearances->2->>'kind' = 'thumb'
    and reaction_appearances->3->>'kind' = 'fire'
    and reaction_appearances->0->>'presentation' in ('emoji', 'image')
    and reaction_appearances->1->>'presentation' in ('emoji', 'image')
    and reaction_appearances->2->>'presentation' in ('emoji', 'image')
    and reaction_appearances->3->>'presentation' in ('emoji', 'image')
  );
