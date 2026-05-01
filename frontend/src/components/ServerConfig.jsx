import React, { useState } from 'react';
import { Globe, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { getServerUrl, setServerUrl } from '../api';

export default function ServerConfig({ onConfigured }) {
  const [url, setUrl] = useState(getServerUrl());
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setTesting(true);
    
    try {
      // Tenta validar a URL
      if (!url.startsWith('http')) {
        throw new Error('A URL deve começar com http:// ou https://');
      }

      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Tenta um fetch simples para ver se o server responde
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${cleanUrl}/api/status`, { 
        signal: controller.signal 
      }).catch(e => {
          if (e.name === 'AbortError') throw new Error('Servidor demorou demais para responder');
          throw new Error('Não foi possível conectar a este endereço');
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        setServerUrl(cleanUrl);
        onConfigured();
      } else {
        throw new Error('O endereço é válido, mas o servidor retornou um erro');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0f172a',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
            <Globe size={32} style={{ color: '#38bdf8' }} />
          </div>
          <h2 style={{ margin: 0, color: '#fff' }}>Configurar Servidor</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
            Digite o endereço (IP ou Link) do seu computador para o App se conectar.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Ex: http://192.168.1.5:3001" 
              className="form-control" 
              style={{ padding: '12px 16px', height: '50px', fontSize: '1rem', background: 'rgba(255,255,255,0.05)' }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#f87171', fontSize: '0.9rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
              onClick={handleSave} 
              className="btn-primary" 
              disabled={testing}
              style={{ flex: 1, height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {testing ? <RefreshCw size={20} className="spin" /> : <><Save size={20} /> Salvar e Conectar</>}
            </button>
          </div>
          
          <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            <strong>Dica:</strong> Se você estiver usando o link do WhatsApp (localtunnel), cole ele aqui completo (ex: https://xxx.loca.lt).
          </div>
        </div>
      </div>
    </div>
  );
}
