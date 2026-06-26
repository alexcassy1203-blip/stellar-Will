#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol, Vec,
};

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

    /// Anyone can call this once the vault deadline has passed.
    pub fn trigger_release(env: Env, vault_id: u64) {
        let factory_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Factory)
            .unwrap();

        // Get vault address from factory via cross-contract invocation
        let vault_addr: Address = env.invoke_contract(
            &factory_addr,
            &Symbol::new(&env, "get_vault_address"),
            Vec::from_array(&env, [soroban_sdk::IntoVal::<Env, soroban_sdk::Val>::into_val(&vault_id, &env)]),
        );

        // Check if vault is expired
        let expired: bool = env.invoke_contract(
            &vault_addr,
            &Symbol::new(&env, "is_expired"),
            Vec::new(&env),
        );

        if !expired {
            panic!("VaultNotExpired");
        }

        // Call release_to_beneficiaries
        env.invoke_contract::<()>(
            &vault_addr,
            &Symbol::new(&env, "release_to_beneficiaries"),
            Vec::new(&env),
        );

        env.events().publish(
            (symbol_short!("Triggered"), vault_id),
            env.ledger().timestamp(),
        );
    }
}
