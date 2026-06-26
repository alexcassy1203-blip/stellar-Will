import {
  rpc,
  Horizon,
} from '@stellar/stellar-sdk';
import {
  isConnected as isFreighterConnected,
  requestAccess as requestFreighterAccess,
} from '@stellar/freighter-api';
import { isMockEnabled } from './contracts';
import { Vault, Beneficiary, EventLog } from '../types/vault';

// RPC & Horizon clients
const RPC_URL = 'https://soroban-rpc.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export const rpcServer = new rpc.Server(RPC_URL);
export const horizonServer = new Horizon.Server(HORIZON_URL);

// --- MOCK STORAGE KEYS ---
const MOCK_VAULTS_KEY = 'stellarwill_mock_vaults';
const MOCK_WALLET_KEY = 'stellarwill_mock_wallet';
const MOCK_LOGS_KEY = 'stellarwill_mock_logs';
const MOCK_BALANCE_KEY = 'stellarwill_mock_balance';

// Initial Mock data
const INITIAL_MOCK_VAULTS: Vault[] = [
  {
    id: 1,
    address: 'CDVAULT0000000000000000000000000000000000000000000000001',
    owner: 'GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345',
    beneficiaries: [
      { address: 'GDBENEFICIARY111111111111111111111111111111111111', basisPoints: 4000 },
      { address: 'GDBENEFICIARY222222222222222222222222222222222222', basisPoints: 6000 },
    ],
    checkInInterval: 120, // 2 mins
    gracePeriod: 60, // 1 min
    lastCheckIn: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
    deadline: Math.floor(Date.now() / 1000) + 150,
    balance: 500,
    state: 'Active',
    isExpired: false,
  },
  {
    id: 2,
    address: 'CDVAULT0000000000000000000000000000000000000000000000002',
    owner: 'GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345',
    beneficiaries: [
      { address: 'GDBENEFICIARY111111111111111111111111111111111111', basisPoints: 10000 },
    ],
    checkInInterval: 60, // 1 min
    gracePeriod: 30, // 30 sec
    lastCheckIn: Math.floor(Date.now() / 1000) - 100, // 100 seconds ago (already expired!)
    deadline: Math.floor(Date.now() / 1000) - 10,
    balance: 1250,
    state: 'Active',
    isExpired: true,
  }
];

const INITIAL_MOCK_LOGS: EventLog[] = [
  {
    id: 'e1',
    type: 'VaultCreated',
    vaultId: 1,
    timestamp: Math.floor(Date.now() / 1000) - 1000,
    details: 'Vault #1 created by Owner. 500 XLM locked.',
    txHash: 'a5c7f8...99db21',
  },
  {
    id: 'e2',
    type: 'VaultCreated',
    vaultId: 2,
    timestamp: Math.floor(Date.now() / 1000) - 500,
    details: 'Vault #2 created by Owner. 1250 XLM locked.',
    txHash: 'e712fd...55bc78',
  }
];

// Load from localStorage or set initial
export const getMockVaults = (): Vault[] => {
  const data = localStorage.getItem(MOCK_VAULTS_KEY);
  if (!data) {
    localStorage.setItem(MOCK_VAULTS_KEY, JSON.stringify(INITIAL_MOCK_VAULTS));
    return INITIAL_MOCK_VAULTS;
  }
  const vaults: Vault[] = JSON.parse(data);
  // Live update the isExpired flag based on current time
  return vaults.map(v => {
    const expired = v.state === 'Active' && (Math.floor(Date.now() / 1000) > (v.lastCheckIn + v.checkInInterval + v.gracePeriod));
    return { ...v, isExpired: expired };
  });
};

export const saveMockVaults = (vaults: Vault[]) => {
  localStorage.setItem(MOCK_VAULTS_KEY, JSON.stringify(vaults));
};

export const getMockWallet = (): string => {
  const wallet = localStorage.getItem(MOCK_WALLET_KEY);
  if (!wallet) {
    const defaultWallet = 'GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345';
    localStorage.setItem(MOCK_WALLET_KEY, defaultWallet);
    return defaultWallet;
  }
  return wallet;
};

export const setMockWallet = (address: string) => {
  localStorage.setItem(MOCK_WALLET_KEY, address);
};

export const getMockLogs = (): EventLog[] => {
  const data = localStorage.getItem(MOCK_LOGS_KEY);
  if (!data) {
    localStorage.setItem(MOCK_LOGS_KEY, JSON.stringify(INITIAL_MOCK_LOGS));
    return INITIAL_MOCK_LOGS;
  }
  return JSON.parse(data);
};

