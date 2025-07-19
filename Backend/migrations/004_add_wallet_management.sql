-- Migration: Add wallet management support
-- Description: Add columns for multi-wallet support, wallet types, and session management
-- Date: 2025-01-19

-- Add wallet management columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update existing records to have created_at if null
UPDATE users 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Create index on wallet_type for analytics
CREATE INDEX IF NOT EXISTS idx_users_wallet_type ON users(wallet_type);

-- Create index on last_login for session management
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Add constraint to ensure wallet_type is valid when wallet_address is present
ALTER TABLE users 
ADD CONSTRAINT chk_wallet_type_valid 
CHECK (
  (wallet_address IS NULL AND wallet_type IS NULL) OR 
  (wallet_address IS NOT NULL AND wallet_type IN ('petra', 'martian', 'pontem', 'fewcha'))
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create wallet_sessions table for future session management
CREATE TABLE IF NOT EXISTS wallet_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(66) NOT NULL,
    wallet_type VARCHAR(50) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    nonce VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT fk_wallet_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for wallet_sessions
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_user_id ON wallet_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_wallet_address ON wallet_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_token ON wallet_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_expires_at ON wallet_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_active ON wallet_sessions(is_active);

-- Create wallet_connection_logs table for security monitoring
CREATE TABLE IF NOT EXISTS wallet_connection_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    wallet_address VARCHAR(66) NOT NULL,
    wallet_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'connect', 'disconnect', 'verify', 'failed'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_wallet_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for wallet_connection_logs
CREATE INDEX IF NOT EXISTS idx_wallet_logs_user_id ON wallet_connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_wallet_address ON wallet_connection_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_action ON wallet_connection_logs(action);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_created_at ON wallet_connection_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_success ON wallet_connection_logs(success);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_ip_address ON wallet_connection_logs(ip_address);

-- Insert sample wallet types for reference
INSERT INTO wallet_connection_logs (user_id, wallet_address, wallet_type, action, success, created_at)
VALUES 
(NULL, '0x0000000000000000000000000000000000000000000000000000000000000000', 'system', 'migration', true, NOW())
ON CONFLICT DO NOTHING;

COMMENT ON TABLE users IS 'User accounts with wallet and email authentication support';
COMMENT ON TABLE wallet_sessions IS 'Active wallet sessions for multi-wallet support';
COMMENT ON TABLE wallet_connection_logs IS 'Security logs for wallet connection attempts';

COMMENT ON COLUMN users.wallet_type IS 'Type of connected wallet: petra, martian, pontem, fewcha';
COMMENT ON COLUMN users.last_login IS 'Timestamp of last successful authentication';
COMMENT ON COLUMN wallet_sessions.nonce IS 'Cryptographic nonce for signature verification';
COMMENT ON COLUMN wallet_connection_logs.action IS 'Type of wallet action: connect, disconnect, verify, failed';
