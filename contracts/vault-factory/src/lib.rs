#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol, Vec};

// Import vault client into its own module to avoid DataKey name clash
mod vault_contract {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/stellar_will_vault.wasm"
    );
}
use vault_contract::Client as VaultClient;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    VaultWasmHash,
    TriggerContract,
    NativeToken,
    VaultCount,
    Vault(u64),
    OwnerVaults(Address),
    VaultOwner(u64),
}

#[contract]
pub struct VaultFactory;

#[contractimpl]
impl VaultFactory {
    pub fn initialize(env: Env, admin: Address, vault_wasm_hash: BytesN<32>, native_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Factory already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VaultWasmHash, &vault_wasm_hash);
        env.storage().instance().set(&DataKey::NativeToken, &native_token);
        env.storage().instance().set(&DataKey::VaultCount, &0u64);
    }

    pub fn set_trigger_address(env: Env, trigger: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::TriggerContract, &trigger);
    }

    pub fn get_trigger_address(env: Env) -> Address {
        env.storage().instance().get(&DataKey::TriggerContract).unwrap()
    }

    pub fn get_native_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::NativeToken).unwrap()
    }

    pub fn create_vault(
        env: Env,
        owner: Address,
        beneficiaries: Vec<(Address, u32)>,
        check_in_interval: u64,
        grace_period: u64,
    ) -> u64 {
        owner.require_auth();

        let mut vault_count: u64 = env.storage().instance().get(&DataKey::VaultCount).unwrap_or(0);
        vault_count += 1;
        env.storage().instance().set(&DataKey::VaultCount, &vault_count);

        let wasm_hash: BytesN<32> = env.storage().instance().get(&DataKey::VaultWasmHash).unwrap();
        let trigger: Address = env
            .storage()
            .instance()
            .get(&DataKey::TriggerContract)
            .expect("Trigger not set");
        let token: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();

        // Deterministic salt from vault_id
        let mut salt_bytes = [0u8; 32];
        let id_bytes = vault_count.to_be_bytes();
        for i in 0..8 {
            salt_bytes[i] = id_bytes[i];
        }
        let salt = BytesN::from_array(&env, &salt_bytes);

        // Deploy vault instance from stored WASM hash
        let vault_address = env.deployer().with_current_contract(salt).deploy(wasm_hash);

        // Initialize via imported client (interface only — no symbol clash)
        let vault_client = VaultClient::new(&env, &vault_address);
        vault_client.initialize(
            &owner,
            &beneficiaries,
            &check_in_interval,
            &grace_period,
            &trigger,
            &token,
            &vault_count,
        );

        // Registry
        env.storage().instance().set(&DataKey::Vault(vault_count), &vault_address);
        env.storage().instance().set(&DataKey::VaultOwner(vault_count), &owner);

        let mut owner_vaults: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::OwnerVaults(owner.clone()))
            .unwrap_or(Vec::new(&env));
        owner_vaults.push_back(vault_count);
        env.storage()
            .instance()
            .set(&DataKey::OwnerVaults(owner.clone()), &owner_vaults);

        env.events().publish(
            (symbol_short!("Created"), vault_count, owner.clone()),
            vault_address.clone(),
        );

        vault_count
    }

    pub fn get_vault_address(env: Env, vault_id: u64) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Vault(vault_id))
            .expect("Vault does not exist")
    }

    pub fn get_vaults_by_owner(env: Env, owner: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::OwnerVaults(owner))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vault_owner(env: Env, vault_id: u64) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::VaultOwner(vault_id))
            .expect("Vault does not exist")
    }

    pub fn get_vault_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::VaultCount).unwrap_or(0)
    }

    pub fn get_all_expired_vaults(env: Env) -> Vec<u64> {
        let vault_count: u64 = env.storage().instance().get(&DataKey::VaultCount).unwrap_or(0);
        let mut expired = Vec::new(&env);
        for i in 1..=vault_count {
            if let Some(vault_address) = env
                .storage()
                .instance()
                .get::<_, Address>(&DataKey::Vault(i))
            {
                let vault_client = VaultClient::new(&env, &vault_address);
                if vault_client.is_expired() {
                    expired.push_back(i);
                }
            }
        }
        expired
    }
}

#[cfg(test)]
mod test;
