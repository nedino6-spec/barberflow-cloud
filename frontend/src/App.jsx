import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, LayoutDashboard, Calendar, Users, Megaphone, DollarSign, BookOpen, Settings as SettingsIcon, LogOut, Menu } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Componentes
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Appointments from './components/Appointments';
import Clients from './components/Clients';
import MarketingTab from './components/MarketingTab';
import Financeiro from './components/Financeiro';
import Catalog from './components/Catalog';
import { apiFetch } from './api';

const Preloader = ({ messages }) => {
  const [currentMsg, setCurrentMsg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsg(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="preloader"
    >
      <img src="/logo.png" alt="BarberFlow" className="preloader-logo" onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} />
      <div className="loader-spinner"></div>
      <AnimatePresence mode="wait">
        <motion.p
          key={currentMsg}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="preloader-text"
        >
          {messages[currentMsg]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
};

const Topbar = () => {
  return (
    <header className="page-header">
      <div className="header-search">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Buscar cliente ou agendamento..." />
        </div>
      </div>

      <div className="header-actions">
        <button className="action-btn" title="Notificações">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>

        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">Barbearia Elite</span>
            <span className="user-role">Administrador</span>
          </div>
          <img src="https://ui-avatars.com/api/?name=Barber+Elite&background=d4af37&color=000" alt="User" className="user-avatar" />
        </div>
      </div>
    </header>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [serverOk, setServerOk] = useState(true);

  const loadingMessages = [
    "Construindo seu link de agendamento em segundos...",
    "Configurando o robô WhatsApp para atender seus clientes...",
    "Sincronizando sua agenda e financeiro...",
    "Otimizando o marketing da sua barbearia...",
    "Quase pronto para decolar!"
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiFetch('/api/status');
        if (!res.ok) setServerOk(false);
        
        // Carregar tema
        const themeRes = await apiFetch('/api/settings/theme_color');
        const themeData = await themeRes.json();
        if (themeData.value) {
          document.documentElement.style.setProperty('--primary', themeData.value);
        }
      } catch (e) {
        setServerOk(false);
      } finally {
        // Simular um loading elegante de 2 segundos
        setTimeout(() => setIsLoading(false), 2000);
      }
    };
    init();
  }, []);

  return (
    <BrowserRouter>
      <AnimatePresence>
        {isLoading && <Preloader messages={loadingMessages} />}
      </AnimatePresence>

      <div className="app-wrapper">
        <Toaster position="top-right" toastOptions={{ style: { background: '#131518', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        
        {!isLoading && (
          <>
            <Sidebar />
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Topbar />
              <div className="main-viewport">
                <Suspense fallback={<div className="loader-spinner"></div>}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/agendamentos" element={<Appointments />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/marketing" element={<MarketingTab />} />
                    <Route path="/financeiro" element={<Financeiro />} />
                    <Route path="/catalogo" element={<Catalog />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </div>
            </main>
          </>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
