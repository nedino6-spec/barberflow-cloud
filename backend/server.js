console.log('>>> INICIANDO BACKEND BARBERFLOW...');
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const os = require('os');
const localtunnel = require('localtunnel');
const { startWhatsApp, getStatus, getClient, restartWhatsApp } = require('./whatsapp_advanced');
const dbManager = require('./database');
const { startMarketingWorker } = require('./marketing_worker');

const JWT_SECRET = 'barberflow_super_secret_key_2026';
const PORT = 3001;

process.on('uncaughtException', (err) => {
    console.error(`[${new Date().toLocaleString()}] ERRO: ${err.stack}`);
    fs.appendFileSync('crash.log', `[${new Date().toLocaleString()}] ${err.stack}\n`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toLocaleString()}] UNHANDLED REJECTION: ${reason}`);
    fs.appendFileSync('crash.log', `[${new Date().toLocaleString()}] REJECTION: ${reason}\n`);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Endpoints Básicos
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/status', (req, res) => res.json(getStatus()));
app.get('/api/network-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    let ip = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) ip = iface.address;
        }
    }
    res.json({ ip });
});

// Login
app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    const adminPass = await dbManager.getSetting('admin_password') || 'admin123';
    if (password === adminPass) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: 'Senha incorreta' });
});

// Fila e Clientes
app.get('/api/queue', async (req, res) => res.json(await dbManager.getQueue(true)));
app.get('/api/clients', async (req, res) => res.json(await dbManager.getClients()));
app.get('/api/stats', async (req, res) => {
    const queue = await dbManager.getQueue(true);
    const clients = await dbManager.getClients();
    res.json({
        total_clients: clients.length,
        waiting_queue: queue.filter(q => q.status === 'waiting').length,
        daily_revenue: queue.filter(q => q.status === 'completed').reduce((acc, curr) => acc + (curr.price || 0), 0)
    });
});

app.post('/api/whatsapp/restart', async (req, res) => {
    const { clearSession } = req.body || {};
    await restartWhatsApp(clearSession === true);
    res.json({ success: true });
});

app.post('/api/whatsapp/pairing-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Número de telefone é obrigatório' });
    
    // Limpa sessão atual e reinicia com código de pareamento
    await restartWhatsApp(true);
    setTimeout(() => {
        startWhatsApp(io, phone.replace(/\D/g, ''));
    }, 1000);
    
    res.json({ success: true, message: 'Solicitando código...' });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    await restartWhatsApp(true);
    res.json({ success: true });
});

// Settings
app.get('/api/settings', async (req, res) => {
    const keys = ['greeting_msg', 'theme_color', 'max_queue_size', 'queue_hours', 'bot_enabled', 'bot_audio_enabled'];
    const settings = {};
    for (const k of keys) { settings[k] = await dbManager.getSetting(k); }
    res.json(settings);
});
app.get('/api/settings/:key', async (req, res) => {
    const value = await dbManager.getSetting(req.params.key);
    res.json({ value });
});
app.post('/api/settings', async (req, res) => {
    for (const [k, v] of Object.entries(req.body)) {
        await dbManager.setSetting(k, v);
    }
    res.json({ success: true });
});

// Services
app.get('/api/services', async (req, res) => res.json(await dbManager.getServices()));
app.post('/api/services', async (req, res) => {
    const { name, price, description, image_url } = req.body;
    res.json(await dbManager.addService(name, price, description, image_url));
});
app.put('/api/services/:id', async (req, res) => {
    const { name, price, description, image_url } = req.body;
    res.json(await dbManager.updateService(req.params.id, name, price, description, image_url));
});
app.delete('/api/services/:id', async (req, res) => res.json(await dbManager.deleteService(req.params.id)));

// Queue
app.post('/api/queue', async (req, res) => {
    const { phone, name, service } = req.body;
    res.json(await dbManager.addToQueue(phone, name, service));
});
app.put('/api/queue/:id', async (req, res) => {
    const { status } = req.body;
    
    const queueList = await dbManager.getQueue(true);
    const item = queueList.find(q => q.id == req.params.id);
    
    await dbManager.updateQueueStatus(req.params.id, status);
    
    if (item && item.phone) {
        try {
            const client = getClient();
            if (client) {
                if (status === 'serving') {
                    const msg = await dbManager.getSetting('called_msg');
                    if (msg && msg.trim() !== '') await client.sendMessage(`${item.phone}@s.whatsapp.net`, msg);
                } else if (status === 'completed') {
                    const msg = await dbManager.getSetting('completion_msg');
                    if (msg && msg.trim() !== '') await client.sendMessage(`${item.phone}@s.whatsapp.net`, msg);
                }
            }
        } catch (e) {
            console.error('Erro ao notificar fila:', e.message);
        }
    }
    
    res.json({ success: true });
});
app.delete('/api/queue/:id', async (req, res) => {
    res.json(await dbManager.deleteFromQueue(req.params.id));
});

// Clients
app.post('/api/clients', async (req, res) => {
    const { phone, name, birth_date, instagram, address, observations } = req.body;
    res.json(await dbManager.createClient(phone, name, birth_date, instagram, address, observations));
});
app.put('/api/clients/:id', async (req, res) => {
    res.json(await dbManager.updateClient(req.params.id, req.body));
});
app.delete('/api/clients/:id', async (req, res) => {
    console.log(`[SERVER] Tentando apagar cliente ID: ${req.params.id}`);
    const result = await dbManager.deleteClient(req.params.id);
    console.log(`[SERVER] Resultado da exclusão:`, result);
    res.json({ success: true, changes: result });
});
app.delete('/api/clients', async (req, res) => {
    console.log(`[SERVER] Tentando apagar TODOS os clientes`);
    const result = await dbManager.deleteAllClients();
    res.json({ success: true, changes: result });
});

// Appointments
app.get('/api/appointments', async (req, res) => res.json(await dbManager.getAppointments()));
app.post('/api/appointments', async (req, res) => {
    const { phone, name, service, scheduled_time } = req.body;
    res.json(await dbManager.createAppointment(phone, name, service, scheduled_time));
});
app.delete('/api/appointments/:id', async (req, res) => {
    res.json(await dbManager.deleteAppointment(req.params.id));
});

// Marketing
app.get('/api/marketing/retention', async (req, res) => res.json(await dbManager.getRetentionClients()));
app.get('/api/marketing/loyalty', async (req, res) => res.json(await dbManager.getLoyaltyRanking()));
app.get('/api/marketing/ratings', async (req, res) => res.json(await dbManager.getRecentRatings()));

app.post('/api/marketing/raffle', async (req, res) => {
    const winner = await dbManager.getRandomWinner();
    res.json(winner || { error: 'Nenhum cliente elegível' });
});

app.get('/api/marketing/raffle/last', async (req, res) => {
    // Retorna o último ganhador, se tiver salvo em banco, senão null
    res.json(null); 
});

app.post('/api/marketing/broadcast', async (req, res) => {
    const { message, target } = req.body;
    // Lógica de envio em massa omitida no momento, pode ser implementada com WhatsApp
    res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
});

// Upload Dummy
app.post('/api/upload', (req, res) => {
    res.json({ success: true, url: '' });
});

// Tunelamento
async function startTunnel() {
    try {
        const tunnel = await localtunnel({ port: PORT, subdomain: 'barberflow-' + os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '') });
        console.log(`🌍 ACESSO REMOTO: ${tunnel.url}`);
        await dbManager.setSetting('public_url', tunnel.url);
    } catch (e) {}
}

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR ON: http://localhost:${PORT}`);
    startWhatsApp(io);
    startMarketingWorker();
    // startTunnel(); // Desativado para evitar conflitos de conexão
});
