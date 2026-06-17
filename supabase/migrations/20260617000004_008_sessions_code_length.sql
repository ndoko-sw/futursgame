-- Migration 008 — Allow session codes up to 8 characters (was 6)
ALTER TABLE sessions ALTER COLUMN code TYPE VARCHAR(8);
