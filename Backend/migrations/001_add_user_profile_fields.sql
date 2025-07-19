-- Migration: Add full_name and username columns to users table
-- Created: 2025-07-19

-- Add full_name column (optional, for display purposes)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);

-- Add username column (optional, unique identifier)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

-- Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add index on full_name for search functionality
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- Update any existing users to have a default username based on email
UPDATE users 
SET username = SPLIT_PART(email, '@', 1) 
WHERE username IS NULL AND email IS NOT NULL;