export const addMockLog = (log: Omit<EventLog, 'id' | 'timestamp'>) => {
  const logs = getMockLogs();
  const newLog: EventLog = {
    ...log,
    id: 'e_' + Math.random().toString(36).substring(2, 9),
    timestamp: Math.floor(Date.now() / 1000)
  };
  logs.unshift(newLog); // newest first
  localStorage.setItem(MOCK_LOGS_KEY, JSON.stringify(logs));
  
  // Dispatch a custom event to notify listeners (sse mock)
  const event = new CustomEvent('stellarwill_mock_event', { detail: newLog });
  window.dispatchEvent(event);
};

export const getMockBalance = (): number => {
  const balance = localStorage.getItem(MOCK_BALANCE_KEY);
  if (!balance) {
    localStorage.setItem(MOCK_BALANCE_KEY, '8500');
    return 8500;
  }
  return parseFloat(balance);
};

export const updateMockBalance = (amount: number) => {
  const current = getMockBalance();
  localStorage.setItem(MOCK_BALANCE_KEY, String(Math.max(0, current + amount)));
};

// --- STAGE TIME PASSING (MOCK ONLY) ---
export const addMockTime = (seconds: number) => {
  const vaults = getMockVaults();
  const updated = vaults.map(v => {
    if (v.state === 'Active') {
      // Shifting check-in into the past simulates time passing
      return {
        ...v,
        lastCheckIn: v.lastCheckIn - seconds
      };
    }
    return v;
  });
  saveMockVaults(updated);
};


// --- SDK AND ON-CHAIN IMPLEMENTATIONS ---

export const getWalletAddress = async (): Promise<string> => {
  if (isMockEnabled()) {
    return getMockWallet();
  }
  
  const connected = await isFreighterConnected();
  if (!connected) {
    throw new Error('Freighter wallet not connected');
  }
  
  const addressResult = await requestFreighterAccess();
  if (!addressResult) {
    throw new Error('Freighter wallet permission rejected');
  }
  
  if (typeof addressResult === 'string') {
    return addressResult;
  }
  
  if (typeof addressResult === 'object' && 'address' in addressResult && addressResult.address) {
    return addressResult.address;
  }
  
  throw new Error('Invalid address returned from Freighter');
};

