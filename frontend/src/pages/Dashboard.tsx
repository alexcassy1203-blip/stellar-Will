import React, { useState, useEffect } from 'react';
import { VaultCard } from '../components/VaultCard';
import { LiveFeed } from '../components/LiveFeed';
import { Vault } from '../types/vault';
import { getVaultsByOwner } from '../lib/stellar';
import { useWallet } from '../hooks/useWallet';
import { Plus, Shield, Wallet, Box, Calendar, Users, ArrowRight } from 'lucide-react';

interface DashboardProps {
  onSelectVault: (vaultId: number) => void;
  onNavigateToCreate: () => void;
}

function StatCard({ icon, label, value, sub, showDot }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; showDot?: boolean;
}) {
  return (
    <div style={{
      background: 'white', borderRadius: '18px', border: '1px solid #ece8e4',
      padding: '26px 28px', flex: 1, minWidth: '200px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fdf2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B0000', marginBottom: '6px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color: '#1a1a1a', lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {showDot && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8B0000', flexShrink: 0 }} />}
          <div style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>{sub}</div>
        </div>
      )}
      <div style={{ height: '2.5px', width: '32px', background: 'linear-gradient(90deg, #8B0000, #5C0000)', borderRadius: '3px', marginTop: '4px' }} />
    </div>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectVault, onNavigateToCreate }) => {
  const { address } = useWallet();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchVaults = async () => {
      if (!address) {
        setLoading(false);
        setVaults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await getVaultsByOwner(address);
        setVaults(data);
      } catch (err) {
        console.error('Error fetching vaults:', err);
        setVaults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVaults();
  }, [address, refreshTrigger]);

  const totalLocked = vaults.reduce((acc, v) => v.state === 'Active' ? acc + v.balance : acc, 0);
  const activeCount = vaults.filter(v => v.state === 'Active').length;
  const totalBeneficiaries = vaults.reduce((acc, v) => acc + v.beneficiaries.length, 0);

  return (
    <div>
      {/* ── Stat Cards ── */}
      <div className="stat-cards-container" style={{ display: 'flex', gap: '20px', marginBottom: '36px', flexWrap: 'wrap' }}>
        <StatCard
          icon={<Wallet size={24} />}
          label="Total Vault Capital"
          value={<>{totalLocked.toLocaleString()} <span style={{ fontSize: '18px', fontWeight: 600, color: '#8B0000' }}>XLM</span></>}
          sub={`≈ $${(totalLocked * 0.09).toFixed(2)} USD`}
        />
        <StatCard
          icon={<Box size={24} />}
          label="Active Switches"
          value={activeCount}
          sub="All vaults active"
          showDot
        />
        <StatCard
          icon={<Users size={24} />}
          label="Total Beneficiaries"
          value={totalBeneficiaries}
          sub="Across all vaults"
          showDot
        />
        <StatCard
          icon={<Calendar size={24} />}
          label="Next Check-In"
          value="—"
          sub="No upcoming"
          showDot
        />
      </div>

      {/* ── Main Grid: Vaults + Feed ── */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px', alignItems: 'flex-start' }}>

        {/* Left: Vaults */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>My Inheritances</h2>
            <button
              onClick={onNavigateToCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'url(/src/assets/red_marble.png) center/cover',
                color: 'white', border: 'none', borderRadius: '12px',
                padding: '12px 22px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(139,0,0,0.3)',
              }}
            >
              <Plus size={17} /> Create New Vault
            </button>
          </div>

          <div style={{
            background: 'white', borderRadius: '18px', border: '1px solid #ece8e4',
            minHeight: '420px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}>
            {loading ? (
              <div className="vault-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px' }}>
                {[1, 2].map(n => (
                  <div key={n} style={{ background: '#f9f7f5', borderRadius: '14px', padding: '24px', height: '280px' }}>
                    {[65, 100, 80, 45].map((w, i) => (
                      <div key={i} className="animate-pulse" style={{ height: '16px', background: '#ece8e4', borderRadius: '8px', width: `${w}%`, marginBottom: '16px', animation: 'pulse 2s infinite' }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : vaults.length === 0 ? (
              <div style={{ padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto' }}>
                <div style={{ width: '220px', height: '220px', marginBottom: '28px' }}>
                  <img src="/src/assets/vault_illustration.png" alt="Vault" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
                  You don't have any vaults yet
                </h3>
                <p style={{ fontSize: '15px', color: '#888', margin: '0 0 32px', maxWidth: '360px', lineHeight: 1.7 }}>
                  Create your first inheritance vault to secure your legacy on Stellar.
                </p>
                <button
                  onClick={onNavigateToCreate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'url(/src/assets/red_marble.png) center/cover',
                    color: 'white', border: 'none', borderRadius: '12px',
                    padding: '14px 32px', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 6px 20px rgba(139,0,0,0.3)',
                  }}
                >
                  <Plus size={18} /> Create Your First Vault
                </button>
              </div>
            ) : (
              <div className="vault-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px' }}>
                {vaults.map(vault => (
                  <VaultCard key={vault.id} vault={vault} onSelect={onSelectVault} onRefresh={() => setRefreshTrigger(t => t + 1)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Audit Feed */}
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', margin: '0 0 22px' }}>Audit Feed</h2>
          <LiveFeed />
        </div>
      </div>

      {/* ── Red Marble Bottom Banner ── */}
      <div className="bottom-banner" style={{
        marginTop: '36px',
        borderRadius: '18px',
        background: 'url(/src/assets/red_marble.png) center/cover',
        padding: '28px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(139,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={28} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '5px' }}>
              Secure. Decentralized. Immutable.
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              Your legacy, protected by Stellar blockchain.
            </div>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(4px)' }}>
          Learn More <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
