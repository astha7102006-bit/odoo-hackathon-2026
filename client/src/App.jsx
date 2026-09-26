import React, { useState } from 'react';
import AppLayout from './components/AppLayout';
import ReceiptsPage from './pages/ReceiptsPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import MoveHistoryPage from './pages/MoveHistoryPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  // Default to 'receipts' as the primary first working operation requested
  const [activeNav, setActiveNav] = useState('receipts');

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveNav} />;
      case 'receipts':
      case 'operations':
        return <ReceiptsPage />;
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
