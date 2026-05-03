import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Check, Clock, UserCheck, Play, QrCode, TrendingUp, Users, Trash2, XCircle, Plus, Settings, Smartphone, RefreshCw, LogOut } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiFetch, getServerUrl } from '../api';

const baseUrl = getServerUrl();
const socket = io(baseUrl, {
  extraHeaders: {
    "Bypass-Tunnel-Reminder": "true"
  }
});

export default function Dashboard() {
  const [waStatus, setWaStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [stats, setStats] = useState({ total_clients: 0, waiting_queue: 0, serving_queue: 0, completed_appointments: 0, daily_revenue: 0 });
  const [queue, setQueue] = useState([]);
  const [localIp, setLocalIp] = useState('');
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMobileQr, setShowMobileQr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQueueItem, setNewQueueItem] = useState({ phone: '', name: '', service: '' });
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [services, setServices] = useState([]);
  
  const [paymentModal, setPaymentModal] = useState({ 
    show: false, 
    client: null, 
    totalPrice: 0, 
    amountPaid: 0, 
    paymentMethod: 'PIX' 
  });

  const playDing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.log(e); }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch('/api/stats');
      const data = await res.json();
      setStats(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchServices = async () => {
      try {
          const res = await apiFetch('/api/services');
          const data = await res.json();
          setServices(data);
      } catch(e) {
          console.log(e);
      }
  };

  const fetchQueue = async () => {
    try {
      const res = await apiFetch('/api/queue');
      const data = await res.json();
      setQueue(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/status');
      const data = await res.json();
      setWaStatus(data.status);
      if (data.status === 'qr' && data.qr) {
        setQrCode(data.qr);
      } else if (data.status === 'connected') {
        setQrCode(null);
        setShowQrModal(false); 
      }
    } catch (error) {
      console.error(error);
      setWaStatus('offline');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStatus();
    fetchServices();
    fetchQueue();

    apiFetch('/api/network-info')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if(data) setLocalIp(data.ip); })
      .catch(e => console.error("Erro IP:", e));
    
    socket.on('whatsapp_status', (status) => {
      setWaStatus(status);
      if (status === 'connected') {
        setQrCode(null);
        setTimeout(() => setShowQrModal(false), 2000); // Fecha em 2s para o usuário ver o sucesso
      }
    });

    socket.on('whatsapp_qr', (qr) => {
      setQrCode(qr);
      setWaStatus('qr');
      setShowQrModal(true);
    });

    socket.on('queue_update', (updatedQueue) => {
      setQueue(prev => {
        if (updatedQueue.length > prev.length) {
          playDing();
          const newEntry = updatedQueue[updatedQueue.length - 1];
          if (newEntry && newEntry.name) {
             speak(`Novo cliente na fila: ${newEntry.name}`);
          }
        }
        return updatedQueue;
      });
      fetchStats(); 
      setLastUpdate(new Date().toLocaleTimeString());
    });

    socket.on('clients_update', () => {
      fetchStats();
    });

    const fallbackInterval = setInterval(() => {
      fetchStats();
      fetchQueue();
    }, 30000);

    return () => {
      socket.off('queue_update');
      socket.off('clients_update');
      socket.off('whatsapp_status');
      socket.off('whatsapp_qr');
      clearInterval(fallbackInterval);
    };
  }, []);

  const updateStatus = async (id, status, paymentData = null) => {
    try {
      let body = { status };
      if (paymentData) body = { ...body, ...paymentData };
      
      await apiFetch(`/api/queue/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (status === 'completed') toast.success('Atendimento finalizado!');
      if (status === 'cancelled') toast.success('Atendimento cancelado!');
      setPaymentModal({ show: false, client: null, totalPrice: 0, amountPaid: 0, paymentMethod: 'PIX' });
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const openPaymentModal = (client) => {
      setPaymentModal({
          show: true,
          client: client,
          totalPrice: client.price || 0,
          amountPaid: client.price || 0,
          paymentMethod: 'PIX'
      });
  };

  const handlePaymentConfirm = () => {
      updateStatus(paymentModal.client.id, 'completed', {
          total_price: paymentModal.totalPrice,
          amount_paid: paymentModal.amountPaid,
          payment_method: paymentModal.paymentMethod
      });
  };

  const removeFromQueue = async (id) => {
      if(!confirm('Deseja remover este cliente?')) return;
      try {
          await apiFetch(`/api/queue/${id}`, { method: 'DELETE' });
          toast.success('Removido da fila!');
      } catch (e) {
          toast.error('Erro ao remover');
      }
  };

  const handleAddQueue = async () => {
      if(!newQueueItem.name || !newQueueItem.service) {
          toast.error('Preencha nome e serviço');
          return;
      }
      try {
          await apiFetch('/api/queue', {
              method: 'POST',
              body: JSON.stringify({
                  phone: newQueueItem.phone || 'Balcão',
                  name: newQueueItem.name.trim(),
                  service: newQueueItem.service
              })
          });
          toast.success('Adicionado!');
          setShowAddModal(false);
          setNewQueueItem({phone: '', name: '', service: ''});
      } catch(e) {
          toast.error('Erro ao adicionar');
      }
  };

  const waitingQueue = queue.filter(q => q.status === 'waiting');
  const servingQueue = queue.filter(q => q.status === 'serving');

  return (
    <main className="main-viewport">
      {/* Barra de Status de Conexão - Crucial para saber se está no PC ou Nuvem */}
      <div className="glass-panel" style={{ 
        padding: '8px 16px', 
        marginBottom: '20px', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '10px',
        borderLeft: waStatus === 'connected' ? '4px solid var(--success)' : '4px solid var(--danger)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: waStatus === 'connected' ? 'var(--success)' : 'var(--danger)',
              boxShadow: waStatus === 'connected' ? '0 0 10px var(--success)' : 'none'
            }}></div>
            <span>Status: <b>{waStatus === 'connected' ? 'ONLINE' : 'DESCONECTADO'}</b></span>
          </div>
          <button onClick={() => { localStorage.removeItem('server_url'); window.location.reload(); }} style={{ padding: '4px 8px', fontSize: '0.7rem' }} className="btn-glass">
            Resetar Conexão
          </button>
        </div>
        
        {waStatus === 'offline' && (
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--danger)' }}>
              ⚠️ Não foi possível conectar automaticamente.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                id="manual_ip"
                type="text" 
                placeholder="Ex: http://192.168.24.13:3001" 
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--danger)', background: 'transparent', color: '#fff', fontSize: '0.8rem' }}
              />
              <button 
                className="btn-primary" 
                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                onClick={() => {
                  const val = document.getElementById('manual_ip').value;
                  if (val) {
                    localStorage.setItem('server_url', val);
                    window.location.reload();
                  }
                }}
              >
                Conectar
              </button>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Digite o "ACESSO LOCAL" que aparece no terminal do seu computador.
            </p>
          </div>
        )}

        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Servidor Atual: <code style={{ color: 'var(--primary)' }}>{baseUrl}</code>
        </div>
      </div>

      {/* Banner de Boas-vindas Estilo Gendo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel welcome-banner"
        style={{ 
          marginBottom: '24px', 
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px'
        }}
      >
        <div className="welcome-text">
          <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>ND Barbearia <span className="text-gold">Premium</span></h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            {waStatus === 'connected' ? '✅ Robô WhatsApp Ativo' : '❌ Robô Offline'}
          </p>
        </div>
        <div className="no-mobile" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '8px 16px' }}>
            <Plus size={18} /> Novo
          </button>
        </div>
      </motion.div>

      {/* Grid de Estatísticas Premium */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Hoje', val: stats.completed_appointments, icon: <UserCheck />, color: 'var(--success)', trend: '+12%' },
          { label: 'Receita', val: `R$ ${stats.daily_revenue?.toFixed(0) || '0'}`, icon: <TrendingUp />, color: 'var(--primary)', trend: '+5%' },
          { label: 'Fila', val: waitingQueue.length, icon: <Clock />, color: 'var(--warning)', trend: 'Ativo' },
          { label: 'Chat', val: servingQueue.length, icon: <Play />, color: 'var(--info)', trend: 'OK' }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel" 
            style={{ padding: '16px', position: 'relative', borderLeft: `3px solid ${item.color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: item.color }}>
                {React.cloneElement(item.icon, { size: 16 })}
              </div>
            </div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{item.val}</h3>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-grid">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel" 
          style={{ padding: '24px' }}
        >
          <div className="card-header">
            <h3>🔥 Em Atendimento</h3>
            <span className="badge badge-success">{servingQueue.length} Ativo(s)</span>
          </div>
          <div className="queue-list">
            <AnimatePresence>
              {servingQueue.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Ninguém sendo atendido no momento.</p>
              )}
              {servingQueue.map(c => (
                <motion.div 
                  key={c.id} 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="queue-item" 
                  style={{ borderLeft: '4px solid var(--success)', background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%)' }}
                >
                  <div className="queue-info">
                    <h4>{c.name}</h4>
                    <p>{c.service}</p>
                  </div>
                  <button className="btn-primary" onClick={() => openPaymentModal(c)}>Finalizar</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel" 
          style={{ padding: '24px' }}
        >
          <div className="card-header">
            <h3>⏳ Fila de Espera</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-glass" onClick={() => setShowAddModal(true)} style={{ padding: '6px 10px' }}><Plus size={18} /></button>
            </div>
          </div>
          <div className="queue-list">
            <AnimatePresence>
              {waitingQueue.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Fila vazia. O robô está pronto para receber clientes!</p>
              )}
              {waitingQueue.map((c, i) => (
                <motion.div 
                  key={c.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="queue-item"
                >
                  <div className="queue-info">
                    <h4><span style={{ color: 'var(--primary)', marginRight: '8px' }}>#{i+1}</span> {c.name}</h4>
                    <p>{c.service}</p>
                  </div>
                  <div className="queue-actions">
                    <button className="btn-glass" style={{ color: 'var(--success)', padding: '8px' }} onClick={() => updateStatus(c.id, 'serving')} title="Iniciar Atendimento">
                      <Play size={16} fill="currentColor" />
                    </button>
                    <button className="btn-glass" style={{ color: 'var(--danger)', padding: '8px' }} onClick={() => removeFromQueue(c.id)} title="Remover">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Modais com AnimatePresence e Layout Refinado */}
      {showMobileQr && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel" 
            style={{ padding: '40px', textAlign: 'center', maxWidth: '440px', position: 'relative', border: '1px solid var(--primary)' }}
          >
            <button className="btn-icon" onClick={() => setShowMobileQr(false)} style={{ position: 'absolute', top: '15px', right: '15px' }}>
              <XCircle size={24} />
            </button>
            <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              <Smartphone size={32} className="text-primary" />
              <span>Mobile Link</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
              Escaneie para gerenciar a barbearia do seu celular.
            </p>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', display: 'inline-block', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
              <QRCodeCanvas 
                value={baseUrl} 
                size={220} 
                level="H"
              />
            </div>
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', opacity: 0.7 }}>Link de Acesso:</p>
                <code style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>{baseUrl}</code>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showQrModal && (
        <div className="modal-overlay">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel" 
            style={{ padding: '40px', maxWidth: '800px', width: '90%', position: 'relative' }}
          >
            <button className="btn-icon" onClick={() => setShowQrModal(false)} style={{ position: 'absolute', top: '20px', right: '20px' }}>
              <XCircle size={30} />
            </button>
            {waStatus === 'qr' && qrCode ? (
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <h2 className="text-gold">Conectar WhatsApp</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      1. Abra o WhatsApp no seu celular.<br/>
                      2. Toque em **Aparelhos Conectados**.<br/>
                      3. Toque em **Conectar um Aparelho**.<br/>
                      4. Aponte a câmera para este código.
                    </p>
                    <div style={{ marginTop: '20px', padding: '12px', borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>⚠️ Mantenha esta tela aberta até a conexão completar.</p>
                    </div>
                  </div>
                  <div style={{ position: 'relative', padding: '16px', background: '#fff', borderRadius: '16px' }}>
                    <div className="scanner-line"></div>
                    <QRCodeCanvas value={qrCode} size={280} />
                  </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                    >
                      <Check size={100} className="text-success" style={{ marginBottom: '20px' }} />
                    </motion.div>
                    <h2 className="text-gold">WhatsApp Conectado!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>O robô está pronto para atender seus clientes.</p>
                    <button className="btn-primary" style={{ marginTop: '24px' }} onClick={() => setShowQrModal(false)}>Voltar ao Painel</button>
                </div>
            )}
          </motion.div>
        </div>
      )}

      {paymentModal.show && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ padding: '30px', width: '400px' }}>
            <h2>Confirmar Pagamento</h2>
            <p>Cliente: {paymentModal.client?.name}</p>
            <div className="form-group">
                <label>Valor Total</label>
                <input className="form-control" type="number" value={paymentModal.totalPrice} onChange={e => setPaymentModal({...paymentModal, totalPrice: parseFloat(e.target.value)})} />
            </div>
            <button className="btn-primary" onClick={handlePaymentConfirm} style={{ width: '100%', marginTop: '20px' }}>Confirmar</button>
            <button className="btn-glass" onClick={() => setPaymentModal({...paymentModal, show: false})} style={{ width: '100%', marginTop: '10px' }}>Cancelar</button>
          </div>
        </div>
      )}
    </main>
  );
}
