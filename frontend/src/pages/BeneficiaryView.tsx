import React, { useState, useEffect } from 'react';
import { Shield, Clock, Info, RefreshCw } from 'lucide-react';
import { Vault } from '../types/vault';
import { getMockVaults } from '../lib/stellar';
import { useWallet } from '../hooks/useWallet';
import { CountdownTimer } from '../components/CountdownTimer';

export const BeneficiaryView: React.FC = () => {
  const { address } = useWallet();
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<{ vault: Vault; sharePercent: number; expectedPayout: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchBeneficiaryVaults = () => {
      if (!address) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const allVaults = getMockVaults();
        const filtered = allVaults
          .filter(v => v.state === 'Active' && v.beneficiaries.some(b => b.address === address))
          .map(v => {
            const ben = v.beneficiaries.find(b => b.address === address)!;
            const sharePercent = ben.basisPoints / 100;
            const expectedPayout = (ben.basisPoints / 10000) * v.balance;
            return {
              vault: v,
              sharePercent,
              expectedPayout
            };
          });
        setBeneficiaryVaults(filtered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBeneficiaryVaults();
  }, [address, refreshTrigger]);

  const totalExpected = beneficiaryVaults.reduce((acc, item) => acc + item.expectedPayout, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border border-gray-800">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">Expected Payouts</span>
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {totalExpected.toLocaleString()} <span className="text-sm font-medium text-purple-400">XLM</span>
          </span>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border border-gray-800">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">Active Testaments</span>
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {beneficiaryVaults.length} <span className="text-sm font-medium text-gray-500">vaults</span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-200">Vaults Designating Me</h3>
          <button
            onClick={() => setRefreshTrigger(t => t + 1)}
            className="flex items-center space-x-1.5 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh list</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-xs text-gray-500 font-mono">Scanning registry...</span>
          </div>
        ) : beneficiaryVaults.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 border border-gray-800 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-gray-900/40 border border-gray-800/80 rounded-full text-gray-500">
              <Info className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h4 className="text-base font-bold text-gray-200">No Designations Found</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your connected wallet is not listed as a beneficiary in any active vault. If a vault owner designated your address, ensure your wallet is switched to that address in the header.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beneficiaryVaults.map(({ vault, sharePercent, expectedPayout }) => (
              <div
                key={vault.id}
                className="glass-card rounded-2xl p-5 border border-purple-500/10 bg-gradient-to-b from-gray-950/20 to-indigo-950/5 flex flex-col justify-between h-[230px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-purple-400">
                      <Shield className="w-4 h-4" />
                      <h4 className="font-bold text-sm">Vault #{vault.id} Designation</h4>
                    </div>
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold">
                      {sharePercent}% Share
                    </span>
                  </div>

                  <div className="space-y-1 mb-4">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">EXPECTED INHERITANCE</span>
                    <span className="text-2xl font-extrabold font-mono text-white">
                      {expectedPayout.toLocaleString()} <span className="text-xs text-purple-400 font-normal">XLM</span>
                    </span>
                    <span className="text-[10px] text-gray-500 block">Total Vault Balance: {vault.balance.toLocaleString()} XLM</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800/80 pt-3">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Countdown:</span>
                  </div>
                  <CountdownTimer
                    deadline={vault.lastCheckIn + vault.checkInInterval + vault.gracePeriod}
                    state={vault.state}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
