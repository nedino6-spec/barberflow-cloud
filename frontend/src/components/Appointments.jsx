import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, Trash2, Plus, Scissors } from 'lucide-react';
import { apiFetch } from '../api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    service: '',
    scheduled_time: ''
  });
  
  const [paymentModal, setPaymentModal] = useState({ 
    show: false, 
    appt: null, 
    totalPrice: 0, 
    amountPaid: 0, 
    paymentMethod: 'PIX' 
  });

  const fetchAppointments = async () => {
    try {
      const res = await apiFetch('/api/appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    
    // Configurar polling simples se o socket não estiver escutando no componente
    const interval = setInterval(fetchAppointments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setFormData({ phone: '', name: '', service: '', scheduled_time: '' });
      setIsModalOpen(false);
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
    }
  };

  const updateStatus = async (id, status, paymentData = null) => {
    try {
      let body = { status };
      if (paymentData) {
          body = { ...body, ...paymentData };
      }
      
      await apiFetch(`/api/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      fetchAppointments();
      setPaymentModal({ show: false, appt: null, totalPrice: 0, amountPaid: 0, paymentMethod: 'PIX' });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const openPaymentModal = (appt) => {
      // Diferente da Fila, o appt aqui não tem o price vindo direto num JOIN, 
      // então vamos sugerir 0 e deixar o barbeiro preencher ou podemos buscar do serviço se quisermos complicar.
      setPaymentModal({
          show: true,
          appt: appt,
          totalPrice: 0, // O barbeiro digita
          amountPaid: 0,
          paymentMethod: 'PIX'
      });
  };

  const handlePaymentConfirm = () => {
      updateStatus(paymentModal.appt.id, 'completed', {
          total_price: paymentModal.totalPrice,
          amount_paid: paymentModal.amountPaid,
          payment_method: paymentModal.paymentMethod
      });
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
      await apiFetch(`/api/appointments/${id}`, {
        method: 'DELETE'
      });
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao deletar agendamento:', err);
    }
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <main className="main-content">
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, marginBottom: '8px' }}>
            <Calendar className="text-primary" size={28} />
            Agendamentos
          </h1>
          <p className="text-muted" style={{ margin: 0 }}>Gerencie os horários marcados dos seus clientes.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} />
          Novo Agendamento
        </button>
      </header>

      <div className="dashboard-grid">
        <div className="card glass-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3>Próximos Agendamentos</h3>
          </div>
          
          <div className="queue-list" style={{ marginTop: '20px' }}>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Calendar size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
                <p>Nenhum agendamento futuro encontrado.</p>
              </div>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="queue-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: appt.status === 'completed' || appt.status === 'cancelled' ? 0.6 : 1 }}>
                  <div className="client-info">
                    <div className="client-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div className="avatar" style={{ background: 'var(--primary)', color: 'var(--bg-dark)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {appt.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{appt.name}</h4>
                        <div style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={14} /> {appt.phone}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Scissors size={14} /> {appt.service || 'Não especificado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        <Clock size={18} />
                        {formatDateTime(appt.scheduled_time)}
                      </div>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: appt.status === 'scheduled' ? 'rgba(212, 175, 55, 0.2)' : 
                                    appt.status === 'completed' ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)',
                        color: appt.status === 'scheduled' ? 'var(--primary)' : 
                               appt.status === 'completed' ? '#28a745' : '#dc3545',
                        marginTop: '5px',
                        display: 'inline-block'
                      }}>
                        {appt.status === 'scheduled' ? 'Agendado' : 
                         appt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </span>
                    </div>

                    <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                      {appt.status === 'scheduled' && (
                        <>
                          <button className="btn-icon" onClick={() => openPaymentModal(appt)} title="Marcar como Concluído" style={{ color: '#28a745' }}>
                            <CheckCircle size={20} />
                          </button>
                          <button className="btn-icon" onClick={() => updateStatus(appt.id, 'cancelled')} title="Cancelar Agendamento" style={{ color: '#dc3545' }}>
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                      <button className="btn-icon" onClick={() => deleteAppointment(appt.id)} title="Excluir" style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Novo Agendamento */}
      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{ width: '400px', padding: '30px', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XCircle size={24} />
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar className="text-primary" /> Novo Agendamento
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Nome do Cliente</label>
                <div className="input-group">
                  <User size={18} className="input-icon" />
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Ex: João Silva" className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <div className="input-group">
                  <Phone size={18} className="input-icon" />
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="5511999999999" className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Serviço</label>
                <div className="input-group">
                  <Scissors size={18} className="input-icon" />
                  <input type="text" name="service" value={formData.service} onChange={handleInputChange} required placeholder="Ex: Corte + Barba" className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Data e Hora</label>
                <div className="input-group">
                  <Clock size={18} className="input-icon" />
                  <input type="datetime-local" name="scheduled_time" value={formData.scheduled_time} onChange={handleInputChange} required className="form-control" />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px' }}>
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Pagamento */}
      {paymentModal.show && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{ width: '400px', padding: '30px', position: 'relative' }}>
            <button 
              onClick={() => setPaymentModal({ ...paymentModal, show: false })}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XCircle size={24} />
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle className="text-success" /> Confirmar Pagamento
            </h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Cliente: <span style={{fontWeight: 'normal', color: 'var(--primary)'}}>{paymentModal.appt?.name}</span></p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Serviço: <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>{paymentModal.appt?.service}</span></p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Valor Total do Serviço (R$)</label>
                <input type="number" step="0.01" className="form-control" value={paymentModal.totalPrice} onChange={e => setPaymentModal({...paymentModal, totalPrice: parseFloat(e.target.value) || 0})} />
              </div>

              <div className="form-group">
                <label>Método de Pagamento</label>
                <select className="form-control" value={paymentModal.paymentMethod} onChange={e => {
                    const method = e.target.value;
                    const newPaid = method === 'Fiado (Saldo Devedor)' ? 0 : paymentModal.totalPrice;
                    setPaymentModal({...paymentModal, paymentMethod: method, amountPaid: newPaid});
                }}>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Link de Pagamento">Link de Pagamento</option>
                  <option value="Mercado Pago / PicPay">Mercado Pago / PicPay</option>
                  <option value="Cortesia (Grátis)">Cortesia (Grátis)</option>
                  <option value="Fiado (Saldo Devedor)">Fiado / Pagamento Pendente</option>
                </select>
              </div>

              <div className="form-group">
                <label>Valor Pago Agora (R$)</label>
                <input type="number" step="0.01" className="form-control" value={paymentModal.amountPaid} onChange={e => setPaymentModal({...paymentModal, amountPaid: parseFloat(e.target.value) || 0})} />
                {paymentModal.amountPaid < paymentModal.totalPrice && (
                    <p style={{ color: 'var(--warning)', fontSize: '0.85rem', marginTop: '5px' }}>
                        * R$ {(paymentModal.totalPrice - paymentModal.amountPaid).toFixed(2)} serão adicionados ao Saldo Devedor.
                    </p>
                )}
              </div>

              <button className="btn-primary" onClick={handlePaymentConfirm} style={{ marginTop: '10px', padding: '12px', background: 'var(--success)' }}>
                Finalizar e Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
