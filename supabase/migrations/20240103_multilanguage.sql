-- Cyber Claw Schema v1.2 — Multi-language support
-- PostgreSQL / Supabase Migration
--
-- The language column was previously restricted to ('id','en'). Cyber Claw now
-- offers a broader language picker (English default, Indonesian, and many more
-- that fall back to English). Drop the restrictive CHECK constraint and allow
-- any valid BCP-47 primary subtag.

alter table user_settings drop constraint if exists user_settings_language_check;

alter table user_settings
  add constraint user_settings_language_check
  check (language ~ '^[a-z]{2}$');

-- English is now the default for brand-new sessions.
alter table user_settings alter column language set default 'en';
