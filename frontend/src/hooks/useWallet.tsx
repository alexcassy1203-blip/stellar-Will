import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWalletAddress, getXlmBalance, getMockVaults } from '../lib/stellar';
import { isMockEnabled, setMockEnabled } from '../lib/contracts';

export interface WalletState {
  address: string;
  balance: number;
  isConnected: boolean;
  isMock: boolean;
  isLoading: boolean;
  role: 'owner' | 'beneficiary' | 'none';
  beneficiaryCount: number;
}

interface WalletContextType extends WalletState {
  connect: (forceReal?: boolean) => Promise<void>;
  disconnect: () => void;
  toggleMockMode: (enabled: boolean) => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: '',
    balance: 0,
    isConnected: false,
    isMock: isMockEnabled(),
    isLoading: true,
    role: 'none',
    beneficiaryCount: 0,
  });

  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const balance = await getXlmBalance(addr);
      
      // Determine role from vaults
      const vaults = getMockVaults();
      const isOwner = vaults.some(v => v.owner === addr && v.state === 'Active');
      const beneficiaries = vaults.filter(v => v.beneficiaries.some(b => b.address === addr) && v.state === 'Active');
      const isBeneficiary = beneficiaries.length > 0;
      
      let role: 'owner' | 'beneficiary' | 'none' = 'none';
      if (isOwner) role = 'owner';
      else if (isBeneficiary) role = 'beneficiary';

      setState(prev => ({
        ...prev,
        address: addr,
        isConnected: !!addr,
        balance,
        role,
        beneficiaryCount: beneficiaries.length,
        isLoading: false
      }));
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const connect = useCallback(async (forceReal = false) => {
    if (forceReal && isMockEnabled()) {
      localStorage.setItem('stellarwill_mock_mode', 'false');
      localStorage.setItem('stellarwill_pending_connect', 'true');
      window.location.reload();
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const addr = await getWalletAddress(forceReal);
      await refreshBalance(addr);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setState(prev => ({
        ...prev,
        address: '',
        isConnected: false,
        isLoading: false
      }));
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      address: '',
      balance: 0,
      isConnected: false,
      role: 'none',
      beneficiaryCount: 0,
      isLoading: false
    }));
  }, []);

  const toggleMockMode = useCallback((enabled: boolean) => {
    setMockEnabled(enabled);
  }, []);

  // Auto-connect silently in mock/demo mode (no Freighter popup)
  useEffect(() => {
    if (localStorage.getItem('stellarwill_pending_connect') === 'true') {
      localStorage.removeItem('stellarwill_pending_connect');
      connect(true);
    } else if (isMockEnabled()) {
      connect();
    } else {
      // In real mode, just mark loading as done — user must click Connect Wallet
      setState(prev => ({ ...prev, isLoading: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for mock balance changes or custom mock updates
  useEffect(() => {
    const handleMockUpdate = () => {
      if (state.address) {
        refreshBalance(state.address);
      }
    };
    window.addEventListener('stellarwill_mock_event', handleMockUpdate);
    return () => window.removeEventListener('stellarwill_mock_event', handleMockUpdate);
  }, [state.address, refreshBalance]);

  const triggerRefreshBalance = useCallback(async () => {
    if (state.address) {
      await refreshBalance(state.address);
    }
  }, [state.address, refreshBalance]);

  return (
    <WalletContext.Provider value={{
      ...state,
      connect,
      disconnect,
      toggleMockMode,
      refreshBalance: triggerRefreshBalance
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
