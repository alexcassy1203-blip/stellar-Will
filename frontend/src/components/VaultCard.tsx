import React, { useState } from 'react';
import { Shield, Users, ArrowUpRight, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';
import { Vault } from '../types/vault';
import { CountdownTimer } from './CountdownTimer';
import { useWallet } from '../hooks/useWallet';
import { checkInVault, triggerRelease } from '../lib/stellar';
import confetti from 'canvas-confetti';

interface VaultCardProps {
  vault: Vault;
  onSelect: (vaultId: number) => void;
  onRefresh: () => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({ vault, onSelect, onRefresh }) => {
  const { address } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = address === vault.owner;
  const isExpired = vault.isExpired && vault.state === 'Active';
  const showCheckIn = isOwner && vault.state === 'Active';
  const showTrigger = isExpired && vault.state === 'Active';

  const handleCheckIn = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger card selection
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      await checkInVault(vault.id);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrigger = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await triggerRelease(vault.id);
      confetti({
        particleCount: 150,
        spread: 80,
        colors: ['#6366f1', '#a855f7', '#ec4899'],
        origin: { y: 0.8 }
      });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Trigger failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (vault.state === 'Cancelled') {
      return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold">Cancelled</span>;
    }
    if (vault.state === 'Triggered') {
      return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold">Triggered</span>;
    }
    if (vault.isExpired) {
      return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold animate-pulse">Expired</span>;
    }
    // Expiring soon warning: check if remaining time is less than 60 seconds
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = vault.lastCheckIn + vault.checkInInterval + vault.gracePeriod - now;
    if (timeRemaining > 0 && timeRemaining < 60) {
      return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold animate-pulse">Expiring Soon</span>;
    }
    
    return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold">Active</span>;
  };

  return (
    <div
      onClick={() => onSelect(vault.id)}
      className="glass-card rounded-2xl p-5 cursor-pointer relative group flex flex-col justify-between h-[280px]"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-gray-200 text-sm">Vault #{vault.id}</h4>
          </div>
          {getStatusBadge()}
        </div>

        {/* Balance Display */}
        <div className="mb-4">
          <span className="text-xs text-gray-500 block mb-1">Locked Capital</span>
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {vault.balance.toLocaleString()} <span className="text-sm font-normal text-purple-400">XLM</span>
          </span>
        </div>

        {/* Beneficiaries Summary */}
        <div className="flex items-center space-x-4 mb-4 text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <span>{vault.beneficiaries.length} Beneficiary(s)</span>
          </div>
          <div>
            <CountdownTimer deadline={vault.lastCheckIn + vault.checkInInterval + vault.gracePeriod} state={vault.state} />
          </div>
        </div>
      </div>

      <div>
        {errorMessage && (
          <p className="text-[11px] text-red-400 font-mono mb-2 bg-red-950/20 border border-red-900/30 p-1.5 rounded-lg">
            {errorMessage}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-gray-800/80 pt-3 mt-auto">
          <span className="text-xs text-purple-400 group-hover:text-purple-300 font-medium flex items-center space-x-1">
            <span>Manage Vault</span>
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>

          {showCheckIn && (
            <button
              onClick={handleCheckIn}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition"
            >
              {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
              <span>Check In</span>
            </button>
          )}

          {showTrigger && (
            <button
              onClick={handleTrigger}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition animate-pulse"
            >
              {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              <span>Trigger Release</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
