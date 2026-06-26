// Soroban Testnet Contract IDs for StellarWill
export const NATIVE_TOKEN_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJBMGLPTURV63VXVV25Y2NSKVNHYMTMG2'; // XLM Native Token

// These will be populated upon deploying to Testnet.
// For development/mock/demo purposes, we use standard dummy IDs.
export const VAULT_FACTORY_ID = 'CAK33WOB6GXZIEML7Z5U4U74N54J3QZ5XVDL63X4Z3XWURQ3N5WFACTORY';
export const TRIGGER_ID = 'CBK33WOB6GXZIEML7Z5U4U74N54J3QZ5XVDL63X4Z3XWURQ3N5WTRIGGER';

// Helper to determine if we are in mockup mode
export const isMockEnabled = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('stellarwill_mock_mode') === 'true';
  }
  return false;
};

export const setMockEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('stellarwill_mock_mode', String(enabled));
    window.location.reload();
  }
};
