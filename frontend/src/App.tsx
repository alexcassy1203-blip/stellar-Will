import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { CreateVault } from './pages/CreateVault';
import { VaultDetail } from './pages/VaultDetail';
import { PublicTriggers } from './pages/PublicTriggers';
import { BeneficiaryView } from './pages/BeneficiaryView';
import { addMockTime, getMockWallet } from './lib/stellar';
import { useVaultEvents } from './hooks/useVaultEvents';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectVault = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setActiveTab('detail');
  };

  const handleSimulateTime = (seconds: number) => {
    addMockTime(seconds);
    // Reload state across current page components
    const event = new CustomEvent('stellarwill_mock_event', {
      detail: { type: 'CheckedIn', vaultId: 0, details: `Simulated ${seconds}s time passage`, timestamp: Date.now() / 1000 }
    });
    window.dispatchEvent(event);
  };

  // Toast listener for live receipt of funds
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

  // Clear toast after 6 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onSelectVault={handleSelectVault}
            onNavigateToCreate={() => setActiveTab('create')}
          />
        );
      case 'create':
        return <CreateVault onBackToDashboard={() => setActiveTab('dashboard')} />;
      case 'detail':
        return selectedVaultId !== null ? (
          <VaultDetail vaultId={selectedVaultId} onBackToDashboard={() => setActiveTab('dashboard')} />
        ) : (
          <Dashboard
            onSelectVault={handleSelectVault}
            onNavigateToCreate={() => setActiveTab('create')}
          />
        );
      case 'triggers':
        return <PublicTriggers />;
      case 'beneficiary':
        return <BeneficiaryView />;
      default:
        return (
          <Dashboard
            onSelectVault={handleSelectVault}
            onNavigateToCreate={() => setActiveTab('create')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedVaultId(null);
        }}
        onSimulateTime={handleSimulateTime}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Event Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm glass-card border border-purple-500 bg-purple-950/80 px-4 py-3 rounded-xl shadow-2xl text-xs text-white animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
