import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserCheck, Trash2, ArrowUpCircle, Clock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Vault, Beneficiary, EventLog } from '../types/vault';
import { getVaultById, checkInVault, depositVault, cancelVault, updateBeneficiaries, getMockLogs } from '../lib/stellar';
import { useWallet } from '../hooks/useWallet';
import { CountdownTimer } from '../components/CountdownTimer';
import { BeneficiaryForm } from '../components/BeneficiaryForm';
import confetti from 'canvas-confetti';

interface VaultDetailProps {
  vaultId: number;
  onBackToDashboard: () => void;
}

export const VaultDetail: React.FC<VaultDetailProps> = ({ vaultId, onBackToDashboard }) => {
  const { address, balance, refreshBalance } = useWallet();
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States for actions
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [isUpdatingBen, setIsUpdatingBen] = useState(false);
  const [newBeneficiaries, setNewBeneficiaries] = useState<Beneficiary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<EventLog[]>([]);

  const fetchVault = async () => {
    try {
      const data = await getVaultById(vaultId);
      if (data) {
        setVault(data);
        setNewBeneficiaries(data.beneficiaries);
        
        // Filter logs for this vault
        const logs = getMockLogs().filter(l => l.vaultId === vaultId);
        setHistory(logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, [vaultId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-xs text-gray-500 font-mono">Loading vault details...</span>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-gray-200">Vault Not Found</h3>
        <button onClick={onBackToDashboard} className="text-purple-400 hover:underline text-sm font-semibold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isOwner = address === vault.owner;
  const isActive = vault.state === 'Active';

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await checkInVault(vault.id);
      confetti({ particleCount: 80, spread: 60 });
      await fetchVault();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount <= 0) return;
    if (balance < topUpAmount) {
      setErrorMessage('Insufficient balance to top up');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await depositVault(vault.id, topUpAmount);
      confetti({ particleCount: 50, spread: 40 });
      setTopUpAmount(0);
      refreshBalance();
      await fetchVault();
    } catch (err: any) {
      setErrorMessage(err.message || 'Deposit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this vault? All locked XLM will be refunded to your address.')) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await cancelVault(vault.id);
      refreshBalance();
      onBackToDashboard();
    } catch (err: any) {
      setErrorMessage(err.message || 'Cancellation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBeneficiaries = async () => {
    const totalBP = newBeneficiaries.reduce((acc, b) => acc + b.basisPoints, 0);
    if (totalBP !== 10000) {
      setErrorMessage('Beneficiary splits must total 100%');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await updateBeneficiaries(vault.id, newBeneficiaries);
      setIsUpdatingBen(false);
      await fetchVault();
    } catch (err: any) {
      setErrorMessage(err.message || 'Updating beneficiaries failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-100">Vault Details #{vault.id}</h2>
            <span className="text-[10px] text-gray-500 font-mono block">ADDRESS: {vault.address}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isActive && isOwner && (
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-medium text-xs px-3 py-2 rounded-xl transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Vault</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-xs text-red-400 font-mono">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details and History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Locked Capital */}
            <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Vault Capital</span>
                <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
                  {vault.balance.toLocaleString()} <span className="text-xs text-purple-400 font-normal">XLM</span>
                </span>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Countdown timer */}
            <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Time Remaining</span>
                <div className="text-base font-bold text-white">
                  <CountdownTimer 
                    deadline={
                      isOwner 
                        ? vault.lastCheckIn + vault.checkInInterval 
                        : vault.lastCheckIn + vault.checkInInterval + vault.gracePeriod
                    } 
                    state={vault.state} 
                  />
                </div>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* History / Event Logs */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
            <h3 className="font-semibold text-gray-300 text-sm">Vault Logs & Activity</h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-gray-500 text-xs font-mono text-center py-6">No historical actions logged</p>
              ) : (
                history.map(log => (
                  <div key={log.id} className="p-2.5 bg-gray-950/40 border border-gray-800/80 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-mono">{log.details}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(log.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="space-y-6">
          {/* Status Panel */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
            <h3 className="font-semibold text-gray-300 text-sm">Switch Status</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <span className="text-gray-500">Status:</span>
              <span className="text-white font-bold">{vault.state}</span>

              <span className="text-gray-500">Interval:</span>
              <span className="text-gray-300">{vault.checkInInterval}s</span>

              <span className="text-gray-500">Grace:</span>
              <span className="text-gray-300">{vault.gracePeriod}s</span>

              <span className="text-gray-500">Last Check-in:</span>
              <span className="text-gray-300">{new Date(vault.lastCheckIn * 1000).toLocaleTimeString()}</span>
            </div>

            {isOwner && isActive && (
              <button
                onClick={handleCheckIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/30 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>Send Active Check-In</span>
              </button>
            )}
          </div>

          {/* Deposit Capital (Top Up) */}
          {isOwner && isActive && (
            <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
              <h3 className="font-semibold text-gray-300 text-sm">Top Up Capital</h3>
              <form onSubmit={handleTopUp} className="space-y-3">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Amount to add"
                      value={topUpAmount || ''}
                      onChange={(e) => setTopUpAmount(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg glass-input"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-purple-400 font-mono">XLM</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={topUpAmount <= 0 || isSubmitting}
                  className="w-full flex items-center justify-center space-x-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900/30 text-gray-200 font-bold py-2 rounded-xl text-xs transition border border-gray-700"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>Deposit Payout Capital</span>
                </button>
              </form>
            </div>
          )}

          {/* Beneficiary Shares */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-300 text-sm">Legacy Beneficiaries</h3>
              {isOwner && isActive && (
                <button
                  onClick={() => setIsUpdatingBen(!isUpdatingBen)}
                  className="text-xs text-purple-400 hover:underline font-semibold"
                >
                  {isUpdatingBen ? 'Cancel Edit' : 'Edit Splits'}
                </button>
              )}
            </div>

            {isUpdatingBen ? (
              <div className="space-y-4">
                <BeneficiaryForm beneficiaries={newBeneficiaries} onChange={setNewBeneficiaries} />
                <button
                  onClick={handleUpdateBeneficiaries}
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  Save Splits
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {vault.beneficiaries.map((b, i) => {
                  const share = (b.basisPoints / 10000) * vault.balance;
                  return (
                    <div key={i} className="p-2.5 bg-gray-950/40 border border-gray-800/80 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-mono text-gray-400 text-[10px]">
                        <span>BENEFICIARY #{i + 1}</span>
                        <span>{b.basisPoints / 100}%</span>
                      </div>
                      <div className="flex justify-between font-mono font-semibold text-gray-200">
                        <span className="truncate pr-4">{b.address}</span>
                        <span className="text-purple-400 whitespace-nowrap">{share.toLocaleString()} XLM</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
