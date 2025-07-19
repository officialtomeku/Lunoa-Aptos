'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Wallet, Copy, ExternalLink, LogOut, User } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import WalletConnect from './wallet-connect';
import { toast } from 'sonner';

export default function WalletButton() {
  const { connectedWallet, disconnectWallet, user, isAuthenticated } = useDashboardStore();
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  const handleCopyAddress = async () => {
    if (connectedWallet?.address) {
      try {
        await navigator.clipboard.writeText(connectedWallet.address);
        toast.success('Address copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };

  const handleViewOnExplorer = () => {
    if (connectedWallet?.address) {
      // Aptos Explorer URL
      const explorerUrl = `https://explorer.aptoslabs.com/account/${connectedWallet.address}`;
      window.open(explorerUrl, '_blank');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      toast.success('Wallet disconnected successfully');
    } catch (error) {
      toast.error('Failed to disconnect wallet');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isAuthenticated || !connectedWallet) {
    return (
      <>
        <Button 
          onClick={() => setShowConnectDialog(true)}
          className="flex items-center space-x-2"
        >
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </Button>

        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Your Wallet</DialogTitle>
            </DialogHeader>
            <WalletConnect 
              onSuccess={() => setShowConnectDialog(false)}
              onCancel={() => setShowConnectDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
            <Wallet className="h-3 w-3" />
          </div>
          <span className="font-mono text-sm">
            {formatAddress(connectedWallet.address)}
          </span>
          <Badge variant="secondary" className="capitalize text-xs">
            {connectedWallet.type}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>Wallet Account</span>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2">
          <div className="text-sm font-medium">Address</div>
          <div className="text-xs font-mono text-muted-foreground break-all">
            {connectedWallet.address}
          </div>
        </div>
        
        <div className="px-2 py-1">
          <div className="text-sm font-medium">Wallet Type</div>
          <Badge variant="outline" className="capitalize text-xs">
            {connectedWallet.type}
          </Badge>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleViewOnExplorer}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Explorer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDisconnect}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
