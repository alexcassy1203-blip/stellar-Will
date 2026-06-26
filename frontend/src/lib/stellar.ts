import {
  rpc,
  Horizon,
  Contract,
  TransactionBuilder,
  Account,
  nativeToScVal,
  scValToNative,
  Transaction,
} from '@stellar/stellar-sdk';
import {
  isConnected as isFreighterConnected,
  requestAccess as requestFreighterAccess,
  signTransaction,
} from '@stellar/freighter-api';
import { isMockEnabled, VAULT_FACTORY_ID, TRIGGER_ID } from './contracts';
import { Vault, Beneficiary, EventLog, VaultState } from '../types/vault';

// RPC & Horizon clients
const RPC_URL = 'https://soroban-testnet.stellar.org';
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

const INITIAL_MOCK_LOGS: EventLog[] = [];


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
    localStorage.setItem(MOCK_LOGS_KEY, JSON.stringify([]));
    return [];
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

export const getMockBalance = (address?: string): number => {
  const addr = address || getMockWallet();
  const key = `${MOCK_BALANCE_KEY}_${addr}`;
  const balance = localStorage.getItem(key);
  if (!balance) {
    // Owner starts with 8500 XLM, beneficiaries with 100 XLM, others with 0 XLM
    const initial = addr.includes('OWNER') ? 8500 : addr.includes('BENEFICIARY') ? 100 : 0;
    localStorage.setItem(key, String(initial));
    return initial;
  }
  return parseFloat(balance);
};

export const updateMockBalanceForAddress = (address: string, amount: number) => {
  const current = getMockBalance(address);
  const key = `${MOCK_BALANCE_KEY}_${address}`;
  localStorage.setItem(key, String(Math.max(0, current + amount)));
};

export const updateMockBalance = (amount: number) => {
  updateMockBalanceForAddress(getMockWallet(), amount);
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

export const getWalletAddress = async (forceReal = false): Promise<string> => {
  if (isMockEnabled() && !forceReal) {
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
    return getMockBalance(address);
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

// --- SOROBAN TRANSACTION HELPERS ---

const parseState = (stateVal: any): string => {
  if (!stateVal) return 'Active';
  if (typeof stateVal === 'string') return stateVal;
  if (typeof stateVal === 'number') {
    return stateVal === 0 ? 'Active' : stateVal === 1 ? 'Triggered' : 'Cancelled';
  }
  if (typeof stateVal === 'object') {
    const name = stateVal.name || stateVal.switch?.name || (Object.keys(stateVal)[0]);
    if (name) return name;
  }
  return 'Active';
};

export const simulateSorobanCall = async (
  contractId: string,
  methodName: string,
  args: any[]
): Promise<any> => {
  const dummySource = new Account("GDV5LHWHXDHGY4PEOG6HDKTC4HL64GTUR5LGDTYGAHW4NQUZGAVGNAVP", "0");
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(dummySource, {
    fee: "100",
    networkPassphrase: "Test SDF Network ; September 2015",
  })
  .addOperation(
    contract.call(methodName, ...args)
  )
  .setTimeout(30)
  .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(simResult)) {
    if (simResult.result && simResult.result.retval) {
      return scValToNative(simResult.result.retval);
    }
    return null;
  }
  throw new Error(`Simulation failed for ${methodName}: ${rpc.Api.isSimulationError(simResult) ? simResult.error : 'Unknown error'}`);
};

export const sendSorobanTransaction = async (
  ownerAddress: string,
  contractId: string,
  methodName: string,
  args: any[]
): Promise<any> => {
  const account = await rpcServer.getAccount(ownerAddress);
  
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: "Test SDF Network ; September 2015",
  })
  .addOperation(
    contract.call(methodName, ...args)
  )
  .setTimeout(60)
  .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const assembledTx = rpc.assembleTransaction(tx, simResult).build();

  const freighterResponse = await signTransaction(assembledTx.toXDR(), {
    networkPassphrase: "Test SDF Network ; September 2015",
  }) as any;

  if (freighterResponse.error) {
    throw new Error(`Freighter signing failed: ${freighterResponse.error}`);
  }

  const signedTx = TransactionBuilder.fromXDR(freighterResponse.signedTxXdr, "Test SDF Network ; September 2015") as Transaction;
  const response = await rpcServer.sendTransaction(signedTx);
  
  if (response.status === 'ERROR') {
    throw new Error(`Transaction submission failed: ${(response as any).errorResultXdr}`);
  }

  const txHash = response.hash;
  let status: string = response.status;
  
  for (let i = 0; i < 20; i++) {
    if (status === 'SUCCESS') {
      break;
    }
    if (status === 'FAILED') {
      throw new Error(`Transaction failed: ${txHash}`);
    }
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const txResult = await rpcServer.getTransaction(txHash);
    status = txResult.status;
    if (status === 'SUCCESS') {
      if ((txResult as any).returnValue) {
        return scValToNative((txResult as any).returnValue);
      }
      return txResult;
    }
    if (status === 'FAILED') {
      throw new Error(`Transaction failed: ${(txResult as any).resultXdr}`);
    }
  }
  
  throw new Error(`Transaction polling timed out: ${txHash}`);
};

