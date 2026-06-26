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
        colors: ['#8B0000', '#5C0000', '#ef4444'],
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
      return <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">Cancelled</span>;
    }
    if (vault.state === 'Triggered') {
      return <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">Triggered</span>;
    }
    if (vault.isExpired) {
      return <span className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg text-[10px] font-bold animate-pulse">Expired</span>;
    }
    // Expiring soon warning: check if remaining time is less than 60 seconds
    const now = Math.floor(Date.now() / 1000);
    const deadline = isOwner 
      ? vault.lastCheckIn + vault.checkInInterval 
      : vault.lastCheckIn + vault.checkInInterval + vault.gracePeriod;
    const timeRemaining = deadline - now;
    if (timeRemaining > 0 && timeRemaining < 60) {
      return <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold animate-pulse">Expiring Soon</span>;
    }
    
    return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">Active</span>;
  };

  const timerDeadline = isOwner
    ? vault.lastCheckIn + vault.checkInInterval
    : vault.lastCheckIn + vault.checkInInterval + vault.gracePeriod;

  return (
    <div
      onClick={() => onSelect(vault.id)}
      className="bg-white rounded-2xl p-6 cursor-pointer relative group flex flex-col justify-between h-[280px] border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-primary-500/10 border border-primary-500/20 rounded-lg text-primary-500">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="font-extrabold text-dark-900 text-sm font-display">Vault #{vault.id}</h4>
          </div>
          {getStatusBadge()}
        </div>

        {/* Balance Display */}
        <div className="mb-4">
          <span className="text-xs text-dark-500 font-bold block mb-1">Locked Capital</span>
          <span className="text-3xl font-extrabold font-display text-dark-900 tracking-tight">
            {vault.balance.toLocaleString()} <span className="text-sm font-semibold text-primary-500">XLM</span>
          </span>
        </div>

        {/* Beneficiaries Summary */}
        <div className="flex items-center space-x-4 mb-4 text-xs text-dark-500 font-semibold">
          <div className="flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-primary-500" />
            <span>{vault.beneficiaries.length} Beneficiary(s)</span>
          </div>
          <div>
            <CountdownTimer deadline={timerDeadline} state={vault.state} />
          </div>
        </div>
      </div>

      <div>
        {errorMessage && (
          <p className="text-[11px] text-red-600 font-mono mb-2 bg-red-50 border border-red-100 p-2 rounded-lg font-semibold">
            {errorMessage}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
          <span className="text-xs text-primary-500 group-hover:text-primary-600 font-bold flex items-center space-x-1">
            <span>Manage Vault</span>
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>

          {showCheckIn && (
            <button
              onClick={handleCheckIn}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 bg-red-marble bg-cover bg-center hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-sm"
            >
              {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
              <span>Check In</span>
            </button>
          )}

          {showTrigger && (
            <button
              onClick={handleTrigger}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition animate-pulse shadow-sm"
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
