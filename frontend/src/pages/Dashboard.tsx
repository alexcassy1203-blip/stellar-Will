import React, { useState, useEffect } from 'react';
import { VaultCard } from '../components/VaultCard';
import { LiveFeed } from '../components/LiveFeed';
import { Vault } from '../types/vault';
import { getVaultsByOwner } from '../lib/stellar';
import { useWallet } from '../hooks/useWallet';
import { Plus, Info } from 'lucide-react';

interface DashboardProps {
  onSelectVault: (vaultId: number) => void;
  onNavigateToCreate: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectVault, onNavigateToCreate }) => {
  const { address } = useWallet();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchVaults = async () => {
      if (!address) return;
      setLoading(true);
      try {
        const data = await getVaultsByOwner(address);
        setVaults(data);
      } catch (err) {
        console.error('Error fetching vaults:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVaults();
  }, [address, refreshTrigger]);

  const totalLocked = vaults.reduce((acc, v) => v.state === 'Active' ? acc + v.balance : acc, 0);
  const activeCount = vaults.filter(v => v.state === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border border-gray-800">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">Total Vault Capital</span>
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {totalLocked.toLocaleString()} <span className="text-sm font-medium text-purple-400">XLM</span>
          </span>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border border-gray-800">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">Active Switches</span>
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {activeCount} <span className="text-sm font-medium text-gray-500">vaults</span>
          </span>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border border-gray-800 bg-gradient-to-br from-purple-950/20 to-indigo-950/10">
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider block mb-1">Status Summary</span>
          <p className="text-xs text-gray-400 leading-relaxed">
            Owner check-in resets the timer. If deadline passes, beneficiaries trigger distribution permissionlessly.
          </p>
        </div>
      </div>

      {/* Main Grid: My Vaults & Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vault list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-200">My Inheritances</h3>
            <button
              onClick={onNavigateToCreate}
              className="flex items-center space-x-1.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Vault</span>
            </button>
          </div>

          {loading ? (
            // Skeletons
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(n => (
                <div key={n} className="glass-card rounded-2xl p-5 border border-gray-800 animate-pulse h-[280px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 w-20 bg-gray-800 rounded-lg"></div>
                      <div className="h-5 w-16 bg-gray-800 rounded-lg"></div>
                    </div>
                    <div className="h-8 w-32 bg-gray-800 rounded-lg mb-4"></div>
                    <div className="h-4 w-40 bg-gray-800 rounded-lg"></div>
                  </div>
                  <div className="h-8 w-full bg-gray-800 rounded-lg border-t border-gray-900 pt-3"></div>
                </div>
              ))}
            </div>
          ) : vaults.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 border border-gray-800 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-purple-950/30 border border-purple-800/20 rounded-full text-purple-400">
                <Info className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="text-base font-bold text-gray-200">No Vaults Found</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You haven't created a digital inheritance vault on this account. Set up beneficiaries, deposit XLM, and manage your switch.
                </p>
              </div>
              <button
                onClick={onNavigateToCreate}
                className="bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-purple-600/10"
              >
                Create First Vault
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vaults.map(vault => (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  onSelect={onSelectVault}
                  onRefresh={() => setRefreshTrigger(t => t + 1)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Event feed */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-200">Audit Feed</h3>
          <LiveFeed />
        </div>
      </div>
    </div>
  );
};
