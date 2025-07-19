import { Request, Response } from 'express';
import { WalletService, WalletType } from '../../../services/wallet.service';
import { getPool } from '../../../config/database';
import logger from '../../../config/logger';

/**
 * Generate nonce for wallet signature
 */
export const generateNonce = async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Wallet address is required'
      });
    }

    // Generate secure nonce
    const nonce = WalletService.generateNonce();
    
    // Create authentication message
    const message = WalletService.createAuthMessage(nonce, address);

    logger.info('Nonce generated for wallet authentication', {
      address,
      nonce: nonce.substring(0, 20) + '...' // Log partial nonce for security
    });

    res.status(200).json({
      nonce,
      message,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error generating nonce:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Get supported wallets
 */
export const getSupportedWallets = (req: Request, res: Response) => {
  try {
    const wallets = Object.values(WalletType).map(walletType => ({
      type: walletType,
      ...WalletService.getWalletConfig(walletType)
    }));

    res.status(200).json({
      wallets,
      count: wallets.length
    });

  } catch (error) {
    logger.error('Error getting supported wallets:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Get user's connected wallets
 */
export const getConnectedWallets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const result = await getPool().query(
      'SELECT wallet_address, wallet_type, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const connectedWallets = [];

    if (user.wallet_address) {
      connectedWallets.push({
        address: user.wallet_address,
        type: user.wallet_type || 'unknown',
        connectedAt: user.created_at,
        lastUsed: user.last_login,
        isPrimary: true
      });
    }

    res.status(200).json({
      wallets: connectedWallets,
      count: connectedWallets.length
    });

  } catch (error) {
    logger.error('Error getting connected wallets:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Disconnect wallet
 */
export const disconnectWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { address } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!address) {
      return res.status(400).json({
        error: 'Wallet address is required'
      });
    }

    // Check if user owns this wallet
    const result = await getPool().query(
      'SELECT id FROM users WHERE id = $1 AND wallet_address = $2',
      [userId, address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Wallet not found or not owned by user'
      });
    }

    // For now, we'll just clear the wallet fields
    // In a multi-wallet system, you'd remove the specific wallet record
    await getPool().query(
      'UPDATE users SET wallet_address = NULL, wallet_type = NULL WHERE id = $1 AND wallet_address = $2',
      [userId, address]
    );

    logger.info('Wallet disconnected', {
      userId,
      walletAddress: address
    });

    res.status(200).json({
      message: 'Wallet disconnected successfully'
    });

  } catch (error) {
    logger.error('Error disconnecting wallet:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Switch primary wallet (for future multi-wallet support)
 */
export const switchPrimaryWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { address } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!address) {
      return res.status(400).json({
        error: 'Wallet address is required'
      });
    }

    // For now, just update the primary wallet address
    // In a full multi-wallet system, you'd update the primary flag
    const result = await getPool().query(
      'UPDATE users SET wallet_address = $1, last_login = NOW() WHERE id = $2 RETURNING wallet_address, wallet_type',
      [address, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info('Primary wallet switched', {
      userId,
      newPrimaryAddress: address
    });

    res.status(200).json({
      message: 'Primary wallet updated successfully',
      wallet: {
        address: result.rows[0].wallet_address,
        type: result.rows[0].wallet_type
      }
    });

  } catch (error) {
    logger.error('Error switching primary wallet:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
