-- Add profile_completed field to users table
-- This migration adds support for tracking whether a user has completed their profile

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_completed" BOOLEAN DEFAULT FALSE;

-- Update existing users to mark profile as completed if they have name, whatsapp, and city
UPDATE "users" 
SET "profile_completed" = TRUE 
WHERE "name" IS NOT NULL 
  AND "whatsapp_number" IS NOT NULL 
  AND "city" IS NOT NULL 
  AND LENGTH(TRIM("name")) > 0 
  AND LENGTH(TRIM("whatsapp_number")) > 0 
  AND LENGTH(TRIM("city")) > 0;
