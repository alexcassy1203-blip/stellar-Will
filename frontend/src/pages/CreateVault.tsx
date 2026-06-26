import React, { useState } from 'react';
import { Shield, ArrowLeft, HelpCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { BeneficiaryForm } from '../components/BeneficiaryForm';
import { Beneficiary } from '../types/vault';
import { createVault } from '../lib/stellar';
import { useWallet } from '../hooks/useWallet';
import confetti from 'canvas-confetti';

interface CreateVaultProps {
  onBackToDashboard: () => void;
}

export const CreateVault: React.FC<CreateVaultProps> = ({ onBackToDashboard }) => {
  const { address, balance, refreshBalance } = useWallet();
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { address: 'GDBENEFICIARY111111111111111111111111111111111111', basisPoints: 5000 },
    { address: 'GDBENEFICIARY222222222222222222222222222222222222', basisPoints: 5000 },
  ]);
  const [checkInInterval, setCheckInInterval] = useState<number>(300); // 5 minutes
  const [gracePeriod, setGracePeriod] = useState<number>(120); // 2 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalBP = beneficiaries.reduce((acc, b) => acc + b.basisPoints, 0);
  const isValidSplits = totalBP === 10000;
  const isSufficientBalance = balance >= depositAmount;
  const isFormValid = isValidSplits && isSufficientBalance && depositAmount > 0 && beneficiaries.length > 0 && beneficiaries.every(b => b.address.length > 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createVault(
        address,
        beneficiaries,
        checkInInterval,
        gracePeriod,
        depositAmount
      );
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      refreshBalance();
      onBackToDashboard();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create vault. Please verify parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds === 60) return '1 Minute';
    if (seconds === 120) return '2 Minutes';
    if (seconds === 300) return '5 Minutes';
    if (seconds === 86400) return '24 Hours';
    if (seconds === 604800) return '7 Days';
    if (seconds === 2592000) return '30 Days';
    if (seconds === 15552000) return '180 Days';
    return `${seconds} Seconds`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBackToDashboard}
          className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-100">Setup Inheritable Vault</h2>
          <p className="text-xs text-gray-500">Lock XLM assets and specify beneficiaries to secure your digital legacy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-5">
            {/* Deposit Capital */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Legacy Payout Capital (XLM)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono text-sm px-4 py-2.5 rounded-xl glass-input"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-purple-400 font-mono">XLM</span>
              </div>
              {!isSufficientBalance && (
                <span className="text-[10px] text-red-400 font-mono mt-1 block">
                  Insufficient balance (Available: {balance.toFixed(2)} XLM)
                </span>
              )}
            </div>

            {/* Check-In Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1 flex items-center space-x-1">
                  <span>Check-In Interval</span>
                  <span title="How frequently you must check-in to prove you are active">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
                  </span>
                </label>
                <select
                  value={checkInInterval}
                  onChange={(e) => setCheckInInterval(parseInt(e.target.value))}
                  className="w-full text-xs px-3 py-2.5 rounded-xl glass-input cursor-pointer"
                >
                  <option value={120}>{formatInterval(120)}</option>
                  <option value={300}>{formatInterval(300)}</option>
                  <option value={86400}>{formatInterval(86400)}</option>
                  <option value={604800}>{formatInterval(604800)}</option>
                  <option value={2592000}>{formatInterval(2592000)}</option>
                  <option value={15552000}>{formatInterval(15552000)}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1 flex items-center space-x-1">
                  <span>Grace Period</span>
                  <span title="Extra time allowed after deadline before triggering is allowed">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
                  </span>
                </label>
                <select
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(parseInt(e.target.value))}
                  className="w-full text-xs px-3 py-2.5 rounded-xl glass-input cursor-pointer"
                >
                  <option value={60}>1 Minute</option>
                  <option value={180}>3 Minutes</option>
                  <option value={300}>5 Minutes</option>
                  <option value={3600}>1 Hour</option>
                  <option value={604800}>7 Days</option>
                </select>
              </div>
            </div>

            {/* Beneficiaries Subform */}
            <div className="border-t border-gray-800/80 pt-4">
              <BeneficiaryForm beneficiaries={beneficiaries} onChange={setBeneficiaries} />
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs text-red-400 font-mono bg-red-950/20 border border-red-900/30 p-3 rounded-xl">
              {errorMessage}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/20 disabled:text-gray-500 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-purple-600/10"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>Initialize Inheritance Vault</span>
          </button>
        </form>

        {/* Right: Live Preview Card */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vault Distribution Preview</h3>
          <div className="glass-card rounded-2xl p-5 border border-purple-500/20 bg-gradient-to-b from-purple-950/10 to-indigo-950/5 flex flex-col justify-between h-[360px]">
            <div>
              <div className="flex items-center space-x-2 text-purple-400 mb-4">
                <Shield className="w-5 h-5" />
                <span className="font-bold text-sm">StellarWill Vault Preview</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-gray-500 block mb-0.5">ESTIMATED FUNDING</span>
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {depositAmount.toLocaleString()} <span className="text-sm font-normal text-purple-400">XLM</span>
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  <span className="text-[10px] text-gray-500 block">SPLIT BREAKDOWN</span>
                  {beneficiaries.map((b, i) => {
                    const share = (b.basisPoints / 10000) * depositAmount;
                    const displayAddr = b.address.length > 10 ? `${b.address.substring(0, 6)}...${b.address.substring(b.address.length - 4)}` : 'GD...';
                    return (
                      <div key={i} className="flex justify-between items-center text-xs font-mono py-1 border-b border-gray-800/40">
                        <span className="text-gray-400">{displayAddr}</span>
                        <span className="text-gray-200">
                          {b.basisPoints / 100}% ({share.toFixed(2)} XLM)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800/80 pt-3 text-[10px] text-gray-500 leading-normal">
              <span className="block font-semibold text-gray-400 mb-0.5">DEAD MAN SWITCH DETAILS</span>
              <span>Must check-in once every {formatInterval(checkInInterval)} with a grace period of {formatInterval(gracePeriod)}.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
