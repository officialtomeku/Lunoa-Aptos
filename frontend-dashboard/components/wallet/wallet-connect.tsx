'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, ExternalLink, CheckCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { WalletService, WalletType, WalletInfo } from '@/lib/wallet';
import { toast } from 'sonner';

interface WalletConnectProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function WalletConnect({ onSuccess, onCancel }: WalletConnectProps) {
  const { connectWallet, walletLoading, connectedWallet } = useDashboardStore();
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  
  const walletService = WalletService.getInstance();
  const availableWallets = walletService.getAvailableWallets();

  const handleWalletConnect = async (walletType: WalletType) => {
    setSelectedWallet(walletType);
    
    try {
      await connectWallet(walletType);
      toast.success(`Successfully connected to ${walletType} wallet!`);
      onSuccess?.();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setSelectedWallet(null);
    }
  };

  const handleInstallWallet = (wallet: WalletInfo) => {
    window.open(wallet.downloadUrl, '_blank');
  };

  if (connectedWallet) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle>Wallet Connected</CardTitle>
          <CardDescription>
            Your {connectedWallet.type} wallet is successfully connected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Wallet Address</div>
            <div className="text-sm font-mono break-all">
              {connectedWallet.address}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <Badge variant="secondary" className="capitalize">
              {connectedWallet.type}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>
          Choose a wallet to connect to Lunoa and start your journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableWallets.map((wallet) => (
          <div key={wallet.type} className="space-y-2">
            {wallet.installed ? (
              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4"
                onClick={() => handleWalletConnect(wallet.type)}
                disabled={walletLoading}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {wallet.installed ? 'Installed' : 'Not installed'}
                    </div>
                  </div>
                </div>
                {walletLoading && selectedWallet === wallet.type ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Badge variant="secondary" className="capitalize">
                    Connect
                  </Badge>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4 opacity-60"
                onClick={() => handleInstallWallet(wallet)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-muted-foreground">Not installed</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Install</Badge>
                  <ExternalLink className="h-4 w-4" />
                </div>
              </Button>
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>By connecting your wallet, you agree to our Terms of Service</p>
            <p>Your wallet will be used to sign transactions and verify your identity</p>
          </div>
        </div>
        
        {onCancel && (
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
