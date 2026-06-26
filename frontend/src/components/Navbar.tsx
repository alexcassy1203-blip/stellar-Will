import React from 'react';
import { Wallet, Settings } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSimulateTime: (seconds: number) => void;
}

const NAV_LINKS = [
  { id: 'dashboard',   label: 'My Vaults' },
  { id: 'create',      label: 'Create Vault' },
  { id: 'triggers',    label: 'Public Triggers' },
  { id: 'beneficiary', label: 'Beneficiary View' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onSimulateTime }) => {
  const { address, balance, isConnected, isMock, connect, disconnect, toggleMockMode } = useWallet();
  const truncate = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : '';

  return (
    <header style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid #ece8e4',
      padding: '0 36px',
      height: '72px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Nav Links */}
      <nav style={{ display: 'flex', gap: '6px' }}>
        {NAV_LINKS.map(({ id, label }) => {
          const isActive = activeTab === id || (activeTab === 'detail' && id === 'dashboard');
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 18px',
                fontSize: '15px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#8B0000' : '#666',
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderBottom: isActive ? '2.5px solid #8B0000' : '2.5px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Mock time simulation */}
        {isMock && (
          <div style={{ display: 'flex', gap: '6px', background: '#f5f3f0', borderRadius: '10px', padding: '5px' }}>
            <button onClick={() => onSimulateTime(60)} style={{ background: 'white', border: '1px solid #e5e0dc', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#555', fontFamily: 'monospace' }}>+1m</button>
            <button onClick={() => onSimulateTime(180)} style={{ background: 'white', border: '1px solid #e5e0dc', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#555', fontFamily: 'monospace' }}>+3m</button>
          </div>
        )}

        {isConnected && address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fdf8f8', border: '1px solid #ece8e4', borderRadius: '12px', padding: '8px 18px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace', fontWeight: 600, lineHeight: 1 }}>{truncate(address)}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#8B0000', fontFamily: 'monospace', lineHeight: 1.3 }}>
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
              </div>
            </div>
            <button onClick={disconnect} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px' }}>
              <Wallet size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'url(/src/assets/red_marble.png) center/cover',
              color: 'white', border: 'none', borderRadius: '12px',
              padding: '12px 24px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
            }}
          >
            <Wallet size={17} /> Connect Wallet
          </button>
        )}

      </div>
    </header>
  );
};
