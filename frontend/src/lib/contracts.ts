// Soroban Testnet Contract IDs for StellarWill
export const NATIVE_TOKEN_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // XLM Native Token

// These will be populated upon deploying to Testnet.
// For development/mock/demo purposes, we use standard dummy IDs.
export const VAULT_FACTORY_ID = 'CBOAG32YGYOHS5COY6CS3QL4YW7EWXTJTE6WJDFTDNOQ2OGZW66VFSFT';
export const TRIGGER_ID = 'CBNMAGSGVGIVR4ORJKFZPH24EIQ3NWSHVQAEHSO5OZ66HIGNYEYAPAFL';

// Helper to determine if we are in mockup mode
export const isMockEnabled = () => {
  return false;
};

export const setMockEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('stellarwill_mock_mode', String(enabled));
    window.location.reload();
  }
};
