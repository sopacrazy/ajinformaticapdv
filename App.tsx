
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Login from './components/Login';
import ServiceOrders from './components/ServiceOrders';
import Clients from './components/Clients';
import Suppliers from './components/Suppliers';
import MaterialShipment from './components/MaterialShipment';
import SalesToday from './components/SalesToday';


import { User } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showValues, setShowValues] = useState(true);

  const togglePrivacy = () => setShowValues(!showValues);

  const handleLogin = (u: User) => {
    setUser(u);
    setIsAuthenticated(true);
    
    // Redirect logic: if dashboard is blocked, find the first allowed tab
    if (u.role === 'OPERATOR') {
      if (!u.permissions.dashboard) {
        if (u.permissions.pdv) setActiveTab('pdv');
        else if (u.permissions.sales) setActiveTab('vendas');
        else if (u.permissions.inventory) setActiveTab('inventory');
        else if (u.permissions.finance) setActiveTab('finance');
        else if (u.permissions.serviceOrders) setActiveTab('service-orders');
        else if (u.permissions.reports) setActiveTab('reports');
        else if (u.permissions.clients) setActiveTab('clients');
        else if (u.permissions.suppliers) setActiveTab('suppliers');
        else if (u.permissions.materialShipment) setActiveTab('material-shipment');
        else setActiveTab('dashboard'); 
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard showValues={showValues} togglePrivacy={togglePrivacy} />;
      case 'pdv':
        return <POS showValues={showValues} />;
      case 'vendas':
        return <SalesToday />;
      case 'inventory':

        return <Inventory />;
      case 'clients':
        return <Clients />;
      case 'suppliers':
        return <Suppliers />;
      case 'material-shipment':
        return <MaterialShipment />;
      case 'finance':
        return <Finance showValues={showValues} />;
      case 'reports':
        return <Reports />;
      case 'service-orders':
        return <ServiceOrders />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <Dashboard showValues={showValues} togglePrivacy={togglePrivacy} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={() => { setIsAuthenticated(false); setUser(null); }}
      user={user}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
