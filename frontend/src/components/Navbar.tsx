import React from 'react';
import { Shield, Wallet, Settings } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { setMockWallet } from '../lib/stellar';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSimulateTime: (seconds: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onSimulateTime }) => {
  const { address, balance, isConnected, isMock, connect, disconnect, toggleMockMode } = useWallet();

  const handleMockAddressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMockWallet(e.target.value);
    // Reload is handled inside setMockWallet's helper
    window.location.reload();
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent tracking-wide">
              StellarWill
            </span>
            {isMock && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 border border-purple-500/30 rounded-full font-mono">
                Demo Mode
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {[
              { id: 'dashboard', label: 'My Vaults' },
              { id: 'create', label: 'Create Vault' },
              { id: 'triggers', label: 'Public Triggers' },
              { id: 'beneficiary', label: 'Beneficiary View' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600/10 border border-purple-500/30 text-purple-300'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            {/* Time Simulation Shortcuts (Mock Mode only) */}
            {isMock && (
              <div className="flex items-center space-x-1 border border-gray-800 bg-gray-900/50 rounded-xl p-1 text-xs">
                <span className="text-gray-500 px-2 font-mono">Simulate:</span>
                <button
                  onClick={() => onSimulateTime(60)}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition font-mono"
                  title="Simulate 1 Minute Passing"
                >
                  +1m
                </button>
                <button
                  onClick={() => onSimulateTime(180)}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition font-mono"
                  title="Simulate 3 Minutes Passing"
                >
                  +3m
                </button>
              </div>
            )}

            {/* Mock Account Swapper */}
            {isMock && (
              <div className="flex items-center">
                <select
                  value={address}
                  onChange={handleMockAddressChange}
                  className="bg-gray-950/80 border border-gray-800 text-xs text-gray-300 rounded-xl px-2 py-1.5 focus:outline-none focus:border-purple-500/50 cursor-pointer font-mono"
                >
                  <option value="GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345">
                    Owner Wallet (Active)
                  </option>
                  <option value="GDBENEFICIARY111111111111111111111111111111111111">
                    Beneficiary 1 (40%)
                  </option>
                  <option value="GDBENEFICIARY222222222222222222222222222222222222">
                    Beneficiary 2 (60%)
                  </option>
                  <option value="GDSTRANGER99999999999999999999999999999999999999">
                    Stranger / Keeper
                  </option>
                </select>
              </div>
            )}

            {/* Wallet Info / Connection */}
            {isConnected ? (
              <div className="flex items-center space-x-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5">
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-xs text-gray-500 font-mono">
                    {truncateAddress(address)}
                  </span>
                  <span className="text-sm font-semibold text-purple-400 font-mono">
                    {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition"
                  title="Disconnect Wallet"
                >
                  <Wallet className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all shadow-lg shadow-purple-600/10"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Mode Switcher */}
            <button
              onClick={() => toggleMockMode(!isMock)}
              className={`p-2 rounded-xl border transition ${
                isMock
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                  : 'border-gray-800 text-gray-500 hover:text-gray-400 hover:bg-gray-800/40'
              }`}
              title={isMock ? 'Switch to Testnet (Freighter)' : 'Switch to Demo (Mock)'}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation (Stacked below header) */}
        <div className="md:hidden flex justify-around py-2 border-t border-gray-900 bg-gray-950/20">
          {[
            { id: 'dashboard', label: 'Vaults' },
            { id: 'create', label: 'Create' },
            { id: 'triggers', label: 'Triggers' },
            { id: 'beneficiary', label: 'Beneficiary' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600/10 border border-purple-500/20 text-purple-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
