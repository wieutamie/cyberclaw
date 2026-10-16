-- Cyber Claw Schema v1.3 — Date format follows the locale
-- PostgreSQL / Supabase Migration
--
-- The date format is now derived automatically from the active UI locale
-- (e.g. `id` → 31/12/2024, `en` → 12/31/2024) instead of being a user setting.
-- Drop the now-unused column and its CHECK constraint.

alter table user_settings drop constraint if exists user_settings_date_format_check;

alter table user_settings drop column if exists date_format;
