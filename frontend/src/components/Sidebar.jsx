import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Megaphone, 
  TrendingUp, 
  Scissors, 
  Settings, 
  Smartphone,
  ShieldCheck,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="page-sidebar">
      <div className="sidebar-header">
        <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '10px' }}>
          <Scissors size={24} color="#000" />
        </div>
        <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>BARBER<span style={{ color: 'var(--primary)' }}>FLOW</span></span>
      </div>
      
      <div className="sidebar-content">
        <div className="menu-category">Gestão Principal</div>
        <nav>
          <NavLink to="/" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"} end>
            <LayoutDashboard size={18} />
            Painel Geral
          </NavLink>
          <NavLink to="/agendamentos" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}>
            <Calendar size={18} />
            Agenda Online
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}>
            <Users size={18} />
            Meus Clientes
          </NavLink>
        </nav>

        <div className="menu-category">Estratégia & Lucro</div>
        <nav>
          <NavLink to="/marketing" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}>
            <Megaphone size={18} />
            Marketing AI
          </NavLink>
          <NavLink to="/financeiro" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}>
            <TrendingUp size={18} />
            Financeiro
          </NavLink>
          <NavLink to="/catalogo" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}>
            <Smartphone size={18} />
            Link de Celular
          </NavLink>
        </nav>

        <div className="menu-category">Configuração</div>
        <nav>
          <NavLink to="/settings" className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}>
            <Settings size={18} />
            Ajustes do Sistema
          </NavLink>
          <a href="/logout" className="sidebar-nav-item" style={{ marginTop: '20px', color: 'var(--danger)' }}>
            <LogOut size={18} />
            Sair do Sistema
          </a>
        </nav>
      </div>

      <div style={{ padding: '20px', borderTop: '1px solid var(--glass-border)' }}>
        <div className="glass-panel" style={{ padding: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 10px var(--success)' }}></div>
          <div>
            <div style={{ fontWeight: '600' }}>Ultimate Elite v2.0</div>
            <div style={{ color: 'var(--text-muted)' }}>Proteção Ativa</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
