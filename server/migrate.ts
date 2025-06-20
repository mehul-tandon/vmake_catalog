import { pool } from './db';

// Embedded migrations - these are included in the bundle
const migrations = [
  {
    filename: '001_initial_schema.sql',
    sql: `-- Initial database schema for VMake Catalog
-- This creates the base tables for users, products, and wishlists

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "whatsapp_number" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "is_admin" BOOLEAN DEFAULT FALSE,
  "is_primary_admin" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS "products" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "length" REAL NOT NULL DEFAULT 0,
  "breadth" REAL NOT NULL DEFAULT 0,
  "height" REAL NOT NULL DEFAULT 0,
  "finish" TEXT NOT NULL,
  "material" TEXT DEFAULT '' NOT NULL,
  "image_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Wishlists table
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

-- User sessions table for express-session
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_users_whatsapp" ON "users"("whatsapp_number");
CREATE INDEX IF NOT EXISTS "idx_products_code" ON "products"("code");
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products"("category");
CREATE INDEX IF NOT EXISTS "idx_products_finish" ON "products"("finish");
CREATE INDEX IF NOT EXISTS "idx_products_material" ON "products"("material");
CREATE INDEX IF NOT EXISTS "idx_wishlists_user_id" ON "wishlists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_wishlists_product_id" ON "wishlists"("product_id");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_expire" ON "user_sessions"("expire");`
  },
  {
    filename: '002_add_product_images_and_feedback.sql',
    sql: `-- Add multiple images and description to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_product_id ON feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_feedback_is_approved ON feedback(is_approved);
CREATE INDEX IF NOT EXISTS idx_feedback_is_published ON feedback(is_published);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`
  },
  {
    filename: '003_update_dimensions_to_decimal.sql',
    sql: `-- Migration to change product dimensions from integer to real (decimal)
-- This allows storing decimal values like 91.5 instead of truncating to 91

-- Update the column types to support decimal values
ALTER TABLE products
  ALTER COLUMN length TYPE REAL,
  ALTER COLUMN breadth TYPE REAL,
  ALTER COLUMN height TYPE REAL;

-- Add a comment to document the change
COMMENT ON COLUMN products.length IS 'Product length in cm (supports decimal values)';
COMMENT ON COLUMN products.breadth IS 'Product breadth in cm (supports decimal values)';
COMMENT ON COLUMN products.height IS 'Product height in cm (supports decimal values)';`
  },
  {
    filename: '004_add_security_tables.sql',
    sql: `-- Add security tables for token-based access and OTP verification
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
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_expires_at" ON "otp_verifications"("expires_at");`
  },
  {
    filename: '005_add_city_to_users.sql',
    sql: `-- Add city field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;`
  },
  {
    filename: '006_add_profile_completed.sql',
    sql: `-- Add profile_completed field to users table
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
  AND LENGTH(TRIM("city")) > 0;`
  }
];

export async function runMigrations(): Promise<void> {
  if (!pool) {
    console.log('No database pool available, skipping migrations');
    return;
  }

  try {
    console.log('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const executedResult = await pool.query('SELECT filename FROM migrations ORDER BY id');
    const executedMigrations = new Set(executedResult.rows.map((row: any) => row.filename));

    console.log(`Found ${migrations.length} embedded migrations`);

    // Execute pending migrations
    for (const migration of migrations) {
      if (executedMigrations.has(migration.filename)) {
        console.log(`Migration ${migration.filename} already executed, skipping`);
        continue;
      }

      console.log(`Executing migration: ${migration.filename}`);

      // Execute migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Execute the migration SQL
        await client.query(migration.sql);

        // Record the migration as executed
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [migration.filename]
        );

        await client.query('COMMIT');
        console.log(`Migration ${migration.filename} executed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration ${migration.filename} failed:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  if (!pool) {
    console.log('No database pool available, skipping database initialization');
    return;
  }

  try {
    console.log('Initializing database...');
    
    // Run migrations first
    await runMigrations();
    
    // Check if we need to create a primary admin
    const adminCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_primary_admin = true'
    );
    
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('Creating primary admin user...');
      
      const adminWhatsApp = process.env.ADMIN_WHATSAPP || '+918882636296';
      await pool.query(`
        INSERT INTO users (name, whatsapp_number, password, is_admin, is_primary_admin)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (whatsapp_number) DO UPDATE SET
          is_admin = true,
          is_primary_admin = true
      `, ['Admin User', adminWhatsApp, null, true, true]);
      
      console.log(`Primary admin created with WhatsApp: ${adminWhatsApp}`);
    } else {
      console.log('Primary admin already exists');
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