export const getXlmBalance = async (address: string): Promise<number> => {
  if (isMockEnabled()) {
    return getMockBalance();
  }

  try {
    const account = await horizonServer.loadAccount(address);
    const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native');
    return nativeBalance ? parseFloat(nativeBalance.balance) : 0;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

export const getVaultsByOwner = async (ownerAddress: string): Promise<Vault[]> => {
  if (isMockEnabled()) {
    return getMockVaults().filter(v => v.owner === ownerAddress);
  }
  
  // Real implementation: call Factory contract get_vaults_by_owner, then load details
  // For safety in dev, we return empty or stub until fully deployed
  return [];
};

export const getVaultById = async (vaultId: number): Promise<Vault | null> => {
  if (isMockEnabled()) {
    return getMockVaults().find(v => v.id === vaultId) || null;
  }
  
  return null;
};

export const getAllExpiredVaults = async (): Promise<Vault[]> => {
  if (isMockEnabled()) {
    return getMockVaults().filter(v => v.isExpired && v.state === 'Active');
  }
  
  return [];
};

export const createVault = async (
  owner: string,
  beneficiaries: Beneficiary[],
  checkInInterval: number,
  gracePeriod: number,
  depositAmount: number
): Promise<number> => {
  if (isMockEnabled()) {
    // Validation
    const totalBP = beneficiaries.reduce((acc, b) => acc + b.basisPoints, 0);
    if (totalBP !== 10000) {
      throw new Error('Beneficiary splits must total 10000 basis points');
    }
    const balance = getMockBalance();
    if (balance < depositAmount) {
      throw new Error('Insufficient balance to create vault');
    }

    const vaults = getMockVaults();
    const newId = vaults.length > 0 ? Math.max(...vaults.map(v => v.id)) + 1 : 1;
    const newVault: Vault = {
      id: newId,
      address: `CDVAULT000000000000000000000000000000000000000000000000${newId}`,
      owner,
      beneficiaries,
      checkInInterval,
      gracePeriod,
      lastCheckIn: Math.floor(Date.now() / 1000),
      deadline: Math.floor(Date.now() / 1000) + checkInInterval + gracePeriod,
      balance: depositAmount,
      state: 'Active',
      isExpired: false
    };

    vaults.push(newVault);
    saveMockVaults(vaults);
    updateMockBalance(-depositAmount);
    
    addMockLog({
      type: 'VaultCreated',
      vaultId: newId,
      details: `Vault #${newId} created by owner. ${depositAmount} XLM locked.`
    });

    return newId;
  }

  // Real implementation: build transaction calling Factory `create_vault`, sign with Freighter, submit
  throw new Error('On-chain operations require smart contract deployment.');
};

export const depositVault = async (vaultId: number, amount: number): Promise<void> => {
  if (isMockEnabled()) {
    const vaults = getMockVaults();
    const index = vaults.findIndex(v => v.id === vaultId);
    if (index === -1) throw new Error('Vault not found');
    if (vaults[index].state !== 'Active') throw new Error('Vault is not active');
    
    if (getMockBalance() < amount) throw new Error('Insufficient balance');

    vaults[index].balance += amount;
    saveMockVaults(vaults);
    updateMockBalance(-amount);

    addMockLog({
      type: 'Deposited',
      vaultId,
      details: `Deposited ${amount} XLM into Vault #${vaultId}.`
    });
    return;
  }
  
  throw new Error('On-chain operations require smart contract deployment.');
};

export const checkInVault = async (vaultId: number): Promise<void> => {
  if (isMockEnabled()) {
    const vaults = getMockVaults();
    const index = vaults.findIndex(v => v.id === vaultId);
    if (index === -1) throw new Error('Vault not found');
    if (vaults[index].state !== 'Active') throw new Error('Vault is not active');

    const now = Math.floor(Date.now() / 1000);
    vaults[index].lastCheckIn = now;
    vaults[index].deadline = now + vaults[index].checkInInterval + vaults[index].gracePeriod;
    vaults[index].isExpired = false;
    
    saveMockVaults(vaults);

    addMockLog({
      type: 'CheckedIn',
      vaultId,
      details: `Owner checked in on Vault #${vaultId}. Deadline reset.`
    });
    return;
  }
  
  throw new Error('On-chain operations require smart contract deployment.');
};

export const cancelVault = async (vaultId: number): Promise<void> => {
  if (isMockEnabled()) {
    const vaults = getMockVaults();
    const index = vaults.findIndex(v => v.id === vaultId);
    if (index === -1) throw new Error('Vault not found');
    if (vaults[index].state !== 'Active') throw new Error('Vault is not active');

    const refundAmount = vaults[index].balance;
    vaults[index].balance = 0;
    vaults[index].state = 'Cancelled';
    
    saveMockVaults(vaults);
    updateMockBalance(refundAmount);

    addMockLog({
      type: 'VaultCancelled',
      vaultId,
      details: `Vault #${vaultId} cancelled. Refunded ${refundAmount} XLM to owner.`
    });
    return;
  }
  
  throw new Error('On-chain operations require smart contract deployment.');
};

export const updateBeneficiaries = async (vaultId: number, beneficiaries: Beneficiary[]): Promise<void> => {
  if (isMockEnabled()) {
    const totalBP = beneficiaries.reduce((acc, b) => acc + b.basisPoints, 0);
    if (totalBP !== 10000) {
      throw new Error('Beneficiary splits must total 10000 basis points');
    }

    const vaults = getMockVaults();
    const index = vaults.findIndex(v => v.id === vaultId);
    if (index === -1) throw new Error('Vault not found');
    if (vaults[index].state !== 'Active') throw new Error('Vault is not active');

    vaults[index].beneficiaries = beneficiaries;
    saveMockVaults(vaults);

    addMockLog({
      type: 'BeneficiariesUpdated',
      vaultId,
      details: `Beneficiaries updated for Vault #${vaultId}.`
    });
    return;
  }
  
  throw new Error('On-chain operations require smart contract deployment.');
};

export const triggerRelease = async (vaultId: number): Promise<void> => {
  if (isMockEnabled()) {
    const vaults = getMockVaults();
    const index = vaults.findIndex(v => v.id === vaultId);
    if (index === -1) throw new Error('Vault not found');
    if (vaults[index].state !== 'Active') throw new Error('Vault is not active');
    
    const v = vaults[index];
    const now = Math.floor(Date.now() / 1000);
    if (now <= (v.lastCheckIn + v.checkInInterval + v.gracePeriod)) {
      throw new Error('VaultNotExpired');
    }

    const balance = v.balance;
    v.balance = 0;
    v.state = 'Triggered';
    saveMockVaults(vaults);

    addMockLog({
      type: 'VaultTriggered',
      vaultId,
      details: `Vault #${vaultId} was triggered permissionlessly. Distribution initiated.`
    });

    // Distribute to beneficiaries mock
    let remaining = balance;
    v.beneficiaries.forEach((b, i) => {
      let amount = Math.floor((balance * b.basisPoints) / 10000);
      if (i === v.beneficiaries.length - 1) {
        amount = remaining;
      }
      remaining -= amount;

      if (amount > 0) {
        // If current wallet is a beneficiary, simulate their balance increasing
        if (getMockWallet() === b.address) {
          updateMockBalance(amount);
        }
        
        addMockLog({
          type: 'FundsDistributed',
          vaultId,
          details: `Distributed ${amount} XLM to beneficiary: ${b.address.substring(0, 8)}...`
        });
      }
    });

    return;
  }
  
  throw new Error('On-chain operations require smart contract deployment.');
};
