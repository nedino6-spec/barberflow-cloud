import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2 } from 'lucide-react';
import { apiFetch } from '../api';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const [greetingMsg, setGreetingMsg] = useState('');
  const [maxQueueSize, setMaxQueueSize] = useState('15');
  const [queueHours, setQueueHours] = useState('08:00-19:00');
  const [themeColor, setThemeColor] = useState('#d4af37');
  const [barbershopName, setBarbershopName] = useState('BarberFlow');
  const [loyaltyThreshold, setLoyaltyThreshold] = useState('10');
  const [pixKey, setPixKey] = useState('');
  const [calledMsg, setCalledMsg] = useState('');
  const [completionMsg, setCompletionMsg] = useState('');
  const [debtMsg, setDebtMsg] = useState('');
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for new/edit service
  const [editingId, setEditingId] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', description: '' });

  const fetchSettings = async () => {
    try {
      const settings = [
        { key: 'greeting_msg', setter: setGreetingMsg },
        { key: 'max_queue_size', setter: setMaxQueueSize },
        { key: 'queue_hours', setter: setQueueHours },
        { key: 'theme_color', setter: setThemeColor },
        { key: 'barbershop_name', setter: setBarbershopName },
        { key: 'loyalty_threshold', setter: setLoyaltyThreshold },
        { key: 'pix_key', setter: setPixKey },
        { key: 'called_msg', setter: setCalledMsg },
        { key: 'completion_msg', setter: setCompletionMsg },
        { key: 'debt_msg', setter: setDebtMsg }
      ];

      for (const s of settings) {
        const res = await apiFetch(`/api/settings/${s.key}`);
        const data = await res.json();
        if (data.value) s.setter(data.value);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await apiFetch('/api/services');
      const data = await res.json();
      setServices(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchServices();
  }, []);

  const saveSettingsGroup = async (groupData) => {
    try {
      for (const item of groupData) {
        await apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ key: item.key, value: item.value })
        });
      }
      toast.success('Configurações salvas!');
      if (groupData.some(i => i.key === 'theme_color')) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar.');
    }
  };

  const savePersonalization = () => saveSettingsGroup([
    { key: 'theme_color', value: themeColor },
    { key: 'barbershop_name', value: barbershopName },
    { key: 'pix_key', value: pixKey }
  ]);

  const saveBotTexts = () => saveSettingsGroup([
    { key: 'greeting_msg', value: greetingMsg },
    { key: 'called_msg', value: calledMsg },
    { key: 'completion_msg', value: completionMsg },
    { key: 'debt_msg', value: debtMsg }
  ]);

  const saveQueueAndLoyalty = () => saveSettingsGroup([
    { key: 'max_queue_size', value: maxQueueSize },
    { key: 'queue_hours', value: queueHours },
    { key: 'loyalty_threshold', value: loyaltyThreshold }
  ]);

  const saveService = async () => {
    try {
      if (editingId) {
        await apiFetch(`/api/services/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(serviceForm)
        });
      } else {
        await apiFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify(serviceForm)
        });
      }
      setServiceForm({ name: '', price: '', description: '' });
      setEditingId(null);
      fetchServices();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteService = async (id) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await apiFetch(`/api/services/${id}`, { method: 'DELETE' });
        fetchServices();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const editService = (s) => {
    setEditingId(s.id);
    setServiceForm({ name: s.name, price: s.price, description: s.description || '' });
  };

  if (loading) return <main className="main-content"><p>Carregando...</p></main>;

  return (
    <main className="main-content">
      <header className="card-header">
        <div>
          <h2>Configurações do Sistema</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gerencie a identidade visual, mensagens do robô e regras do negócio</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Sessão 0: Identidade Visual e PIX */}
        <section className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-glass-hover)', padding: '10px', borderRadius: '10px', color: 'var(--primary)' }}>
              <Edit2 size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Identidade e Pagamentos</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Nome da Barbearia:</label>
              <input 
                type="text"
                className="form-control"
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
                placeholder="Ex: BarberFlow Premium"
              />
            </div>

            <div className="form-group">
              <label>Cor do Tema:</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  style={{ width: '45px', height: '45px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <code style={{ color: 'var(--primary)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>{themeColor.toUpperCase()}</code>
              </div>
            </div>

            <div className="form-group">
              <label>Chave PIX (Para cobrança de dívidas):</label>
              <input 
                type="text"
                className="form-control"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, Celular ou E-mail"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Esta chave será enviada automaticamente nas mensagens de saldo devedor.</span>
            </div>

            <button className="btn-primary" style={{ marginTop: '10px' }} onClick={savePersonalization}>
              <Save size={16} style={{ marginRight: '8px' }} /> Salvar Identidade
            </button>
          </div>
        </section>

        {/* Sessão 1: Regras de Negócio e Fidelidade */}
        <section className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-glass-hover)', padding: '10px', borderRadius: '10px', color: 'var(--success)' }}>
              <Save size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Regras e Fidelidade</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Limite da Fila (Pessoas):</label>
              <input 
                type="number"
                className="form-control"
                value={maxQueueSize}
                onChange={(e) => setMaxQueueSize(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Horário de Atendimento:</label>
              <input 
                type="text"
                className="form-control"
                value={queueHours}
                onChange={(e) => setQueueHours(e.target.value)}
                placeholder="08:00-19:00"
              />
            </div>

            <div className="form-group">
              <label>Meta para Brinde (Pontos):</label>
              <input 
                type="number"
                className="form-control"
                value={loyaltyThreshold}
                onChange={(e) => setLoyaltyThreshold(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quantos cortes o cliente precisa fazer para ganhar 1 grátis?</span>
            </div>
            
            <button className="btn-primary" style={{ marginTop: '10px' }} onClick={saveQueueAndLoyalty}>
              <Save size={16} style={{ marginRight: '8px' }} /> Salvar Regras
            </button>
          </div>
        </section>

        {/* Sessão 2: Mensagens do WhatsApp */}
        <section className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-glass-hover)', padding: '10px', borderRadius: '10px', color: 'var(--warning)' }}>
              <Save size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Modelos de Mensagens do Robô</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>1. Saudação Inicial:</label>
              <textarea 
                className="form-control"
                style={{ height: '100px', padding: '10px', resize: 'none' }}
                value={greetingMsg}
                onChange={(e) => setGreetingMsg(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>2. Ao ser Chamado na Fila:</label>
              <textarea 
                className="form-control"
                style={{ height: '100px', padding: '10px', resize: 'none' }}
                value={calledMsg}
                onChange={(e) => setCalledMsg(e.target.value)}
                placeholder="Ex: Olá! Sua vez chegou. Pode vir para a cadeira!"
              />
            </div>

            <div className="form-group">
              <label>3. Finalização e Avaliação:</label>
              <textarea 
                className="form-control"
                style={{ height: '100px', padding: '10px', resize: 'none' }}
                value={completionMsg}
                onChange={(e) => setCompletionMsg(e.target.value)}
                placeholder="Ex: Obrigado pela preferência! De 1 a 5, como foi seu corte?"
              />
            </div>

            <div className="form-group">
              <label>4. Aviso de Saldo Devedor:</label>
              <textarea 
                className="form-control"
                style={{ height: '100px', padding: '10px', resize: 'none' }}
                value={debtMsg}
                onChange={(e) => setDebtMsg(e.target.value)}
                placeholder="Ex: Consta um saldo devedor. Segue nossa chave PIX para quitação..."
              />
            </div>
          </div>
          
          <button className="btn-primary" style={{ marginTop: '20px' }} onClick={saveBotTexts}>
            <Save size={16} style={{ marginRight: '8px' }} /> Salvar Todas as Mensagens
          </button>
        </section>

        {/* Sessão 3: Gerenciador de Catálogo */}
        <section className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--bg-glass-hover)', padding: '10px', borderRadius: '10px', color: 'var(--primary)' }}>
                <Plus size={20} />
              </div>
              <h3 style={{ margin: 0 }}>Catálogo de Serviços</h3>
            </div>
            {!editingId && (
              <button className="btn-glass" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => setEditingId('new')}>
                <Plus size={16} style={{ marginRight: '8px' }} /> Novo Serviço
              </button>
            )}
          </div>

          {editingId && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ marginTop: 0, marginBottom: '16px' }}>{editingId === 'new' ? 'Adicionar Novo Serviço' : 'Editar Serviço'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <input 
                  type="text" className="form-control" placeholder="Nome do Serviço" 
                  value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                  style={{ paddingLeft: '12px' }}
                />
                <input 
                  type="number" className="form-control" placeholder="Preço" step="0.01"
                  value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                  style={{ paddingLeft: '12px' }}
                />
              </div>
              <input 
                  type="text" className="form-control" placeholder="Descrição (opcional)" 
                  value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                  style={{ paddingLeft: '12px', marginBottom: '20px' }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-primary" onClick={saveService}>Salvar</button>
                <button className="btn-glass" onClick={() => { setEditingId(null); setServiceForm({name:'', price:'', description:''}); }}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {services.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--primary)' }}>{s.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>R$ {s.price.toFixed(2)}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-icon" onClick={() => editService(s)}><Edit2 size={16} /></button>
                  <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteService(s.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
