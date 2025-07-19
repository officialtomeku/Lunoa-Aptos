import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { WalletService, WalletConnectionData } from '../services/wallet.service';
import logger from '../config/logger';

// Extend Request interface to include wallet data
declare global {
  namespace Express {
    interface Request {
      walletData?: {
        address: string;
        walletType: string;
        isVerified: boolean;
      };
    }
  }
}

/**
 * Rate limiting for wallet authentication endpoints
 */
export const walletAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 wallet auth requests per windowMs
  message: {
    error: 'Too many wallet authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Wallet auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too many wallet authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * General rate limiting for auth endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per windowMs
  message: {
    error: 'Too many authentication requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Middleware to validate wallet signature
 */
export const validateWalletSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { address, publicKey, signature, message, walletType, timestamp } = req.body;

    // Validate required fields
    if (!address || !publicKey || !signature || !message || !walletType || !timestamp) {
      return res.status(400).json({
        error: 'Missing required wallet authentication fields',
        required: ['address', 'publicKey', 'signature', 'message', 'walletType', 'timestamp']
      });
    }

    // Validate wallet type
    if (!WalletService.isValidWalletType(walletType)) {
      return res.status(400).json({
        error: 'Invalid wallet type',
        supportedWallets: Object.values(WalletService)
      });
    }

    // Prepare wallet connection data
    const walletData: WalletConnectionData = {
      address,
      publicKey,
      signature,
      message,
      walletType,
      timestamp: parseInt(timestamp)
    };

    // Verify signature
    const verificationResult = await WalletService.verifySignature(walletData);

    if (!verificationResult.isValid) {
      logger.warn('Wallet signature verification failed', {
        address,
        walletType,
        error: verificationResult.error,
        ip: req.ip
      });

      return res.status(401).json({
        error: 'Wallet signature verification failed',
        details: verificationResult.error
      });
    }

    // Add wallet data to request for use in next middleware/controller
    req.walletData = {
      address: verificationResult.address,
      walletType: verificationResult.walletType,
      isVerified: true
    };

    logger.info('Wallet signature verified successfully', {
      address: verificationResult.address,
      walletType: verificationResult.walletType,
      ip: req.ip
    });

    next();

  } catch (error) {
    logger.error('Wallet signature validation middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      path: req.path
    });

    res.status(500).json({
      error: 'Internal server error during wallet verification'
    });
  }
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // CSRF Protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers for wallet connections
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  next();
};

/**
 * Simple CSRF token validation using headers
 */
export const validateCSRF = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF validation for GET requests and wallet signature verification
  if (req.method === 'GET' || req.path.includes('/wallet/connect')) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const expectedToken = req.headers['x-requested-with'];

  // Simple CSRF protection using X-Requested-With header
  if (!expectedToken || expectedToken !== 'XMLHttpRequest') {
    logger.warn('CSRF protection failed - missing X-Requested-With header', {
      ip: req.ip,
      path: req.path
    });

    return res.status(403).json({
      error: 'Invalid request origin'
    });
  }

  next();
};
