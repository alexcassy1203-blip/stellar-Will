#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, Vec, symbol_short as short};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum VaultState {
    Active = 0,
    Triggered = 1,
    Cancelled = 2,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Owner,
    Beneficiaries,
    CheckInInterval,
    GracePeriod,
    LastCheckIn,
    State,
    TriggerContract,
    NativeToken,
    VaultId,
}

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    pub fn initialize(
        env: Env,
        owner: Address,
        beneficiaries: Vec<(Address, u32)>,
        check_in_interval: u64,
        grace_period: u64,
        trigger: Address,
        token: Address,
        vault_id: u64,
    ) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic!("Vault already initialized");
        }

        // Validate beneficiary splits sum to 10000 bps
        let mut total_bp: u32 = 0;
        for item in beneficiaries.iter() {
            let (_, bp) = item;
            total_bp += bp;
        }
        if total_bp != 10000 {
            panic!("Beneficiary splits must total 10000 basis points");
        }

        let current_time = env.ledger().timestamp();

        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Beneficiaries, &beneficiaries);
        env.storage().instance().set(&DataKey::CheckInInterval, &check_in_interval);
        env.storage().instance().set(&DataKey::GracePeriod, &grace_period);
        env.storage().instance().set(&DataKey::LastCheckIn, &current_time);
        env.storage().instance().set(&DataKey::State, &VaultState::Active);
        env.storage().instance().set(&DataKey::TriggerContract, &trigger);
        env.storage().instance().set(&DataKey::NativeToken, &token);
        env.storage().instance().set(&DataKey::VaultId, &vault_id);

        env.events().publish(
            (short!("Created"), vault_id, owner.clone()),
            current_time
        );
    }

    pub fn deposit(env: Env, amount: i128) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let state: VaultState = env.storage().instance().get(&DataKey::State).unwrap();
        if state != VaultState::Active {
            panic!("Vault is not active");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        
        token_client.transfer(&owner, &env.current_contract_address(), &amount);

        let vault_id: u64 = env.storage().instance().get(&DataKey::VaultId).unwrap();
        env.events().publish(
            (symbol_short!("Deposited"), vault_id, owner.clone()),
            amount
        );
    }

    pub fn check_in(env: Env) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let state: VaultState = env.storage().instance().get(&DataKey::State).unwrap();
        if state != VaultState::Active {
            panic!("Vault is not active");
        }

        let current_time = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::LastCheckIn, &current_time);

        let vault_id: u64 = env.storage().instance().get(&DataKey::VaultId).unwrap();
        env.events().publish(
            (symbol_short!("CheckedIn"), vault_id, owner.clone()),
            current_time
        );
    }

    pub fn get_deadline(env: Env) -> u64 {
        let last_check_in: u64 = env.storage().instance().get(&DataKey::LastCheckIn).unwrap();
        let interval: u64 = env.storage().instance().get(&DataKey::CheckInInterval).unwrap();
        let grace: u64 = env.storage().instance().get(&DataKey::GracePeriod).unwrap();
        last_check_in + interval + grace
    }

    pub fn is_expired(env: Env) -> bool {
        let state: VaultState = env.storage().instance().get(&DataKey::State).unwrap_or(VaultState::Cancelled);
        if state != VaultState::Active {
            return false;
        }
        let deadline = Self::get_deadline(env.clone());
        env.ledger().timestamp() > deadline
    }

    pub fn cancel_vault(env: Env) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let state: VaultState = env.storage().instance().get(&DataKey::State).unwrap();
        if state != VaultState::Active {
            panic!("Vault is not active");
        }

        env.storage().instance().set(&DataKey::State, &VaultState::Cancelled);

        let token_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        let balance = token_client.balance(&env.current_contract_address());

        if balance > 0 {
            token_client.transfer(&env.current_contract_address(), &owner, &balance);
        }

        let vault_id: u64 = env.storage().instance().get(&DataKey::VaultId).unwrap();
        env.events().publish(
            (symbol_short!("Cancelled"), vault_id, owner.clone()),
            balance
        );
    }

    pub fn update_beneficiaries(env: Env, new_beneficiaries: Vec<(Address, u32)>) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let state: VaultState = env.storage().instance().get(&DataKey::State).unwrap();
        if state != VaultState::Active {
            panic!("Vault is not active");
        }

        let mut total_bp: u32 = 0;
        for item in new_beneficiaries.iter() {
            let (_, bp) = item;
            total_bp += bp;
        }
        if total_bp != 10000 {
            panic!("Beneficiary splits must total 10000 basis points");
        }

        env.storage().instance().set(&DataKey::Beneficiaries, &new_beneficiaries);

        let vault_id: u64 = env.storage().instance().get(&DataKey::VaultId).unwrap();
        env.events().publish(
            (symbol_short!("BenUpd"), vault_id, owner.clone()),
            new_beneficiaries.clone()
        );
    }

    pub fn release_to_beneficiaries(env: Env) {
        let trigger: Address = env.storage().instance().get(&DataKey::TriggerContract).unwrap();
        trigger.require_auth();

        let state: VaultState = env.storage().instance().get(&DataKey::State).unwrap();
        if state != VaultState::Active {
            panic!("Vault is not active");
        }

        if !Self::is_expired(env.clone()) {
            panic!("Vault is not expired");
        }

        env.storage().instance().set(&DataKey::State, &VaultState::Triggered);

        let token_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        let balance = token_client.balance(&env.current_contract_address());
        let vault_id: u64 = env.storage().instance().get(&DataKey::VaultId).unwrap();

        if balance > 0 {
            let beneficiaries: Vec<(Address, u32)> = env.storage().instance().get(&DataKey::Beneficiaries).unwrap();
            let mut remaining_balance = balance;
            let num_beneficiaries = beneficiaries.len();

            for (i, item) in beneficiaries.iter().enumerate() {
                let (beneficiary_addr, bp) = item;
                let mut amount = (balance * (bp as i128)) / 10000;
                
                if i == (num_beneficiaries - 1) as usize {
                    amount = remaining_balance;
                }

                if amount > 0 {
                    token_client.transfer(&env.current_contract_address(), &beneficiary_addr, &amount);
                    remaining_balance -= amount;
                }

                env.events().publish(
                    (symbol_short!("FundsDist"), vault_id, beneficiary_addr.clone()),
                    amount
                );
            }
        }
    }

    // Getters for frontend and factory lookups
    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }

    pub fn get_beneficiaries(env: Env) -> Vec<(Address, u32)> {
        env.storage().instance().get(&DataKey::Beneficiaries).unwrap()
    }

    pub fn get_check_in_interval(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::CheckInInterval).unwrap()
    }

    pub fn get_grace_period(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::GracePeriod).unwrap()
    }

    pub fn get_last_check_in(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::LastCheckIn).unwrap()
    }

    pub fn get_state(env: Env) -> VaultState {
        env.storage().instance().get(&DataKey::State).unwrap()
    }

    pub fn get_balance(env: Env) -> i128 {
        let token_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.balance(&env.current_contract_address())
    }

    pub fn get_vault_id(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::VaultId).unwrap()
    }
}
