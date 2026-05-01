const { getClient } = require('./backend/whatsapp_advanced');

async function test() {
    const client = getClient();
    if (!client) {
        console.log('❌ Erro: WhatsApp não está conectado!');
        return;
    }
    
    const botJid = '5516999658909@s.whatsapp.net';
    console.log('📡 Enviando mensagem de teste para o próprio robô...');
    
    try {
        await client.sendMessage(botJid, 'Oi, teste do sistema!');
        console.log('✅ Mensagem enviada! Aguardando resposta nos logs do servidor...');
    } catch (e) {
        console.error('❌ Falha ao enviar:', e.message);
    }
}

// Pequeno delay para garantir que o socket está pronto
setTimeout(test, 5000);
