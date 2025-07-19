'use client';

import React from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <AptosWalletAdapterProvider 
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        aptosConnectDappId: 'lunoa-hackathon'
      }}
      onError={(error) => {
        console.error('Wallet adapter error:', error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}

// Re-export the useWallet hook from the adapter
export { useWallet } from '@aptos-labs/wallet-adapter-react';
