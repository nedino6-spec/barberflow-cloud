const dbManager = require('./database');
const { getClient } = require('./whatsapp_advanced');

async function runMarketingRoutine() {
    console.log('[Marketing] Iniciando rotina de recuperação de clientes...');
    
    try {
        const botEnabled = await dbManager.getSetting('bot_enabled');
        if (botEnabled !== 'true') {
            console.log('[Marketing] Robô desativado, pulando rotina.');
            return;
        }

        const retentionDays = parseInt(await dbManager.getSetting('retention_days')) || 20;
        const clients = await dbManager.getRetentionClients(retentionDays);
        const retentionMsg = await dbManager.getSetting('retention_msg') || 
            'Olá {nome}! Notamos que você não nos visita há um tempo. Que tal agendar um horário para renovar o visual? Esperamos por você! 💈';

        const client = getClient();
        if (!client) {
            console.log('[Marketing] WhatsApp não conectado, adiando rotina.');
            return;
        }

        let sentCount = 0;
        for (const c of clients) {
            // Verificar se já enviamos lembrete recentemente (evitar spam)
            const lastSent = c.last_reminder_sent ? new Date(c.last_reminder_sent) : null;
            const now = new Date();
            const daysSinceLastReminder = lastSent ? (now - lastSent) / (1000 * 60 * 60 * 24) : 999;

            if (daysSinceLastReminder > 15) {
                const personalizedMsg = retentionMsg.replace('{nome}', c.name.split(' ')[0]);
                
                try {
                    await client.sendMessage(`${c.phone}@s.whatsapp.net`, { text: personalizedMsg });
                    await dbManager.updateLastReminderDate(c.phone);
                    sentCount++;
                    console.log(`[Marketing] Lembrete enviado para ${c.name} (${c.phone})`);
                    
                    // Pequeno delay para evitar bloqueio do WhatsApp
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (err) {
                    console.error(`[Marketing] Erro ao enviar para ${c.phone}:`, err.message);
                }
            }
        }
        
        console.log(`[Marketing] Rotina concluída. ${sentCount} lembretes enviados.`);
    } catch (error) {
        console.error('[Marketing] Erro na rotina:', error);
    }
}

// Inicia a rotina a cada 24 horas
function startMarketingWorker() {
    // Executa 10 segundos após o boot para dar tempo do WhatsApp conectar
    setTimeout(runMarketingRoutine, 10000);
    
    // Agenda para rodar a cada 24 horas
    setInterval(runMarketingRoutine, 24 * 60 * 60 * 1000);
}

module.exports = { startMarketingWorker };
