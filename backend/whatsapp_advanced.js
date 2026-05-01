const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const dbManager = require('./database');
const fs = require('fs');
const path = require('path');

let sock = null;
let qrCodeString = null;
let connectionStatus = 'disconnected';
let ioInstance = null;
let pairingCode = null;

async function startWhatsApp(io, phoneNumber = null) {
    if (io) ioInstance = io;

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp] Usando v${version.join('.')} (Latest: ${isLatest})`);

    // Caminho adaptativo para persistência
    const authPath = process.env.SESSION_PATH || (process.env.NODE_ENV === 'production' 
        ? path.join(__dirname, 'session_data') 
        : 'C:\\BarberFlowSession');
    
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    sock = makeWASocket({
        auth: state,
        version,
        logger: pino({ level: 'debug' }),
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
            if (lastDisconnect.error) {
                console.log('Detalhe do Erro:', lastDisconnect.error.message || lastDisconnect.error);
            }
            if (shouldReconnect) {
                if (sock) {
                    try { sock.logout(); } catch(e) {}
                    sock = null;
                }
                setTimeout(() => startWhatsApp(ioInstance), 3000);
            } else {
                connectionStatus = 'disconnected';
                if (ioInstance) ioInstance.emit('whatsapp_status', connectionStatus);
                restartWhatsApp(true);
            }
        } else if (connection === 'open') {
            qrCodeString = null;
            pairingCode = null;
            connectionStatus = 'connected';
            console.log('[WhatsApp] Conectado!');
            if (ioInstance) ioInstance.emit('whatsapp_status', connectionStatus);
        }
    });

const { handleBotLogic } = require('./bot_manager');

// ... (existing code remains same until messages.upsert)

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        if (remoteJid.endsWith('@g.us')) return;

        const phone = remoteJid.split('@')[0];
        const pushName = msg.pushName || 'Cliente';

        await handleBotLogic(sock, phone, msg.message, pushName, remoteJid);
    });
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
