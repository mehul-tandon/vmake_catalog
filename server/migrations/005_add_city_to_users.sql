-- Add city field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;