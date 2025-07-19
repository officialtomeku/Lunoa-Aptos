import { Ed25519PublicKey, Ed25519Signature } from '@aptos-labs/ts-sdk';
import crypto from 'crypto';
import logger from '../config/logger';

export enum WalletType {
  PETRA = 'petra',
  MARTIAN = 'martian',
  PONTEM = 'pontem',
  FEWCHA = 'fewcha'
}

export interface WalletConnectionData {
  address: string;
  publicKey: string;
  signature: string;
  message: string;
  walletType: WalletType;
  timestamp: number;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  address: string;
  walletType: WalletType;
  error?: string;
}

export class WalletService {
  private static readonly MESSAGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly NONCE_PREFIX = 'LUNOA_AUTH_';

  /**
   * Generate a secure nonce for wallet signature
   */
  static generateNonce(): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${this.NONCE_PREFIX}${timestamp}_${randomBytes}`;
  }

  /**
   * Create authentication message for wallet signing
   */
  static createAuthMessage(nonce: string, address: string): string {
    const timestamp = new Date().toISOString();
    return `Welcome to Lunoa!

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address: ${address}
Nonce: ${nonce}
Timestamp: ${timestamp}

Sign this message to authenticate with Lunoa.`;
  }

  /**
   * Verify wallet signature for authentication
   */
  static async verifySignature(data: WalletConnectionData): Promise<SignatureVerificationResult> {
    try {
      const { address, publicKey, signature, message, walletType, timestamp } = data;

      // Check message expiry
      if (Date.now() - timestamp > this.MESSAGE_EXPIRY_MS) {
        return {
          isValid: false,
          address,
          walletType,
          error: 'Authentication message has expired'
        };
      }

      // Verify the message contains the correct nonce format
      if (!message.includes(this.NONCE_PREFIX)) {
        return {
          isValid: false,
          address,
          walletType,
          error: 'Invalid authentication message format'
        };
      }

      // Verify the address in the message matches the provided address
      if (!message.includes(address)) {
        return {
          isValid: false,
          address,
          walletType,
          error: 'Address mismatch in authentication message'
        };
      }

      // Convert hex strings to proper format for verification
      const publicKeyBytes = new Uint8Array(Buffer.from(publicKey.replace('0x', ''), 'hex'));
      const signatureBytes = new Uint8Array(Buffer.from(signature.replace('0x', ''), 'hex'));
      const messageBytes = new TextEncoder().encode(message);

      // Create Ed25519 objects for verification
      const ed25519PublicKey = new Ed25519PublicKey(publicKeyBytes);
      const ed25519Signature = new Ed25519Signature(signatureBytes);

      // Verify the signature
      const isValid = ed25519PublicKey.verifySignature({
        message: messageBytes,
        signature: ed25519Signature
      });

      if (!isValid) {
        return {
          isValid: false,
          address,
          walletType,
          error: 'Invalid signature'
        };
      }

      // Derive address from public key and verify it matches
      const derivedAddress = ed25519PublicKey.authKey().derivedAddress().toString();
      if (derivedAddress !== address) {
        return {
          isValid: false,
          address,
          walletType,
          error: 'Public key does not match wallet address'
        };
      }

      logger.info(`Wallet signature verified successfully`, {
        address,
        walletType,
        timestamp: new Date(timestamp).toISOString()
      });

      return {
        isValid: true,
        address,
        walletType
      };

    } catch (error) {
      logger.error('Wallet signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        address: data.address,
        walletType: data.walletType
      });

      return {
        isValid: false,
        address: data.address,
        walletType: data.walletType,
        error: 'Signature verification failed'
      };
    }
  }

  /**
   * Validate wallet type
   */
  static isValidWalletType(walletType: string): walletType is WalletType {
    return Object.values(WalletType).includes(walletType as WalletType);
  }

  /**
   * Get wallet-specific configuration
   */
  static getWalletConfig(walletType: WalletType) {
    const configs = {
      [WalletType.PETRA]: {
        name: 'Petra Wallet',
        icon: '/icons/petra.svg',
        downloadUrl: 'https://petra.app/',
        features: ['signing', 'transactions', 'nfts']
      },
      [WalletType.MARTIAN]: {
        name: 'Martian Wallet',
        icon: '/icons/martian.svg',
        downloadUrl: 'https://martianwallet.xyz/',
        features: ['signing', 'transactions', 'nfts', 'staking']
      },
      [WalletType.PONTEM]: {
        name: 'Pontem Wallet',
        icon: '/icons/pontem.svg',
        downloadUrl: 'https://pontem.network/wallet',
        features: ['signing', 'transactions']
      },
      [WalletType.FEWCHA]: {
        name: 'Fewcha Wallet',
        icon: '/icons/fewcha.svg',
        downloadUrl: 'https://fewcha.app/',
        features: ['signing', 'transactions', 'nfts']
      }
    };

    return configs[walletType];
  }
}
