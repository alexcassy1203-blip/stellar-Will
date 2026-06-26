import {
  rpc,
  Horizon,
  Contract,
  TransactionBuilder,
  Keypair,
  nativeToScVal,
  Account,
} from '@stellar/stellar-sdk';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Testnet Config
const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Contract IDs
const VAULT_FACTORY_ID = 'CBOAG32YGYOHS5COY6CS3QL4YW7EWXTJTE6WJDFTDNOQ2OGZW66VFSFT';
const TRIGGER_ID = 'CBNMAGSGVGIVR4ORJKFZPH24EIQ3NWSHVQAEHSO5OZ66HIGNYEYAPAFL';

const rpcServer = new rpc.Server(RPC_URL);
const horizonServer = new Horizon.Server(HORIZON_URL);

// Environment setup
const envPath = path.join(__dirname, '.env');
let KEEPER_SECRET = '';

function loadEnv() {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/KEEPER_SECRET=(.*)/);
    if (match) {
      KEEPER_SECRET = match[1].trim();
    }
  }
}

async function fundKeeperAccount() {
  loadEnv();
  if (!KEEPER_SECRET) {
    console.log('No KEEPER_SECRET found. Generating a new Keypair...');
    const kp = Keypair.random();
    KEEPER_SECRET = kp.secret();
    fs.writeFileSync(envPath, `KEEPER_SECRET=${KEEPER_SECRET}\n`);
    
    console.log(`New Keeper Public Key: ${kp.publicKey()}`);
    console.log('Funding via Friendbot...');
    
    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(kp.publicKey())}`);
      await response.json();
      console.log('Successfully funded Keeper account via Friendbot!\n');
    } catch (e) {
      console.error('Friendbot funding failed:', e);
    }
  } else {
    console.log(`Loaded Keeper Public Key: ${Keypair.fromSecret(KEEPER_SECRET).publicKey()}`);
  }
}

// Simulate fetching all expired vaults
async function getAllExpiredVaults() {
  const dummySource = new Account("GDV5LHWHXDHGY4PEOG6HDKTC4HL64GTUR5LGDTYGAHW4NQUZGAVGNAVP", "0");
  const contract = new Contract(VAULT_FACTORY_ID);
  const tx = new TransactionBuilder(dummySource, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  .addOperation(
    contract.call('get_all_expired_vaults')
  )
  .setTimeout(30)
  .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(simResult) && simResult.result && simResult.result.retval) {
    const rawIds = simResult.result.retval;
    // scValToNative doesn't work out of the box without the contract parser sometimes,
    // let's manually unpack the vector of u64 if it's a vec.
    if (rawIds.vec && rawIds.vec()) {
      return rawIds.vec().map(v => Number(v.u64()));
    }
  }
  return [];
}

// Submit Trigger Release Transaction
async function triggerRelease(vaultId, kp) {
  console.log(`Attempting to trigger release for Vault #${vaultId}...`);
  try {
    const account = await rpcServer.getAccount(kp.publicKey());
    
    const contract = new Contract(TRIGGER_ID);
    const tx = new TransactionBuilder(account, {
      fee: "5000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
    .addOperation(
      contract.call('trigger_release', nativeToScVal(vaultId, { type: 'u64' }))
    )
    .setTimeout(60)
    .build();

    const simResult = await rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    const assembledTx = rpc.assembleTransaction(tx, simResult).build();
    assembledTx.sign(kp);

    const response = await rpcServer.sendTransaction(assembledTx);
    
    if (response.status === 'ERROR') {
      throw new Error(`Transaction submission failed: ${response.errorResultXdr}`);
    }

    console.log(`Transaction sent for Vault #${vaultId}. Hash: ${response.hash}`);
    let status = response.status;
    
    for (let i = 0; i < 20; i++) {
      if (status === 'SUCCESS') {
        console.log(`Successfully triggered release for Vault #${vaultId}!`);
        return true;
      }
      if (status === 'FAILED') {
        throw new Error(`Transaction failed: ${response.hash}`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const txResult = await rpcServer.getTransaction(response.hash);
      status = txResult.status;
      if (status === 'SUCCESS') {
         console.log(`Successfully triggered release for Vault #${vaultId}!`);
         return true;
      }
      if (status === 'FAILED') {
         throw new Error(`Transaction failed: ${txResult.resultXdr}`);
      }
    }
  } catch (error) {
    console.error(`Error triggering release for Vault #${vaultId}:`, error.message);
  }
  return false;
}

async function startKeeper() {
  await fundKeeperAccount();
  const kp = Keypair.fromSecret(KEEPER_SECRET);

  console.log('StellarWill Keeper Bot initialized! Polling for expired vaults every 1 minute...\n');

  cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Checking for expired vaults...`);
    try {
      const expiredVaults = await getAllExpiredVaults();
      if (expiredVaults.length === 0) {
        console.log('No expired vaults found.');
        return;
      }

      console.log(`Found ${expiredVaults.length} expired vault(s): [${expiredVaults.join(', ')}]`);
      
      for (const vaultId of expiredVaults) {
        await triggerRelease(vaultId, kp);
      }
      
    } catch (error) {
      console.error('Error during polling:', error);
    }
  });
}

startKeeper();
