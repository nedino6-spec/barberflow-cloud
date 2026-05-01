import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Award, RefreshCw, Smartphone, Star, UserMinus, ShieldCheck, Settings, Save } from 'lucide-react';
import { apiFetch } from '../api';
import toast from 'react-hot-toast';

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('retention');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [retentionClients, setRetentionClients] = useState([]);
  const [loyaltyRanking, setLoyaltyRanking] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [lastWinner, setLastWinner] = useState(null);
  const [isRaffling, setIsRaffling] = useState(false);

  const [crmConfig, setCrmConfig] = useState({
    retention_days: '20',
    retention_msg: '',
    bot_enabled: 'true'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRet, resLoy, resRat, resLw, resSet] = await Promise.all([
        apiFetch('/api/marketing/retention'),
        apiFetch('/api/marketing/loyalty'),
        apiFetch('/api/marketing/ratings'),
        apiFetch('/api/marketing/raffle/last'),
        apiFetch('/api/settings')
      ]);
      setRetentionClients(await resRet.json());
      setLoyaltyRanking(await resLoy.json());
      setRatings(await resRat.json());
      setLastWinner(await resLw.json());
      
      const settings = await resSet.json();
      setCrmConfig({
        retention_days: settings.retention_days || '20',
        retention_msg: settings.retention_msg || '',
        bot_enabled: settings.bot_enabled || 'true'
      });
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveCrmConfig = async () => {
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(crmConfig)
      });
      toast.success('Configurações salvas!');
    } catch (e) {
      toast.error('Erro ao salvar.');
    }
  };

  const handleRaffle = async () => {
    if (!confirm('Deseja realizar o sorteio mensal agora? Um cliente ganhará um corte grátis!')) return;
    setIsRaffling(true);
    try {
        const res = await apiFetch('/api/marketing/raffle', { method: 'POST' });
        const data = await res.json();
        if (data.id) {
            toast.success(`🎉 Ganhador: ${data.name}`);
            fetchData();
        } else {
            toast.error(data.error || 'Erro no sorteio');
        }
    } catch (e) {
        toast.error('Falha ao realizar sorteio');
    } finally {
        setIsRaffling(false);
    }
  };

  const handleBroadcast = async () => {
    if (!message.trim()) return toast.error('Digite a mensagem.');
    setIsSending(true);
    try {
      await apiFetch('/api/marketing/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      toast.success('Enviado com sucesso!');
      setMessage('');
    } catch (err) {
      toast.error('Falha no envio.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="main-viewport">
      <header className="card-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Marketing AI & Fidelidade</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Recupere clientes e aumente seu faturamento automaticamente</p>
        </div>
        <button className="btn-glass" onClick={fetchData} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin-animation' : ''} />
        </button>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        {[
          { id: 'retention', label: 'IA CRM (Recuperação)', icon: <ShieldCheck size={16} /> },
          { id: 'broadcast', label: 'Disparo VIP', icon: <Send size={16} /> },
          { id: 'loyalty', label: 'Fidelidade', icon: <Award size={16} /> },
          { id: 'raffle', label: 'Sorteios', icon: <Megaphone size={16} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'black' : 'var(--text-muted)',
              fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <div style={{ gridColumn: 'span 2' }}>
          {activeTab === 'retention' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px' }}>Clientes Ausentes ({retentionClients.length})</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {retentionClients.length === 0 ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Todos os seus clientes estão ativos!</p> : (
                    retentionClients.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Última visita: {c.last_visit ? new Date(c.last_visit).toLocaleDateString('pt-BR') : 'Nunca'} 
                            {c.last_reminder_sent && <span style={{ color: 'var(--success)', marginLeft: '8px' }}>• Lembrete enviado</span>}
                          </div>
                        </div>
                        <button className="btn-glass" style={{ fontSize: '0.8rem' }} onClick={() => window.open(`https://wa.me/55${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(crmConfig.retention_msg.replace('{nome}', c.name.split(' ')[0]))}`)}>
                          Mandar Zap
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Settings size={20} className="text-gold" />
                  <h3 style={{ margin: 0 }}>Ajustes do CRM</h3>
                </div>
                
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Dias para considerar "Sumido"</label>
                  <input 
                    type="number" className="form-control" 
                    value={crmConfig.retention_days} 
                    onChange={e => setCrmConfig({...crmConfig, retention_days: e.target.value})} 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Mensagem de Convite</label>
                  <textarea 
                    className="form-control" rows="6" 
                    placeholder="Use {nome} para o nome do cliente"
                    value={crmConfig.retention_msg} 
                    onChange={e => setCrmConfig({...crmConfig, retention_msg: e.target.value})}
                  />
                </div>

                <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={saveCrmConfig}>
                  <Save size={18} /> Salvar Automação
                </button>

                <div style={{ marginTop: '20px', padding: '15px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--success)', lineHeight: '1.4' }}>
                    <strong>Dica de Ouro:</strong> Ofereça um desconto real na mensagem para aumentar em 3x as chances de volta.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="glass-panel" style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Disparo de Promoções VIP</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Envie uma mensagem personalizada para toda a sua base de dados (Cuidado para não ser bloqueado!).</p>
              <textarea 
                className="form-control" rows="8" 
                placeholder="Ex: Olá! Promoção relâmpago hoje: Corte + Barba por apenas R$ 45!"
                value={message} onChange={e => setMessage(e.target.value)}
                style={{ marginBottom: '24px', fontSize: '1.1rem' }}
              />
              <button className="btn-primary" style={{ padding: '15px 40px' }} onClick={handleBroadcast} disabled={isSending}>
                {isSending ? 'Enviando...' : 'Realizar Disparo em Massa'}
              </button>
            </div>
          )}

          {activeTab === 'loyalty' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '24px' }}>Top 10 Clientes Féis (Ranking de Pontos)</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {loyaltyRanking.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '1.1rem' }}><strong style={{ color: 'var(--primary)', marginRight: '15px' }}>#{i+1}</strong> {c.name}</span>
                    <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>{c.points} Pontos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'raffle' && (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ width: '100px', height: '100px', background: 'rgba(212,175,55,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', color: 'var(--gold)' }}>
                <Award size={50} />
              </div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Sorteio de Corte Grátis</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '1.1rem' }}>Presenteie seus clientes e gere engajamento social. O robô avisará o vencedor na hora!</p>
              
              {lastWinner && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '30px', borderRadius: '20px', marginBottom: '40px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>Último Sortudo:</h4>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--success)' }}>{lastWinner.name}</div>
                </div>
              )}

              <button className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem' }} onClick={handleRaffle} disabled={isRaffling}>
                {isRaffling ? 'O robô está escolhendo...' : 'SORTEAR AGORA!'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