// --- ON-CHAIN VAULT READS & WRITES ---

export const getVaultsByOwner = async (ownerAddress: string): Promise<Vault[]> => {
  if (isMockEnabled()) {
    return getMockVaults().filter(v => v.owner === ownerAddress);
  }
  
  try {
    const rawIds = await simulateSorobanCall(
      VAULT_FACTORY_ID,
      'get_vaults_by_owner',
      [nativeToScVal(ownerAddress, { type: 'address' })]
    );
    
    if (!rawIds || !Array.isArray(rawIds)) {
      return [];
    }
    
    const vaults: Vault[] = [];
    for (const rawId of rawIds) {
      const vaultId = Number(rawId);
      const vault = await getVaultById(vaultId);
      if (vault) {
        vaults.push(vault);
      }
    }
    return vaults;
  } catch (error) {
    console.error('Error fetching vaults by owner:', error);
    return [];
  }
};

export const getVaultById = async (vaultId: number): Promise<Vault | null> => {
  if (isMockEnabled()) {
    return getMockVaults().find(v => v.id === vaultId) || null;
  }
  
  try {
    const vaultAddress = await simulateSorobanCall(
      VAULT_FACTORY_ID,
      'get_vault_address',
      [nativeToScVal(vaultId, { type: 'u64' })]
    );
    
    const owner = await simulateSorobanCall(vaultAddress, 'get_owner', []);
    const rawBeneficiaries = await simulateSorobanCall(vaultAddress, 'get_beneficiaries', []);
    const checkInInterval = await simulateSorobanCall(vaultAddress, 'get_check_in_interval', []);
    const gracePeriod = await simulateSorobanCall(vaultAddress, 'get_grace_period', []);
    const lastCheckIn = await simulateSorobanCall(vaultAddress, 'get_last_check_in', []);
    const state = await simulateSorobanCall(vaultAddress, 'get_state', []);
    const balanceRaw = await simulateSorobanCall(vaultAddress, 'get_balance', []);
    const isExpired = await simulateSorobanCall(vaultAddress, 'is_expired', []);
    
    const beneficiaries = Array.isArray(rawBeneficiaries)
      ? rawBeneficiaries.map((item: any) => ({
          address: typeof item[0] === 'string' ? item[0] : item[0].toString(),
          basisPoints: Number(item[1]),
        }))
      : [];

    const balance = Number(balanceRaw) / 10_000_000;
    const stateStr = parseState(state);
    
    const lastCheckInNum = Number(lastCheckIn);
    const checkInIntervalNum = Number(checkInInterval);
    const gracePeriodNum = Number(gracePeriod);
    const deadlineNum = lastCheckInNum + checkInIntervalNum + gracePeriodNum;

    return {
      id: vaultId,
      address: vaultAddress,
      owner: typeof owner === 'string' ? owner : owner.toString(),
      beneficiaries,
      checkInInterval: checkInIntervalNum,
      gracePeriod: gracePeriodNum,
      lastCheckIn: lastCheckInNum,
      deadline: deadlineNum,
      balance,
      state: stateStr as VaultState,
      isExpired: !!isExpired,
    };
  } catch (error) {
    console.error(`Error fetching vault ${vaultId}:`, error);
    return null;
  }
};

