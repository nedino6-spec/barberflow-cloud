import React, { useState } from 'react';
import { Lock, Scissors, ArrowRight } from 'lucide-react';
import { setToken, apiFetch } from '../api';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        onLogin(true);
      } else {
        setError(data.error || 'Senha incorreta');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-color)',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.15), transparent 50%)'
    }}>
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(212, 175, 55, 0.1)', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
          <Scissors size={40} className="text-primary" />
        </div>
        
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem' }}>BarberFlow</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Acesso restrito ao painel de controle</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group">
            <Lock size={20} className="input-icon" style={{ left: '16px' }} />
            <input 
              type="password" 
              placeholder="Senha de Acesso" 
              className="form-control" 
              style={{ paddingLeft: '48px', height: '50px', fontSize: '1.1rem', textAlign: 'center' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
          
          <button type="submit" className="btn-primary" disabled={loading} style={{ height: '50px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {loading ? 'Autenticando...' : <>Acessar Painel <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
