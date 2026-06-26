import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, PlayCircle, RefreshCw } from 'lucide-react';
import { Vault } from '../types/vault';
import { getAllExpiredVaults, triggerRelease } from '../lib/stellar';
import confetti from 'canvas-confetti';

export const PublicTriggers: React.FC = () => {
  const [expiredVaults, setExpiredVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchExpired = async () => {
      setLoading(true);
      try {
        const data = await getAllExpiredVaults();
        setExpiredVaults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExpired();
  }, [refreshTrigger]);

  const handleTrigger = async (vaultId: number) => {
    setTriggeringId(vaultId);
    setErrorMessage('');
    try {
      await triggerRelease(vaultId);
      confetti({
        particleCount: 150,
        spread: 80,
        colors: ['#6366f1', '#a855f7', '#ec4899'],
        origin: { y: 0.8 }
      });
      // Refresh list
      setRefreshTrigger(t => t + 1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Trigger execution failed');
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Public Trigger Registry</h2>
        <p className="text-xs text-gray-500">
          Permissionless registry. Anyone can execute a dead man's switch after a vault owner fails to check-in before their grace period ends.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-xs text-red-400 font-mono">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs text-gray-500 font-mono">Scanning registry...</span>
        </div>
      ) : expiredVaults.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-gray-800 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/20 rounded-full text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h4 className="text-base font-bold text-gray-200">All Vaults Secure</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              No expired vaults were found. All active vault owners have successfully completed their check-in protocols.
            </p>
          </div>
          <button
            onClick={() => setRefreshTrigger(t => t + 1)}
            className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Registry Again</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiredVaults.map(vault => {
            const totalBeneficiaryBP = vault.beneficiaries.reduce((acc, b) => acc + b.basisPoints, 0);
            return (
              <div
                key={vault.id}
                className="glass-card rounded-2xl p-5 border border-red-500/10 bg-gradient-to-br from-red-950/5 to-gray-950/10 flex flex-col justify-between h-[230px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-red-400">
                      <ShieldAlert className="w-4 h-4 animate-pulse" />
                      <h4 className="font-bold text-sm">Expired Vault #{vault.id}</h4>
                    </div>
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold">
                      Triggerable
                    </span>
                  </div>

                  <div className="space-y-1 mb-4">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">LOCKED BALANCE</span>
                    <span className="text-2xl font-extrabold font-mono text-white">
                      {vault.balance.toLocaleString()} <span className="text-xs text-purple-400 font-normal">XLM</span>
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 font-mono">
                    <div className="flex justify-between py-0.5">
                      <span>Owner:</span>
                      <span className="text-gray-300 truncate pl-4 max-w-[200px]">{vault.owner}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span>Beneficiaries:</span>
                      <span className="text-gray-300">{vault.beneficiaries.length} ({totalBeneficiaryBP / 100}%)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTrigger(vault.id)}
                  disabled={triggeringId === vault.id}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800/40 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-red-600/10"
                >
                  {triggeringId === vault.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Release Funds Permissionlessly</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
