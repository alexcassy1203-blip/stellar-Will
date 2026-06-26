#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Factory,
}

#[contract]
pub struct Trigger;

#[contractimpl]
impl Trigger {
    pub fn initialize(env: Env, factory: Address) {
        if env.storage().instance().has(&DataKey::Factory) {
            panic!("Trigger already initialized");
        }
        env.storage().instance().set(&DataKey::Factory, &factory);
    }

    pub fn get_factory(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Factory).unwrap()
    }

    pub fn trigger_release(env: Env, vault_id: u64) {
        let factory_addr: Address = env.storage().instance().get(&DataKey::Factory).unwrap();
        let factory_client = stellar_will_vault_factory::VaultFactoryClient::new(&env, &factory_addr);

        // Retrieve vault address from factory
        let vault_addr = factory_client.get_vault_address(&vault_id);
        let vault_client = stellar_will_vault::VaultClient::new(&env, &vault_addr);

        // Check if vault is expired
        if !vault_client.is_expired() {
            panic!("VaultNotExpired");
        }

        // Call release_to_beneficiaries.
        // Vault expects trigger to be the caller and authenticate.
        // In Soroban, since this is trigger contract invoking it, we must verify authentication.
        // Wait, inside Vault::release_to_beneficiaries, we did:
        // let trigger = env.storage().instance().get(&DataKey::TriggerContract).unwrap();
        // trigger.require_auth();
        // Here, since current_contract_address() is the trigger, the Vault client call will be authenticated
        // automatically when Trigger contract calls it (contracts have their own authentication context).
        // Let's call release_to_beneficiaries.
        vault_client.release_to_beneficiaries();

        // Emit trigger event
        env.events().publish(
            (symbol_short!("Triggered"), vault_id),
            env.ledger().timestamp(),
        );
    }
}
