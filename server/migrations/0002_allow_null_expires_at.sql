-- Allow null values for expires_at in access_tokens table
ALTER TABLE access_tokens ALTER COLUMN expires_at DROP NOT NULL;
