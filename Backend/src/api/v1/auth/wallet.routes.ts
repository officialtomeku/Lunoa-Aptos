import { Router } from 'express';
import { 
  generateNonce, 
  getSupportedWallets, 
  getConnectedWallets, 
  disconnectWallet, 
  switchPrimaryWallet 
} from './wallet.controller';
import { connectWallet } from './auth.controller';
import { 
  validateWalletSignature, 
  walletAuthRateLimit, 
  authRateLimit, 
  securityHeaders,
  validateCSRF 
} from '../../../middleware/wallet.middleware';
import { protect } from '../../../middleware/auth.middleware';

const router = Router();

// Apply security headers to all wallet routes
router.use(securityHeaders);

// Public routes
router.get('/supported', getSupportedWallets);
router.post('/nonce', authRateLimit, generateNonce);

// Wallet connection route with signature validation
router.post('/connect', 
  walletAuthRateLimit,
  validateWalletSignature,
  connectWallet
);

// Protected routes (require authentication)
router.use(protect); // Apply authentication middleware to all routes below

router.get('/connected', getConnectedWallets);
router.post('/disconnect', validateCSRF, disconnectWallet);
router.post('/switch-primary', validateCSRF, switchPrimaryWallet);

export default router;
