import React, { useState, useEffect } from 'react';
import { Activity, ExternalLink, Calendar } from 'lucide-react';
import { EventLog } from '../types/vault';
import { getMockLogs } from '../lib/stellar';
import { useVaultEvents } from '../hooks/useVaultEvents';

export const LiveFeed: React.FC = () => {
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => {
    // Initial logs load
    setLogs(getMockLogs());
  }, []);

  // Listen to live events
  useVaultEvents({
    onEvent: (newLog) => {
      setLogs(prev => [newLog, ...prev]);
    }
  });

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'VaultCreated': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Deposited': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'CheckedIn': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'BeneficiariesUpdated': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'VaultCancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'VaultTriggered': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'FundsDistributed': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
          <h3 className="font-semibold text-gray-200">Real-Time Event Stream</h3>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute" />
          <span>Connected</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10 font-mono">No events recorded yet</p>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="p-3 bg-gray-950/40 rounded-xl border border-gray-800/60 hover:border-gray-700/60 transition flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1.5 sm:space-y-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full self-start sm:self-center font-bold ${getEventBadgeClass(log.type)}`}>
                  {log.type.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-xs text-gray-300 font-mono">
                  {log.details}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[10px] text-gray-500 font-mono justify-between sm:justify-end">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatTime(log.timestamp)}</span>
                </div>
                {log.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-0.5 hover:text-purple-400 transition"
                  >
                    <span>Tx</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
