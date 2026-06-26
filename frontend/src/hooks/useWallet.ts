import { useState, useEffect, useCallback } from 'react';
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

export const useWallet = () => {
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

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const addr = await getWalletAddress();
      setState(prev => ({
        ...prev,
        address: addr,
        isConnected: true,
        isLoading: false
      }));
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

  useEffect(() => {
    connect();
  }, [connect]);

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

  return {
    ...state,
    connect,
    disconnect,
    toggleMockMode,
    refreshBalance: () => state.address && refreshBalance(state.address),
  };
};
