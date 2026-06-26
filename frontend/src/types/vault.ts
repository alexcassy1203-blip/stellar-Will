export type VaultState = 'Active' | 'Triggered' | 'Cancelled';

export interface Beneficiary {
  address: string;
  basisPoints: number; // 0 to 10000 bps
}

export interface Vault {
  id: number;
  address: string;
  owner: string;
  beneficiaries: Beneficiary[];
  checkInInterval: number; // in seconds
  gracePeriod: number; // in seconds
  lastCheckIn: number; // timestamp in seconds
  deadline: number; // timestamp in seconds
  balance: number; // in XLM
  state: VaultState;
  isExpired: boolean;
}

export interface EventLog {
  id: string;
  type: 'CheckedIn' | 'VaultTriggered' | 'FundsDistributed' | 'VaultCreated' | 'Deposited' | 'BeneficiariesUpdated' | 'VaultCancelled';
  vaultId: number;
  timestamp: number;
  details: string;
  txHash?: string;
}
