import React from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import { VaultState } from '../types/vault';

interface CountdownTimerProps {
  deadline: number;
  state: VaultState;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ deadline, state }) => {
  const countdown = useCountdown(deadline);

  if (state === 'Cancelled') {
    return (
      <div className="flex items-center space-x-1.5 text-gray-500 font-mono text-sm">
        <CheckCircle2 className="w-4 h-4" />
        <span>Vault Cancelled</span>
      </div>
    );
  }

  if (state === 'Triggered') {
    return (
      <div className="flex items-center space-x-1.5 text-indigo-400 font-mono text-sm">
        <CheckCircle2 className="w-4 h-4" />
        <span>Funds Distributed</span>
      </div>
    );
  }

  if (countdown.isExpired) {
    return (
      <div className="flex items-center space-x-1.5 text-red-500 font-bold font-mono text-sm animate-pulse">
        <AlertTriangle className="w-4 h-4" />
        <span>Deadline Expired</span>
      </div>
    );
  }

  // Expiring soon warning: less than 1 minute (60 seconds)
  const isExpiringSoon = countdown.totalSeconds < 60;

  return (
    <div
      className={`flex items-center space-x-2 font-mono text-sm ${
        isExpiringSoon ? 'text-amber-500 font-bold animate-pulse' : 'text-gray-300'
      }`}
    >
      <Clock className={`w-4 h-4 ${isExpiringSoon ? 'text-amber-500' : 'text-purple-400'}`} />
      <span>{countdown.formatted}</span>
    </div>
  );
};
