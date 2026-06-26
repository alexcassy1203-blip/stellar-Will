import React, { useState } from 'react';
import {
  LayoutDashboard, Plus, Users, Wallet, LogOut,
  Copy, ExternalLink, Globe, HelpCircle, Sun, Moon, X
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { setMockWallet } from '../lib/stellar';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'My Vaults',       Icon: LayoutDashboard },
  { id: 'create',      label: 'Create Vault',     Icon: Plus },
  { id: 'beneficiary', label: 'Beneficiary View', Icon: Users },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, setTheme, isOpen, onClose }) => {
  const { address, balance, isConnected, isMock, connect, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const truncate = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : '';

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMockWallet(e.target.value);
    window.location.reload();
  };

  return (
    <aside
      className={`app-sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: '280px',
        minWidth: '280px',
        background: '#fff',
        borderRight: '1px solid #ece8e4',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid #ece8e4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'url(/src/assets/red_marble.png) center/cover',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" fillOpacity="0.92"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1 }}>
              Stellar<span style={{ color: '#8B0000' }}>Will</span>
            </div>
            <div style={{ fontSize: '12px', color: '#999', fontWeight: 500, marginTop: '2px' }}>Decentralized Inheritance</div>
          </div>
          
          <button
            className="mobile-close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              display: 'none',
              marginLeft: 'auto',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ padding: '20px 16px', flex: 1 }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id || (activeTab === 'detail' && id === 'dashboard');
          return (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                if (onClose) onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #8B0000, #5C0000)' : 'transparent',
                color: isActive ? 'white' : '#555',
                fontWeight: isActive ? 700 : 500,
                fontSize: '15px',
                cursor: 'pointer',
                marginBottom: '6px',
                textAlign: 'left',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                boxShadow: isActive ? '0 4px 14px rgba(139,0,0,0.25)' : 'none',
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          );
        })}

        {/* ── Account Section ── */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px', paddingLeft: '6px' }}>
            Account
          </div>

          {isConnected && address ? (
            <div style={{
              background: 'url(/src/assets/red_marble.png) center/cover',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '10px',
              boxShadow: '0 4px 16px rgba(139,0,0,0.2)',
            }}>
              {/* Connected badge + disconnect */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>Wallet Connected</span>
                </div>
                <button onClick={disconnect} style={{ background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', padding: '5px 7px', display: 'flex' }}>
                  <LogOut size={14} />
                </button>
              </div>

              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: 'white', fontFamily: 'monospace', fontWeight: 700 }}>
                  {truncate(address)}
                </span>
                <button onClick={copyAddress} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: copied ? '#4ade80' : 'rgba(255,255,255,0.65)' }}>
                  <Copy size={13} />
                </button>
                <a href={`https://stellar.expert/explorer/testnet/account/${address}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.65)', display: 'flex' }}>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Balance */}
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px', fontWeight: 600 }}>Balance</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
                  ≈ ${(balance * 0.09).toFixed(2)} USD
                </div>
              </div>

              {isMock && (
                <select onChange={handleMockChange} value={address} style={{ marginTop: '14px', width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer' }}>
                  <option value="GDOWNER1234567890VAULTOWNER1234567890VAULTOWNER12345">Owner Wallet</option>
                  <option value="GDBENEFICIARY111111111111111111111111111111111111">Beneficiary 1</option>
                  <option value="GDBENEFICIARY222222222222222222222222222222222222">Beneficiary 2</option>
                  <option value="GDSTRANGER99999999999999999999999999999999999999">Stranger</option>
                </select>
              )}
            </div>
          ) : (
            <div style={{ background: 'url(/src/assets/red_marble.png) center/cover', borderRadius: '16px', padding: '18px', marginBottom: '10px', boxShadow: '0 4px 16px rgba(139,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={17} color="white" />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Connect Wallet</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: '0 0 14px', lineHeight: 1.55 }}>
                Connect to manage your inheritance vaults.
              </p>
              <button onClick={() => connect(true)} style={{ width: '100%', background: 'white', color: '#8B0000', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Connect Wallet
              </button>
            </div>
          )}
        </div>

        {/* ── Support ── */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '10px', paddingLeft: '6px' }}>
            Support
          </div>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#666', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            <Globe size={16} /> Documentation
          </button>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#666', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            <HelpCircle size={16} /> Help & Support
          </button>
        </div>
      </nav>

      {/* ── Theme Toggle ── */}
      <div style={{ padding: '18px 20px 24px', borderTop: '1px solid #ece8e4' }}>
        <div style={{ display: 'flex', background: '#f5f3f0', borderRadius: '28px', padding: '4px' }}>
          <button onClick={() => setTheme('light')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: theme === 'light' ? 'white' : 'transparent', color: theme === 'light' ? '#1a1a1a' : '#999', border: 'none', borderRadius: '22px', padding: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.09)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>
            <Sun size={15} /> Light
          </button>
          <button onClick={() => setTheme('dark')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: theme === 'dark' ? 'linear-gradient(135deg, #8B0000, #5C0000)' : 'transparent', color: theme === 'dark' ? 'white' : '#999', border: 'none', borderRadius: '22px', padding: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
            <Moon size={15} /> Dark
          </button>
        </div>
      </div>
    </aside>
  );
};
