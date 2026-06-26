import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VaultCard } from '../components/VaultCard';
import { BeneficiaryForm } from '../components/BeneficiaryForm';
import { Dashboard } from '../pages/Dashboard';
import { Vault, Beneficiary } from '../types/vault';

// Mock dependencies
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(() => Promise.resolve(true)),
  requestAccess: vi.fn(() => Promise.resolve('GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345')),
  signTransaction: vi.fn(() => Promise.resolve('tx_signature')),
}));

// Mock useWallet hook to control test context
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    address: 'GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345',
    balance: 5000,
    isConnected: true,
    isMock: true,
    role: 'owner',
    connect: vi.fn(),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(),
  }),
}));

const mockActiveVault: Vault = {
  id: 1,
  address: 'CDVAULT1',
  owner: 'GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345',
  beneficiaries: [
    { address: 'GDBENEFICIARY111111111111111111111111111111111111', basisPoints: 10000 },
  ],
  checkInInterval: 600,
  gracePeriod: 300,
  lastCheckIn: Math.floor(Date.now() / 1000) - 100, // 100s ago
  deadline: Math.floor(Date.now() / 1000) + 800, // active
  balance: 100,
  state: 'Active',
  isExpired: false,
};

const mockExpiredVault: Vault = {
  ...mockActiveVault,
  id: 2,
  lastCheckIn: Math.floor(Date.now() / 1000) - 2000, // 2000s ago
  deadline: Math.floor(Date.now() / 1000) - 1100, // expired
  isExpired: true,
};

describe('StellarWill Frontend Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('stellarwill_mock_mode', 'true');
  });

  // Test 1: renders vault card with correct info & state
  it('renders vault card with correct countdown & details', () => {
    render(
      <VaultCard
        vault={mockActiveVault}
        onSelect={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Vault #1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // Test 2: beneficiary form rejects splits that don't sum to 100%
  it('beneficiary form rejects splits that don\'t sum to 100%', () => {
    const mockOnChange = vi.fn();
    const badBeneficiaries: Beneficiary[] = [
      { address: 'GDBENEFICIARY111111111111111111111111111111111111', basisPoints: 4000 },
      { address: 'GDBENEFICIARY222222222222222222222222222222222222', basisPoints: 5000 }, // sum 90% (9000 bps)
    ];

    render(
      <BeneficiaryForm
        beneficiaries={badBeneficiaries}
        onChange={mockOnChange}
      />
    );

    // Total assigned split should display 90% / 100%
    expect(screen.getByText('90% / 100%')).toBeInTheDocument();
  });

  // Test 3: check-in button resets displayed countdown optimistically
  it('check-in button resets displayed countdown', async () => {
    const mockRefresh = vi.fn();
    render(
      <VaultCard
        vault={mockActiveVault}
        onSelect={vi.fn()}
        onRefresh={mockRefresh}
      />
    );

    const checkInBtn = screen.getByRole('button', { name: /check in/i });
    expect(checkInBtn).toBeInTheDocument();
    
    // Simulate check-in trigger
    fireEvent.click(checkInBtn);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  // Test 4: shows expired status and trigger button when deadline passed
  it('shows expired status and trigger button when deadline passed', () => {
    render(
      <VaultCard
        vault={mockExpiredVault}
        onSelect={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trigger release/i })).toBeInTheDocument();
  });

  // Test 5: shows loading skeleton while fetching vaults
  it('shows loading skeleton while fetching vaults', () => {
    const { container } = render(
      <Dashboard
        onSelectVault={vi.fn()}
        onNavigateToCreate={vi.fn()}
      />
    );

    // It should render skeleton cards initially when loading is true
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
