import { Types } from 'aptos';

// Wallet types supported by the backend
export enum WalletType {
  PETRA = 'petra',
  MARTIAN = 'martian',
  PONTEM = 'pontem',
  FEWCHA = 'fewcha'
}

export interface WalletInfo {
  name: string;
  type: WalletType;
  icon: string;
  downloadUrl: string;
  installed: boolean;
}

export interface ConnectedWallet {
  address: string;
  type: WalletType;
  publicKey: string;
}

export interface WalletConnectionResult {
  success: boolean;
  wallet?: ConnectedWallet;
  user?: any;
  accessToken?: string;
  error?: string;
}

declare global {
  interface Window {
    aptos?: any;
    martian?: any;
    pontem?: any;
    fewcha?: any;
  }
}

export class WalletService {
  private static instance: WalletService;
  private connectedWallet: ConnectedWallet | null = null;

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Get list of available wallets
   */
  getAvailableWallets(): WalletInfo[] {
    return [
      {
        name: 'Petra Wallet',
        type: WalletType.PETRA,
        icon: '/icons/petra.svg',
        downloadUrl: 'https://petra.app/',
        installed: this.isPetraInstalled()
      },
      {
        name: 'Martian Wallet',
        type: WalletType.MARTIAN,
        icon: '/icons/martian.svg',
        downloadUrl: 'https://martianwallet.xyz/',
        installed: this.isMartianInstalled()
      },
      {
        name: 'Pontem Wallet',
        type: WalletType.PONTEM,
        icon: '/icons/pontem.svg',
        downloadUrl: 'https://pontem.network/wallet',
        installed: this.isPontemInstalled()
      },
      {
        name: 'Fewcha Wallet',
        type: WalletType.FEWCHA,
        icon: '/icons/fewcha.svg',
        downloadUrl: 'https://fewcha.app/',
        installed: this.isFewchaInstalled()
      }
    ];
  }

  /**
   * Check if Petra wallet is installed
   */
  isPetraInstalled(): boolean {
    return typeof window !== 'undefined' && 'aptos' in window;
  }

  /**
   * Check if Martian wallet is installed
   */
  isMartianInstalled(): boolean {
    return typeof window !== 'undefined' && 'martian' in window;
  }

  /**
   * Check if Pontem wallet is installed
   */
  isPontemInstalled(): boolean {
    return typeof window !== 'undefined' && 'pontem' in window;
  }

  /**
   * Check if Fewcha wallet is installed
   */
  isFewchaInstalled(): boolean {
    return typeof window !== 'undefined' && 'fewcha' in window;
  }

  /**
   * Connect to Petra wallet
   */
  async connectPetra(): Promise<ConnectedWallet> {
    if (!this.isPetraInstalled()) {
      throw new Error('Petra wallet is not installed');
    }

    try {
      const response = await window.aptos.connect();
      
      if (!response.address || !response.publicKey) {
        throw new Error('Failed to get wallet information from Petra');
      }

      const wallet: ConnectedWallet = {
        address: response.address,
        type: WalletType.PETRA,
        publicKey: response.publicKey
      };

      this.connectedWallet = wallet;
      return wallet;

    } catch (error) {
      console.error('Petra connection error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to connect to Petra wallet');
    }
  }

  /**
   * Connect to Martian wallet
   */
  async connectMartian(): Promise<ConnectedWallet> {
    if (!this.isMartianInstalled()) {
      throw new Error('Martian wallet is not installed');
    }

    try {
      const response = await window.martian.connect();
      
      if (!response.address || !response.publicKey) {
        throw new Error('Failed to get wallet information from Martian');
      }

      const wallet: ConnectedWallet = {
        address: response.address,
        type: WalletType.MARTIAN,
        publicKey: response.publicKey
      };

      this.connectedWallet = wallet;
      return wallet;

    } catch (error) {
      console.error('Martian connection error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to connect to Martian wallet');
    }
  }

  /**
   * Sign message with connected wallet
   */
  async signMessage(message: string): Promise<string> {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      let signature: string;

      switch (this.connectedWallet.type) {
        case WalletType.PETRA:
          if (!window.aptos) throw new Error('Petra wallet not available');
          const petraResult = await window.aptos.signMessage({
            message,
            nonce: Math.random().toString()
          });
          signature = petraResult.signature;
          break;

        case WalletType.MARTIAN:
          if (!window.martian) throw new Error('Martian wallet not available');
          const martianResult = await window.martian.signMessage({
            message,
            nonce: Math.random().toString()
          });
          signature = martianResult.signature;
          break;

        default:
          throw new Error(`Signing not implemented for ${this.connectedWallet.type}`);
      }

      return signature;

    } catch (error) {
      console.error('Message signing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to sign message');
    }
  }

  /**
   * Connect wallet and authenticate with backend
   */
  async connectWallet(walletType: WalletType): Promise<WalletConnectionResult> {
    try {
      // Step 1: Connect to wallet
      let wallet: ConnectedWallet;
      
      switch (walletType) {
        case WalletType.PETRA:
          wallet = await this.connectPetra();
          break;
        case WalletType.MARTIAN:
          wallet = await this.connectMartian();
          break;
        default:
          throw new Error(`Wallet type ${walletType} not supported yet`);
      }

      // Step 2: Get nonce from backend
      const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/wallet/nonce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: wallet.address
        })
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get authentication nonce');
      }

      const { nonce, message, timestamp } = await nonceResponse.json();

      // Step 3: Sign the authentication message
      const signature = await this.signMessage(message);

      // Step 4: Connect wallet with backend
      const connectResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        body: JSON.stringify({
          address: wallet.address,
          publicKey: wallet.publicKey,
          signature,
          message,
          walletType: wallet.type,
          timestamp
        })
      });

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json();
        throw new Error(errorData.error || 'Failed to connect wallet');
      }

      const { user, accessToken } = await connectResponse.json();

      return {
        success: true,
        wallet,
        user,
        accessToken
      };

    } catch (error) {
      console.error('Wallet connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (this.connectedWallet) {
      try {
        switch (this.connectedWallet.type) {
          case WalletType.PETRA:
            if (window.aptos?.disconnect) {
              await window.aptos.disconnect();
            }
            break;
          case WalletType.MARTIAN:
            if (window.martian?.disconnect) {
              await window.martian.disconnect();
            }
            break;
        }
      } catch (error) {
        console.error('Wallet disconnect error:', error);
      }
    }
    
    this.connectedWallet = null;
  }

  /**
   * Get currently connected wallet
   */
  getConnectedWallet(): ConnectedWallet | null {
    return this.connectedWallet;
  }

  /**
   * Check if any wallet is connected
   */
  isConnected(): boolean {
    return this.connectedWallet !== null;
  }
}