export const getAllExpiredVaults = async (): Promise<Vault[]> => {
  if (isMockEnabled()) {
    return getMockVaults().filter(v => v.isExpired && v.state === 'Active');
  }
  
  try {
    const rawIds = await simulateSorobanCall(
      VAULT_FACTORY_ID,
      'get_all_expired_vaults',
      []
    );
    
    if (!rawIds || !Array.isArray(rawIds)) {
      return [];
    }
    
    const vaults: Vault[] = [];
    for (const rawId of rawIds) {
      const vaultId = Number(rawId);
      const vault = await getVaultById(vaultId);
      if (vault) {
        vaults.push(vault);
      }
    }
    return vaults;
  } catch (error) {
    console.error('Error fetching all expired vaults:', error);
    return [];
  }
};

export const createVault = async (
  owner: string,
  beneficiaries: Beneficiary[],
  checkInInterval: number,
  gracePeriod: number,
  depositAmount: number
): Promise<number> => {
  if (isMockEnabled()) {
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

  const beneficiariesScVal = nativeToScVal(
    beneficiaries.map((b) => [
      nativeToScVal(b.address, { type: 'address' }),
      nativeToScVal(b.basisPoints, { type: 'u32' }),
    ])
  );

  const vaultId = await sendSorobanTransaction(
    owner,
    VAULT_FACTORY_ID,
    'create_vault',
    [
      nativeToScVal(owner, { type: 'address' }),
      beneficiariesScVal,
      nativeToScVal(checkInInterval, { type: 'u64' }),
      nativeToScVal(gracePeriod, { type: 'u64' }),
    ]
  );

  const vaultIdNum = Number(vaultId);

  if (depositAmount > 0) {
    const vaultAddress = await simulateSorobanCall(
      VAULT_FACTORY_ID,
      'get_vault_address',
      [nativeToScVal(vaultIdNum, { type: 'u64' })]
    );

    const stroops = BigInt(Math.floor(depositAmount * 10_000_000));
    await sendSorobanTransaction(
      owner,
      vaultAddress,
      'deposit',
      [nativeToScVal(stroops, { type: 'i128' })]
    );
  }

  return vaultIdNum;
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
  
  const owner = await getWalletAddress();
  const vaultAddress = await simulateSorobanCall(
    VAULT_FACTORY_ID,
    'get_vault_address',
    [nativeToScVal(vaultId, { type: 'u64' })]
  );
  
  const stroops = BigInt(Math.floor(amount * 10_000_000));
  await sendSorobanTransaction(
    owner,
    vaultAddress,
    'deposit',
    [nativeToScVal(stroops, { type: 'i128' })]
  );
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
  
  const owner = await getWalletAddress();
  const vaultAddress = await simulateSorobanCall(
    VAULT_FACTORY_ID,
    'get_vault_address',
    [nativeToScVal(vaultId, { type: 'u64' })]
  );
  
  await sendSorobanTransaction(
    owner,
    vaultAddress,
    'check_in',
    []
  );
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
  
  const owner = await getWalletAddress();
  const vaultAddress = await simulateSorobanCall(
    VAULT_FACTORY_ID,
    'get_vault_address',
    [nativeToScVal(vaultId, { type: 'u64' })]
  );
  
  await sendSorobanTransaction(
    owner,
    vaultAddress,
    'cancel_vault',
    []
  );
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
  
  const owner = await getWalletAddress();
  const vaultAddress = await simulateSorobanCall(
    VAULT_FACTORY_ID,
    'get_vault_address',
    [nativeToScVal(vaultId, { type: 'u64' })]
  );

  const beneficiariesScVal = nativeToScVal(
    beneficiaries.map((b) => [
      nativeToScVal(b.address, { type: 'address' }),
      nativeToScVal(b.basisPoints, { type: 'u32' }),
    ])
  );
  
  await sendSorobanTransaction(
    owner,
    vaultAddress,
    'update_beneficiaries',
    [beneficiariesScVal]
  );
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

    let remaining = balance;
    v.beneficiaries.forEach((b, i) => {
      let amount = Math.floor((balance * b.basisPoints) / 10000);
      if (i === v.beneficiaries.length - 1) {
        amount = remaining;
      }
      remaining -= amount;

      if (amount > 0) {
        updateMockBalanceForAddress(b.address, amount);
        
        addMockLog({
          type: 'FundsDistributed',
          vaultId,
          details: `Distributed ${amount} XLM to beneficiary: ${b.address.substring(0, 8)}...`
        });
      }
    });

    return;
  }
  
  const caller = await getWalletAddress();
  await sendSorobanTransaction(
    caller,
    TRIGGER_ID,
    'trigger_release',
    [nativeToScVal(vaultId, { type: 'u64' })]
  );
};
