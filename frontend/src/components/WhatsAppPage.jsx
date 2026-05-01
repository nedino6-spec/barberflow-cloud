import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, XCircle, CheckCircle, RefreshCw, Smartphone, Keyboard, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../api';

let baseUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    baseUrl = 'http://localhost:3001';
}
const socket = io(baseUrl);

export default function WhatsAppPage() {
  const [waStatus, setWaStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [showPairingInput, setShowPairingInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/status');
      const data = await res.json();
      setWaStatus(data.status);
      if (data.status === 'qr' && data.qr) {
        setQrCode(data.qr);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStatus();

    socket.on('whatsapp_status', (status) => {
      setWaStatus(status);
      if (status === 'connected') {
        setQrCode(null);
        setPairingCode(null);
        setShowPairingInput(false);
        toast.success('WhatsApp Conectado!');
      }
    });

    socket.on('whatsapp_qr', (qr) => {
      setWaStatus('qr');
      setQrCode(qr);
      setPairingCode(null);
    });

    socket.on('whatsapp_pairing_code', (code) => {
      setPairingCode(code);
      setQrCode(null);
      toast.success('Código de pareamento gerado!');
    });

    return () => {
      socket.off('whatsapp_status');
      socket.off('whatsapp_qr');
      socket.off('whatsapp_pairing_code');
    };
  }, []);

  const handleRequestPairingCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Digite um número válido com DDD');
      return;
    }
    setIsRestarting(true);
    try {
      const res = await apiFetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      if (res.ok) {
        toast('Solicitando código...', { icon: '⏳' });
      }
    } catch (e) {
      toast.error('Erro ao solicitar código');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar o WhatsApp?')) return;
    try {
      await apiFetch('/api/whatsapp/disconnect', { method: 'POST' });
      toast.success('Desconectando...');
    } catch (e) {
      toast.error('Erro ao desconectar');
    }
  };

  return (
    <main className="main-content">
      <div className="connection-container">
        {/* LADO ESQUERDO: INSTRUÇÕES */}
        <div className="instructions-panel">
          <div className="brand-header">
            <Smartphone className="text-primary" size={32} />
            <h2>BarberFlow Web</h2>
          </div>
          
          <div className="steps-list">
            <h3>Use o BarberFlow no seu WhatsApp:</h3>
            <ol>
              <li>Abra o WhatsApp no seu celular</li>
              <li>Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong> e selecione <strong>Aparelhos conectados</strong></li>
              <li>Toque em <strong>Conectar um aparelho</strong></li>
              <li>Aponte seu celular para esta tela para capturar o código QR</li>
            </ol>
          </div>

          <div className="pairing-options">
            {!showPairingInput ? (
              <button className="link-button" onClick={() => setShowPairingInput(true)}>
                Conectar com número de telefone
              </button>
            ) : (
              <div className="pairing-input-box">
                <input 
                  type="text" 
                  placeholder="Ex: 11999998888" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                />
                <button onClick={handleRequestPairingCode} disabled={isRestarting}>
                  {isRestarting ? <RefreshCw className="spin-animation" size={18} /> : <ArrowRight size={18} />}
                </button>
                <button className="text-button" onClick={() => setShowPairingInput(false)}>Cancelar</button>
              </div>
            )}
          </div>
          
          {waStatus === 'connected' && (
            <button className="disconnect-btn" onClick={handleDisconnect}>
              Sair da conta
            </button>
          )}
        </div>

        {/* LADO DIREITO: QR CODE OU CÓDIGO */}
        <div className="visual-panel">
          {waStatus === 'connected' ? (
            <div className="status-card connected">
              <CheckCircle size={80} className="text-success" />
              <h2>Tudo pronto!</h2>
              <p>Seu WhatsApp está conectado e o robô está ativo atendendo seus clientes.</p>
            </div>
          ) : waStatus === 'disconnected' || isRestarting ? (
            <div className="status-card loading">
              <RefreshCw size={50} className="text-primary spin-animation" />
              <h3>Iniciando conexão...</h3>
              <p>Aguarde enquanto preparamos o acesso seguro.</p>
            </div>
          ) : pairingCode ? (
            <div className="status-card pairing-code-display">
              <Keyboard size={50} className="text-primary" />
              <h3>Código de Pareamento</h3>
              <div className="code-box">
                {pairingCode.split('').map((char, i) => (
                  <span key={i} className="code-char">{char}</span>
                ))}
              </div>
              <p>Digite este código no seu WhatsApp após clicar em "Conectar com número de telefone".</p>
              <button className="text-button" onClick={() => window.location.reload()}>Voltar para QR Code</button>
            </div>
          ) : qrCode ? (
            <div className="qr-card">
              <div className="qr-wrapper">
                <QRCodeSVG value={qrCode} size={260} level="H" />
              </div>
              <div className="qr-refresh">
                <QrCode size={20} />
                <span>Atualizado em tempo real</span>
              </div>
            </div>
          ) : (
            <div className="status-card loading">
              <RefreshCw size={50} className="text-primary spin-animation" />
              <h3>Gerando QR Code...</h3>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .connection-container {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
          max-width: 1000px;
          margin: 40px auto;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid var(--glass-border);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          min-height: 500px;
        }

        @media (max-width: 850px) {
          .connection-container {
            grid-template-columns: 1fr;
          }
        }

        .instructions-panel {
          padding: 60px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-header h2 {
          font-size: 28px;
          font-weight: 300;
          margin: 0;
        }

        .steps-list h3 {
          font-size: 18px;
          font-weight: 400;
          margin-bottom: 20px;
          color: var(--text-secondary);
        }

        .steps-list ol {
          padding-left: 20px;
          color: var(--text-secondary);
          line-height: 1.8;
        }

        .steps-list li {
          margin-bottom: 12px;
        }

        .visual-panel {
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
        }

        .qr-card {
          text-align: center;
        }

        .qr-wrapper {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          display: inline-block;
        }

        .qr-refresh {
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-muted);
        }

        .status-card {
          text-align: center;
          max-width: 300px;
        }

        .status-card h2, .status-card h3 {
          margin: 20px 0 10px;
        }

        .status-card p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .link-button {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 500;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          text-align: left;
        }

        .link-button:hover {
          text-decoration: underline;
        }

        .pairing-input-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pairing-input-box input {
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--glass-border);
          padding: 10px 15px;
          border-radius: 8px;
          color: #fff;
          width: 200px;
        }

        .pairing-input-box button {
          background: var(--primary);
          border: none;
          color: #000;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
        }

        .text-button {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
        }

        .code-box {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin: 20px 0;
        }

        .code-char {
          background: var(--primary);
          color: #000;
          font-size: 24px;
          font-weight: bold;
          padding: 10px 15px;
          border-radius: 8px;
          min-width: 40px;
          text-transform: uppercase;
        }

        .disconnect-btn {
          margin-top: auto;
          background: rgba(255,0,0,0.1);
          border: 1px solid rgba(255,0,0,0.3);
          color: #ff4444;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }

        .disconnect-btn:hover {
          background: rgba(255,0,0,0.2);
        }

        .spin-animation {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
