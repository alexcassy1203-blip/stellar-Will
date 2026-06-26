import { useEffect } from 'react';
import { isMockEnabled, VAULT_FACTORY_ID, TRIGGER_ID } from '../lib/contracts';
import { EventLog } from '../types/vault';
import { rpcServer, simulateSorobanCall } from '../lib/stellar';
import { scValToNative, nativeToScVal } from '@stellar/stellar-sdk';

interface UseVaultEventsProps {
  onEvent: (event: EventLog) => void;
  vaultId?: number;
  beneficiaryAddress?: string;
}

const vaultAddressCache = new Map<number, string>();

const getOrUpdateVaultAddresses = async (): Promise<string[]> => {
  try {
    const rawCount = await simulateSorobanCall(VAULT_FACTORY_ID, 'get_vault_count', []);
    const count = Number(rawCount);
    for (let i = 1; i <= count; i++) {
      if (!vaultAddressCache.has(i)) {
        try {
          const addr = await simulateSorobanCall(
            VAULT_FACTORY_ID,
            'get_vault_address',
            [nativeToScVal(i, { type: 'u64' })]
          );
          if (typeof addr === 'string') {
            vaultAddressCache.set(i, addr);
          }
        } catch (err) {
          console.error(`Error resolving address for vault #${i}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error updating vault addresses:', err);
  }
  return Array.from(vaultAddressCache.values());
};

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
          if (!log.details.toLowerCase().includes(beneficiaryAddress.toLowerCase().substring(0, 8))) return;
        }

        onEvent(log);
      };

      window.addEventListener('stellarwill_mock_event', handleMockEvent);
      return () => window.removeEventListener('stellarwill_mock_event', handleMockEvent);
    } else {
      let isSubscribed = true;
      let startLedger: number | undefined = undefined;
      const processedEventIds = new Set<string>();

      const pollEvents = async () => {
        // Initialize startLedger to latest sequence
        try {
          const latestLedger = await rpcServer.getLatestLedger();
          // Poll from sequence - 50 initially to display recent events in the live feed
          startLedger = Math.max(1, latestLedger.sequence - 50);
        } catch (err) {
          console.error('Failed to get latest ledger sequence:', err);
          startLedger = 1;
        }

        // Loop while subscribed
        while (isSubscribed) {
          try {
            const vaultAddresses = await getOrUpdateVaultAddresses();
            const contractIds = [VAULT_FACTORY_ID, TRIGGER_ID, ...vaultAddresses];

            if (contractIds.length > 0 && startLedger) {
              // Group contractIds into batches of 25 to respect the maximum 5 filters * 5 contract IDs RPC limit
              const batchSize = 25;
              const batches: string[][] = [];
              for (let i = 0; i < contractIds.length; i += batchSize) {
                batches.push(contractIds.slice(i, i + batchSize));
              }

              // Run all batches in parallel
              const allEventsPromises = batches.map(async (batchIds) => {
                const filters: any[] = [];
                for (let j = 0; j < batchIds.length; j += 5) {
                  filters.push({
                    type: 'contract',
                    contractIds: batchIds.slice(j, j + 5)
                  });
                }

                try {
                  const response = await rpcServer.getEvents({
                    startLedger: startLedger!,
                    filters,
                    limit: 50
                  });
                  return response?.events || [];
                } catch (err) {
                  console.error('Error fetching events batch:', err);
                  return [];
                }
              });

              const results = await Promise.all(allEventsPromises);
              
              // Flat map and deduplicate by event ID
              const allEvents = results.flat();

              if (allEvents.length > 0) {
                // Sort events chronologically by ledger and ID
                const sortedEvents = [...allEvents].sort((a, b) => {
                  const ledgerDiff = a.ledger - b.ledger;
                  if (ledgerDiff !== 0) return ledgerDiff;
                  return a.id.localeCompare(b.id);
                });

                for (const event of sortedEvents) {
                  if (processedEventIds.has(event.id)) {
                    continue;
                  }
                  processedEventIds.add(event.id);

                  // Keep set size reasonable
                  if (processedEventIds.size > 1000) {
                    const iterator = processedEventIds.keys();
                    for (let k = 0; k < 200; k++) {
                      const val = iterator.next().value;
                      if (val) {
                        processedEventIds.delete(val);
                      }
                    }
                  }

                  const topics = event.topic.map(t => scValToNative(t));
                  const value = scValToNative(event.value);
                  const eventType = topics[0];

                  let eventLog: EventLog | null = null;
                  const timestamp = event.ledgerClosedAt 
                    ? Math.floor(new Date(event.ledgerClosedAt).getTime() / 1000) 
                    : Math.floor(Date.now() / 1000);

                  if (eventType === 'Created') {
                    // Factory topic: ['Created', vault_count, owner]
                    const vId = Number(topics[1]);
                    const owner = topics[2];
                    if (event.contractId?.contractId() === VAULT_FACTORY_ID) {
                      const vaultAddress = value;
                      eventLog = {
                        id: event.id,
                        type: 'VaultCreated',
                        vaultId: vId,
                        timestamp,
                        details: `New vault #${vId} created at ${vaultAddress.substring(0, 6)}...${vaultAddress.substring(vaultAddress.length - 4)} owned by ${owner.substring(0, 6)}...${owner.substring(owner.length - 4)}`,
                        txHash: event.txHash
                      };
                    }
                  } else if (eventType === 'Deposited') {
                    // Deposited: ['Deposited', vault_id, owner]
                    const vId = Number(topics[1]);
                    const owner = topics[2];
                    const amount = Number(value) / 10000000;
                    eventLog = {
                      id: event.id,
                      type: 'Deposited',
                      vaultId: vId,
                      timestamp,
                      details: `${owner.substring(0, 6)}...${owner.substring(owner.length - 4)} deposited ${amount.toLocaleString()} XLM`,
                      txHash: event.txHash
                    };
                  } else if (eventType === 'CheckedIn') {
                    // CheckedIn: ['CheckedIn', vault_id, owner]
                    const vId = Number(topics[1]);
                    const owner = topics[2];
                    eventLog = {
                      id: event.id,
                      type: 'CheckedIn',
                      vaultId: vId,
                      timestamp,
                      details: `Owner ${owner.substring(0, 6)}...${owner.substring(owner.length - 4)} checked in`,
                      txHash: event.txHash
                    };
                  } else if (eventType === 'Cancelled') {
                    // Cancelled: ['Cancelled', vault_id, owner]
                    const vId = Number(topics[1]);
                    const owner = topics[2];
                    const refunded = Number(value) / 10000000;
                    eventLog = {
                      id: event.id,
                      type: 'VaultCancelled',
                      vaultId: vId,
                      timestamp,
                      details: `Vault cancelled by owner; refunded ${refunded.toLocaleString()} XLM`,
                      txHash: event.txHash
                    };
                  } else if (eventType === 'BenUpd') {
                    // BenUpd: ['BenUpd', vault_id, owner]
                    const vId = Number(topics[1]);
                    eventLog = {
                      id: event.id,
                      type: 'BeneficiariesUpdated',
                      vaultId: vId,
                      timestamp,
                      details: `Beneficiary shares updated by owner`,
                      txHash: event.txHash
                    };
                  } else if (eventType === 'Triggered') {
                    // Triggered: ['Triggered', vault_id]
                    const vId = Number(topics[1]);
                    eventLog = {
                      id: event.id,
                      type: 'VaultTriggered',
                      vaultId: vId,
                      timestamp,
                      details: `Vault triggered for release!`,
                      txHash: event.txHash
                    };
                  } else if (eventType === 'FundsDist') {
                    // FundsDist: ['FundsDist', vault_id, beneficiary]
                    const vId = Number(topics[1]);
                    const beneficiary = topics[2];
                    const amount = Number(value) / 10000000;
                    eventLog = {
                      id: event.id,
                      type: 'FundsDistributed',
                      vaultId: vId,
                      timestamp,
                      details: `Distributed ${amount.toLocaleString()} XLM to beneficiary ${beneficiary.substring(0, 6)}...${beneficiary.substring(beneficiary.length - 4)}`,
                      txHash: event.txHash
                    };
                  }

                  if (eventLog) {
                    let matches = true;
                    if (vaultId && eventLog.vaultId !== vaultId) matches = false;
                    if (beneficiaryAddress && eventLog.type === 'FundsDistributed') {
                      if (!eventLog.details.toLowerCase().includes(beneficiaryAddress.toLowerCase().substring(0, 8))) matches = false;
                    }

                    if (matches) {
                      onEvent(eventLog);
                    }
                  }

                  // Update startLedger to current event's ledger to avoid skipping same-ledger events
                  startLedger = Math.max(startLedger, event.ledger);
                }
              }
            }
          } catch (err) {
            console.error('Error polling Soroban events:', err);
          }

          // Poll every 5 seconds
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      };

      pollEvents();

      return () => {
        isSubscribed = false;
      };
    }
  }, [onEvent, vaultId, beneficiaryAddress]);
};
