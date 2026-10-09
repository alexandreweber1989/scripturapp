-- Spaced-repetition schedule for memorizing favorite verses
-- (see src/domain/memory/srs.ts). User content, so the owner may write it.
alter table public.verse_annotations
  add column review jsonb check (review is null or jsonb_typeof(review) = 'object');
