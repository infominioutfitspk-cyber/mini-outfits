-- Migration: Add active_sort_preference to categories
-- Adds a column to store the admin's chosen sort preference per category
-- so the storefront can default to the same sort order.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS active_sort_preference TEXT DEFAULT 'manual';
