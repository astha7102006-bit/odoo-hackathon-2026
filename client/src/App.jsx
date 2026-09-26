import React, { useState } from 'react';
import AppLayout from './components/AppLayout';
import ReceiptsPage from './pages/ReceiptsPage';
import OperationsPage from './pages/OperationsPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import MoveHistoryPage from './pages/MoveHistoryPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveNav} />;
      case 'receipts':
        return <ReceiptsPage />;
      case 'operations':
        return <OperationsPage />;
      case 'products':
        return <ProductsPage />;
      case 'moves':
        return <MoveHistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <ReceiptsPage />;
    }
  };

  return (
    <AppLayout activeNav={activeNav} onNavigate={setActiveNav}>
      {renderContent()}
    </AppLayout>
  );
}
