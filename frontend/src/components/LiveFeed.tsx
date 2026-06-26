import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, ExternalLink, Zap, DollarSign, UserCheck } from 'lucide-react';
import { EventLog } from '../types/vault';
import { getMockLogs } from '../lib/stellar';
import { useVaultEvents } from '../hooks/useVaultEvents';

const EVENT_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  VaultCreated:         { label: 'Vault Created',     bg: '#fdf2f2', color: '#8B0000', icon: <Shield size={16} /> },
  Deposited:            { label: 'Deposited',         bg: '#eff6ff', color: '#2563eb', icon: <DollarSign size={16} /> },
  CheckedIn:            { label: 'Checked In',        bg: '#f0fdf4', color: '#16a34a', icon: <UserCheck size={16} /> },
  BeneficiariesUpdated: { label: 'Beneficiaries',     bg: '#fefce8', color: '#ca8a04', icon: <UserCheck size={16} /> },
  VaultCancelled:       { label: 'Cancelled',         bg: '#fef2f2', color: '#dc2626', icon: <Shield size={16} /> },
  VaultTriggered:       { label: 'Vault Triggered',   bg: '#fdf2f2', color: '#8B0000', icon: <Zap size={16} /> },
  FundsDistributed:     { label: 'Funds Distributed', bg: '#f0fdf4', color: '#16a34a', icon: <DollarSign size={16} /> },
};

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const LiveFeed: React.FC = () => {
  const [logs, setLogs] = useState<EventLog[]>([]);
  useEffect(() => { setLogs(getMockLogs()); }, []);
  useVaultEvents({ onEvent: (newLog) => setLogs(prev => [newLog, ...prev]) });

  return (
    <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #ece8e4', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>Real-Time Event Stream</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '5px 12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 7px #16a34a' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>Live</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {logs.length > 1 && (
          <div style={{ position: 'absolute', left: '17px', top: '20px', bottom: '20px', width: '2px', background: '#f1ede9', zIndex: 0 }} />
        )}

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fdf2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#8B0000' }}>
              <Zap size={22} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#555', margin: '0 0 6px' }}>No events yet</p>
            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Events appear here when vaults are created or triggered.</p>
          </div>
        ) : (
          logs.slice(0, 6).map((log, i) => {
            const cfg = EVENT_CONFIG[log.type] ?? EVENT_CONFIG['VaultCreated'];
            return (
              <div key={log.id} style={{ display: 'flex', gap: '16px', padding: '12px 0', position: 'relative', zIndex: 1 }}>
                {/* Icon bubble */}
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: cfg.bg, border: '2.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cfg.color, boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginBottom: '3px' }}>{cfg.label}</div>
                      <div style={{ fontSize: '12px', color: '#888', fontWeight: 500, lineHeight: 1.5 }}>{log.details}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', color: '#aaa', fontWeight: 600 }}>{formatTime(log.timestamp)}</div>
                      {log.txHash && (
                        <a href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`} target="_blank" rel="noreferrer"
                           style={{ fontSize: '12px', color: '#8B0000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '3px', fontWeight: 700 }}>
                          Tx <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                  {i < Math.min(logs.length, 6) - 1 && (
                    <div style={{ height: '1px', background: '#f5f3f0', marginTop: '12px' }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {logs.length > 0 && (
        <button style={{ width: '100%', background: '#fdf8f8', border: 'none', borderRadius: '12px', padding: '14px', marginTop: '14px', fontSize: '14px', fontWeight: 700, color: '#8B0000', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
          View All Events <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
};
