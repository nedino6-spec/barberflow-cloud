const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const dbManager = require('./database');
const fs = require('fs');
const path = require('path');
const { handleBotLogic } = require('./bot_manager');

let sock = null;
let qrCodeString = null;
let connectionStatus = 'disconnected';
let ioInstance = null;
let pairingCode = null;
let isStarting = false;

async function startWhatsApp(io, phoneNumber = null) {
    if (isStarting) {
        console.log('[WhatsApp] Já existe uma tentativa de conexão em curso...');
        return;
    }
    isStarting = true;

    if (io) ioInstance = io;

    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[WhatsApp] Usando v${version.join('.')} (Latest: ${isLatest})`);

        // Caminho adaptativo para persistência
        const authPath = process.env.SESSION_PATH || (process.env.NODE_ENV === 'production' 
            ? path.join(__dirname, 'session_data') 
            : 'C:\\BarberFlowSession');
        
        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            version,
            logger: pino({ level: 'error' }), // Reduzido log para evitar poluição
            browser: ['Windows', 'Chrome', '114.0.5735.199'],
            printQRInTerminal: false,
            authTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000
        });

        // Solicitar Código de Pareamento se solicitado
        if (!sock.authState.creds.registered && phoneNumber) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    pairingCode = code;
                    console.log(`\n>>> CODIGO DE CONEXAO: ${code} <<<\n`);
                    if (ioInstance) ioInstance.emit('whatsapp_pairing_code', code);
                } catch (e) {
                    console.error('Erro ao solicitar codigo:', e.message);
                }
            }, 3000);
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCodeString = qr;
                connectionStatus = 'qr';
                if (ioInstance) ioInstance.emit('whatsapp_qr', qr);
                console.log('[WhatsApp] QR Code gerado.');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                const shouldReconnect = (statusCode !== DisconnectReason.loggedOut);
                
                console.log(`Conexao fechada (Motivo: ${statusCode}). Reconectando: ${shouldReconnect}`);
                
                connectionStatus = 'disconnected';
                if (ioInstance) ioInstance.emit('whatsapp_status', connectionStatus);

                if (shouldReconnect) {
                    if (sock) {
                        try { sock.logout(); } catch(e) {}
                        sock = null;
                    }
                    isStarting = false;
                    setTimeout(() => startWhatsApp(ioInstance), 5000);
                } else {
                    isStarting = false;
                    restartWhatsApp(true);
                }
            } else if (connection === 'open') {
                qrCodeString = null;
                pairingCode = null;
                connectionStatus = 'connected';
                isStarting = false;
                console.log('[WhatsApp] Conectado com sucesso!');
                if (ioInstance) ioInstance.emit('whatsapp_status', connectionStatus);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const remoteJid = msg.key.remoteJid;
            
            // BLOQUEIO ESTRITO: Só responde se for conversa privada
            if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid')) {
                return;
            }

            const phone = remoteJid.split('@')[0].split(':')[0];
            const pushName = msg.pushName || 'Cliente';

            console.log(`[WhatsApp] Processando bot para: ${phone} (${pushName})`);
            await handleBotLogic(sock, phone, msg.message, pushName, remoteJid);
        });

    } catch (err) {
        console.error('[WhatsApp] Erro crítico ao iniciar:', err);
        isStarting = false;
        setTimeout(() => startWhatsApp(ioInstance), 10000);
    }
}

async function restartWhatsApp(clearSession = false) {
    connectionStatus = 'disconnected';
    if (ioInstance) ioInstance.emit('whatsapp_status', connectionStatus);

    if (sock) {
        sock.end(undefined);
        sock = null;
    }

    if (clearSession) {
        try {
            const authPath = path.resolve(__dirname, 'auth_baileys');
            if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
        } catch (err) {}
    }

    setTimeout(() => startWhatsApp(ioInstance), 3000);
}

function getStatus() { 
    return { status: connectionStatus, qr: qrCodeString, pairingCode }; 
}

function getClient() { 
    if (!sock) return null;
    return {
        sendMessage: async (jid, content) => {
            if (typeof content === 'string') {
                return await sock.sendMessage(jid, { text: content });
            }
        }
    }; 
}

module.exports = { startWhatsApp, getStatus, getClient, restartWhatsApp };
