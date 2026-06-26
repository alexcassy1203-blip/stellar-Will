.PHONY: build-contracts test-contracts build-frontend test-frontend deploy-testnet deploy-frontend lint

build-contracts:
	cargo build --release --target wasm32-unknown-unknown --workspace

test-contracts:
	cargo test --workspace

build-frontend:
	cd frontend && npm install && npm run build

test-frontend:
	cd frontend && npm test -- --watchAll=false

lint:
	cd frontend && npm run lint
	cargo fmt --all -- --check
	cargo clippy --workspace -- -D warnings

deploy-testnet: build-contracts
	stellar contract install \
		--wasm target/wasm32-unknown-unknown/release/stellar_will_vault.wasm \
		--source deployer \
		--network testnet
	stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/stellar_will_trigger.wasm \
		--source deployer \
		--network testnet
	stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/stellar_will_vault_factory.wasm \
		--source deployer \
		--network testnet

deploy-frontend:
	cd frontend && npx netlify deploy --prod
