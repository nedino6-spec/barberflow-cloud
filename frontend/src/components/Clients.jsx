import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Users, Phone, Calendar, Search, Plus, XCircle, User, Trash2, Shield, ShieldOff, DollarSign, Instagram, MapPin, FileText, Cake, Edit3 } from 'lucide-react';
import { apiFetch } from '../api';
import { toast } from 'react-hot-toast';

let baseUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    baseUrl = 'http://localhost:3001';
}
const socket = io(baseUrl);

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    phone: '', 
    name: '',
    birth_date: '',
    instagram: '',
    address: '',
    observations: ''
  });
  
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtFormData, setDebtFormData] = useState({ id: null, debt: '' });

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  useEffect(() => {
    fetchClients();

    socket.on('clients_update', (updatedClients) => {
        setClients(updatedClients);
    });

    return () => {
        socket.off('clients_update');
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedClientId(null);
    setFormData({ phone: '', name: '', birth_date: '', instagram: '', address: '', observations: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setIsEditing(true);
    setSelectedClientId(client.id);
    setFormData({ 
      phone: client.phone, 
      name: client.name,
      birth_date: client.birth_date || '',
      instagram: client.instagram || '',
      address: client.address || '',
      observations: client.observations || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await apiFetch(`/api/clients/${selectedClientId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Cliente atualizado!');
      } else {
        await apiFetch('/api/clients', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Cliente cadastrado!');
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      toast.error('Erro ao salvar');
      console.error('Erro ao salvar cliente:', err);
    }
  };

  const handleDebtSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/clients/${debtFormData.id}`, {
        method: 'PUT',
        body: JSON.stringify({ debt: parseFloat(debtFormData.debt) || 0 })
      });
      setIsDebtModalOpen(false);
      setDebtFormData({ id: null, debt: '' });
      toast.success('Saldo atualizado!');
      fetchClients();
    } catch (err) {
      toast.error('Erro ao atualizar saldo');
    }
  };

  const handleDeleteClient = async (id) => {
    if(!window.confirm('Tem certeza que deseja deletar este cliente?')) return;
    try {
      const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cliente removido com sucesso!');
        fetchClients();
      } else {
        toast.error('O servidor recusou a exclusão.');
      }
    } catch(e) {
      toast.error('Erro de conexão ao tentar apagar.');
      console.error(e);
    }
  };

  const handleBlockClient = async (id, blockedStatus) => {
    try {
      await apiFetch(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ blocked: blockedStatus ? 1 : 0 })
      });
      fetchClients();
    } catch(e) {
      console.error(e);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Você tem certeza que deseja apagar TODOS os clientes? Esta ação não pode ser desfeita!')) return;
    if (!window.confirm('ÚLTIMO AVISO: Isso removerá todos os nomes, telefones e históricos da sua base. Confirma?')) return;
    try {
      const res = await apiFetch('/api/clients', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Base de clientes limpa com sucesso!');
        fetchClients();
      } else {
        toast.error('Não foi possível limpar a base.');
      }
    } catch(e) {
      toast.error('Erro ao conectar com o servidor.');
    }
  };

  const filteredClients = (clients || []).filter(c => {
    const name = c.name || '';
    const phone = c.phone || '';
    const instagram = c.instagram || '';
    return name.toLowerCase().includes(search.toLowerCase()) || 
           phone.includes(search) ||
           instagram.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <main className="main-content">
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, marginBottom: '8px' }}>
            <Users className="text-gold" size={28} />
            Gestão VIP
          </h1>
          <p className="text-muted" style={{ margin: 0 }}>Gerencie sua base de clientes e fidelidade.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-glass" onClick={handleDeleteAll} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.85rem' }}>
                Limpar Todos
            </button>
            <button className="btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} />
                Novo Cliente
            </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="card glass-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Base de Dados ({filteredClients.length})</h3>
            <div className="search-box" style={{ maxWidth: '300px' }}>
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Buscar por nome ou WhatsApp..." 
                className="form-control" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="queue-list" style={{ marginTop: '20px' }}>
            {filteredClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
                <p>Nenhum cliente VIP encontrado.</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div key={client.id} className="queue-item" style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  opacity: client.blocked ? 0.6 : 1, padding: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="avatar" style={{ 
                      background: client.blocked ? 'var(--danger)' : 'var(--primary)', 
                      color: 'black', width: '45px', height: '45px', borderRadius: '12px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
                    }}>
                      {(client.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {client.name || 'Sem Nome'}
                        {client.instagram && <span style={{fontSize: '0.75rem', color: '#e1306c'}}>@{client.instagram}</span>}
                      </h4>
                      <div style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {client.phone}</span>
                        {client.birth_date && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Cake size={14} /> {client.birth_date.split('-').reverse().join('/')}</span>}
                        {(client.debt || 0) > 0 && <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>• Fiado: R$ {(client.debt || 0).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-glass" onClick={() => openEditModal(client)} title="Editar"><Edit3 size={16} /></button>
                    <button className="btn-glass" style={{ color: 'var(--primary)' }} onClick={() => { setDebtFormData({id: client.id, debt: client.debt || 0}); setIsDebtModalOpen(true); }}><DollarSign size={16} /></button>
                    <button className="btn-glass" style={{ color: client.blocked ? 'var(--success)' : 'var(--warning)' }} onClick={() => handleBlockClient(client.id, !client.blocked)}>
                      {client.blocked ? <Shield size={16} /> : <ShieldOff size={16} />}
                    </button>
                    <button className="btn-glass" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteClient(client.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Cadastro Detalhado */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '600px', padding: '40px', position: 'relative', border: '1px solid var(--primary)' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <XCircle size={24} />
            </button>
            
            <h2 style={{ marginTop: 0, marginBottom: '30px', color: 'var(--gold)' }}>
              {isEditing ? 'Atualizar Ficha VIP' : 'Cadastro VIP Detalhado'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label>Nome Completo</label>
                <div className="input-group">
                  <User size={18} className="input-icon" />
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="João da Silva" className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>WhatsApp (DDD + Número)</label>
                <div className="input-group">
                  <Phone size={18} className="input-icon" />
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="5511999999999" className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Data de Nascimento</label>
                <div className="input-group">
                  <Cake size={18} className="input-icon" />
                  <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Instagram (@usuario)</label>
                <div className="input-group">
                  <Instagram size={18} className="input-icon" />
                  <input type="text" name="instagram" value={formData.instagram} onChange={handleInputChange} placeholder="barbearia_elite" className="form-control" />
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Endereço Completo</label>
                <div className="input-group">
                  <MapPin size={18} className="input-icon" />
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Rua das Flores, 123 - Centro" className="form-control" />
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Observações e Preferências</label>
                <div className="input-group">
                  <FileText size={18} className="input-icon" style={{ top: '15px' }} />
                  <textarea 
                    name="observations" value={formData.observations} onChange={handleInputChange} 
                    placeholder="Ex: Alérgico a pós-barba, gosta de degradê navalhado, prefere café sem açúcar." 
                    className="form-control" rows="3"
                    style={{ paddingLeft: '45px' }}
                  ></textarea>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '10px', padding: '18px', fontSize: '1.1rem' }}>
                {isEditing ? 'Salvar Alterações' : 'Concluir Cadastro VIP'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Saldo Devedor */}
      {isDebtModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '400px', padding: '30px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}><DollarSign className="text-danger" /> Saldo Devedor</h2>
            <form onSubmit={handleDebtSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Valor em Aberto (R$)</label>
                <input type="number" step="0.01" value={debtFormData.debt} onChange={e => setDebtFormData({...debtFormData, debt: e.target.value})} className="form-control" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-glass" style={{ flex: 1 }} onClick={() => setIsDebtModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>Atualizar Saldo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
