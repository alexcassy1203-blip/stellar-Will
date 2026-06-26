import { useEffect } from 'react';
import { isMockEnabled } from '../lib/contracts';
import { EventLog } from '../types/vault';

interface UseVaultEventsProps {
  onEvent: (event: EventLog) => void;
  vaultId?: number;
  beneficiaryAddress?: string;
}

export const useVaultEvents = ({ onEvent, vaultId, beneficiaryAddress }: UseVaultEventsProps) => {
  useEffect(() => {
    if (isMockEnabled()) {
      const handleMockEvent = (e: Event) => {
        const customEvent = e as CustomEvent<EventLog>;
        const log = customEvent.detail;
        
        // Filter by vaultId if specified
        if (vaultId && log.vaultId !== vaultId) return;
        
        // Filter by beneficiary if specified
        if (beneficiaryAddress && log.type === 'FundsDistributed') {
          // Check if details contains beneficiary address
          if (!log.details.toLowerCase().includes(beneficiaryAddress.toLowerCase().substring(0, 8))) return;
        }

        onEvent(log);
      };

      window.addEventListener('stellarwill_mock_event', handleMockEvent);
      return () => window.removeEventListener('stellarwill_mock_event', handleMockEvent);
    } else {
      // Real SSE stream from Horizon or Soroban RPC polling
      // In production, we'd open an SSE stream to Horizon for the Factory / Vault contract ID events
      // For this demo context, we hook up SSE logic structure
      let isSubscribed = true;
      
      const pollEvents = async () => {
        // Mock polling for demo connection visual cue
        while (isSubscribed) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      };

      pollEvents();
      
      return () => {
        isSubscribed = false;
      };
    }
  }, [onEvent, vaultId, beneficiaryAddress]);
};
