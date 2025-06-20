-- Add security tables for token-based access and OTP verification
-- This migration adds support for one-time tokens, device binding, and OTP verification

-- Add email field to users table if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Access tokens for one-time links
CREATE TABLE IF NOT EXISTS "access_tokens" (
  "id" SERIAL PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "is_used" BOOLEAN DEFAULT FALSE,
  "ip_address" TEXT,
  "device_fingerprint" TEXT,
  "expires_at" TIMESTAMP NOT NULL,
  "used_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Device sessions for IP/device binding
CREATE TABLE IF NOT EXISTS "device_sessions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_id" INTEGER REFERENCES "access_tokens"("id") ON DELETE CASCADE,
  "ip_address" TEXT NOT NULL,
  "device_fingerprint" TEXT NOT NULL,
  "user_agent" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "last_access_at" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- OTP verifications
CREATE TABLE IF NOT EXISTS "otp_verifications" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "token_id" INTEGER REFERENCES "access_tokens"("id") ON DELETE CASCADE,
  "otp_code" TEXT NOT NULL,
  "attempts" INTEGER DEFAULT 0,
  "is_verified" BOOLEAN DEFAULT FALSE,
  "expires_at" TIMESTAMP NOT NULL,
  "verified_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_access_tokens_token" ON "access_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_access_tokens_email" ON "access_tokens"("email");
CREATE INDEX IF NOT EXISTS "idx_access_tokens_user_id" ON "access_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_access_tokens_expires_at" ON "access_tokens"("expires_at");

CREATE INDEX IF NOT EXISTS "idx_device_sessions_user_id" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_device_sessions_token_id" ON "device_sessions"("token_id");
CREATE INDEX IF NOT EXISTS "idx_device_sessions_ip_address" ON "device_sessions"("ip_address");
CREATE INDEX IF NOT EXISTS "idx_device_sessions_device_fingerprint" ON "device_sessions"("device_fingerprint");

CREATE INDEX IF NOT EXISTS "idx_otp_verifications_email" ON "otp_verifications"("email");
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_token_id" ON "otp_verifications"("token_id");
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_otp_code" ON "otp_verifications"("otp_code");
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_expires_at" ON "otp_verifications"("expires_at");
