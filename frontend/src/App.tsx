import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { CreateVault } from './pages/CreateVault';
import { VaultDetail } from './pages/VaultDetail';
import { BeneficiaryView } from './pages/BeneficiaryView';
import { addMockTime, getMockWallet } from './lib/stellar';
import { useVaultEvents } from './hooks/useVaultEvents';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSelectVault = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setActiveTab('detail');
    setIsSidebarOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedVaultId(null);
    setIsSidebarOpen(false);
  };

  const handleSimulateTime = (seconds: number) => {
    addMockTime(seconds);
    const event = new CustomEvent('stellarwill_mock_event', {
      detail: { type: 'CheckedIn', vaultId: 0, details: `Simulated ${seconds}s time passage`, timestamp: Date.now() / 1000 }
    });
    window.dispatchEvent(event);
  };

  useVaultEvents({
    onEvent: (log) => {
      if (log.type === 'FundsDistributed') {
        const wallet = getMockWallet();
        if (log.details.toLowerCase().includes(wallet.toLowerCase().substring(0, 8))) {
          setToastMessage(`🎉 ${log.details}`);
        }
      }
    }
  });

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onSelectVault={handleSelectVault} onNavigateToCreate={() => handleTabChange('create')} />;
      case 'create':
        return <CreateVault onBackToDashboard={() => handleTabChange('dashboard')} />;
      case 'detail':
        return selectedVaultId !== null
          ? <VaultDetail vaultId={selectedVaultId} onBackToDashboard={() => handleTabChange('dashboard')} />
          : <Dashboard onSelectVault={handleSelectVault} onNavigateToCreate={() => handleTabChange('create')} />;
      case 'beneficiary':
        return <BeneficiaryView />;
      default:
        return <Dashboard onSelectVault={handleSelectVault} onNavigateToCreate={() => handleTabChange('create')} />;
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        theme={theme}
        setTheme={setTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Right column: Navbar + Content */}
      <div className="main-content-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onSimulateTime={handleSimulateTime}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="page-content-main" style={{ flex: 1, padding: '36px 40px 60px', overflowY: 'auto' }}>
          {renderContent()}
        </main>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 100,
          background: 'linear-gradient(135deg, #8B0000, #5C0000)',
          color: 'white', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(139,0,0,0.3)', fontSize: '13px', fontWeight: 600,
          maxWidth: '320px',
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
