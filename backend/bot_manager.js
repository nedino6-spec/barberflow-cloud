const dbManager = require('./database');

/**
 * BarberFlow BOT ULTIMATE ELITE 🚀
 * A versão definitiva para atendimento automático.
 */

async function handleBotLogic(sock, phone, message, pushName, remoteJid) {
    const text = extractText(message);
    const msgLower = text?.toLowerCase().trim() || "";
    
    try {
        const botEnabled = await dbManager.getSetting('bot_enabled');
        if (botEnabled === 'false') return;

        const registeredClient = await dbManager.getClientByPhone(phone);
        const clientState = await dbManager.getClientState(phone);
        const currentName = registeredClient ? registeredClient.name : pushName;

        // --- COMANDOS DE ADMINISTRADOR (EXCLUSIVO PARA O DONO) ---
        // Se você quiser que apenas o SEU número controle o bot, adicione o número aqui
        if (msgLower.startsWith('#')) {
            await handleAdminCommands(sock, phone, msgLower, remoteJid);
            return;
        }

        // --- FUNÇÕES AUXILIARES ---
        const sendMessage = async (textToSend) => {
            await sock.sendPresenceUpdate('composing', remoteJid);
            const delay = Math.min(Math.max(textToSend.length * 25, 800), 2000);
            await new Promise(resolve => setTimeout(resolve, delay));
            await sock.sendMessage(remoteJid, { text: textToSend });
        };

        const sendMainMenu = async (firstName) => {
            await dbManager.setClientState(phone, 'MAIN_MENU');
            const menu = `Olá, *${firstName}*! 💈 Bem-vindo à nossa experiência Elite.\n\nComo posso cuidar do seu visual hoje? Responda com o *NÚMERO*:\n\n1️⃣ *Entrar na Fila Agora* ⏳\n2️⃣ *Agendar Horário Futuro* 📅\n3️⃣ *Ver Catálogo / Preços* ✂️\n4️⃣ *Minha Posição na Fila* 🔍\n5️⃣ *Consultar Meu Saldo* 💳\n6️⃣ *Clube de Fidelidade* 🎁\n\n0️⃣ *Sair*`;
            await sendMessage(menu);
        };

        // --- TRATAMENTO DE IMAGENS ---
        if (message.imageMessage) {
            await sendMessage(`Recebi sua imagem/comprovante, *${currentName}*! 📸\n\nO barbeiro já foi notificado e fará a validação em breve. Obrigado!`);
            return;
        }

        // --- COMANDOS DE ENCERRAMENTO ---
        if (['0', 'sair', 'cancelar', 'tchau', 'obrigado', 'vlw', 'valeu', 'obg'].includes(msgLower)) {
            await dbManager.clearClientState(phone);
            if (['0', 'sair', 'cancelar'].includes(msgLower)) {
                await sendMessage('✅ *Atendimento finalizado.* Foi um prazer! Quando precisar, estamos à disposição. ✂️');
            } else {
                await sendMessage('De nada! 👍 Estamos aqui para o que precisar.');
            }
            return;
        }

        // --- FASE 1: REGISTRO ---
        if (!registeredClient) {
            if (!clientState || clientState.state !== 'REGISTERING') {
                await dbManager.setClientState(phone, 'REGISTERING');
                const customGreeting = await dbManager.getSetting('greeting_msg');
                const finalGreeting = (customGreeting && customGreeting.trim() !== '') ? customGreeting : 'Olá! 💈 Seja muito bem-vindo à nossa Barbearia.';
                
                // Inteligência: Tentar usar o pushName se for um nome válido (não apenas "Cliente")
                if (pushName && pushName !== 'Cliente' && pushName.length > 2) {
                    await dbManager.createClient(phone, pushName);
                    await sendMainMenu(pushName);
                    return;
                }

                await sendMessage(`${finalGreeting}\n\nPara agilizar seu atendimento, *qual o seu primeiro nome?*`);
            } else {
                const detectedName = text.trim().split(' ')[0];
                if (detectedName.length < 2) {
                    // Evitar repetir a mensagem se for apenas um caractere ou emoji
                    if (text.length > 0) {
                        await sendMessage('⚠️ Por favor, diga apenas o seu *primeiro nome* (mínimo 2 letras).');
                    }
                    return;
                }
                await dbManager.createClient(phone, detectedName);
                await sendMainMenu(detectedName);
            }
            return;
        }

        // --- FASE 2: LÓGICA DE ESTADOS ---
        const state = clientState?.state || 'MAIN_MENU';
        const tempData = clientState?.temp_data ? JSON.parse(clientState.temp_data) : {};

        if (state === 'MAIN_MENU') {
            // Inteligência de Intenção
            if (msgLower === '1' || msgLower.includes('fila') || msgLower.includes('agora')) {
                // Checar se a barbearia está aberta (Exemplo simples: 8h às 20h)
                const hour = new Date().getHours();
                if (hour < 8 || hour >= 20) {
                    await sendMessage('😴 *Ops! Já fechamos a fila por hoje.*\n\nMas você ainda pode *Agendar um horário (Opção 2)* para amanhã! 👍');
                    return;
                }

                const services = await dbManager.getServices();
                await dbManager.setClientState(phone, 'CHOOSE_SERVICE_QUEUE');
                let list = '💈 *Entrar na Fila para Hoje*\nQual serviço você quer fazer? *Responda com o NÚMERO:*\n\n';
                services.forEach((s, i) => list += `${i + 1}️⃣ *${s.name}* (R$ ${s.price.toFixed(2)})\n`);
                list += '\n0️⃣ Voltar';
                await sendMessage(list);
            } 
            else if (msgLower === '2' || msgLower.includes('agendar') || msgLower.includes('amanhã')) {
                const services = await dbManager.getServices();
                await dbManager.setClientState(phone, 'CHOOSE_SERVICE_SCHEDULE');
                let list = '🗓️ *Agendar Horário*\nQual serviço você quer agendar? *Responda com o NÚMERO:*\n\n';
                services.forEach((s, i) => list += `${i + 1}️⃣ *${s.name}*\n`);
                list += '\n0️⃣ Voltar';
                await sendMessage(list);
            } 
            else if (msgLower === '3' || msgLower.includes('preço') || msgLower.includes('valor')) {
                const services = await dbManager.getServices();
                let m = '✂️ *NOSSO CATÁLOGO* ✂️\n\n';
                services.forEach(s => m += `• *${s.name}*: R$ ${s.price.toFixed(2)}\n_${s.description || ''}_\n\n`);
                m += 'Digite *0* para voltar ao menu.';
                await sendMessage(m);
            } 
            else if (msgLower === '4' || msgLower.includes('posicao')) {
                const pos = await dbManager.getQueuePosition(phone);
                if (pos > 0) {
                    const waitTime = (pos - 1) * 30; // Média de 30 min por pessoa
                    await sendMessage(`Sua posição na fila: *${pos}º lugar*. ⏳\n\n*Tempo estimado:* ~${waitTime} minutos.\nTe avisaremos quando sua vez estiver chegando!`);
                } else {
                    await sendMessage('Você não está na fila. Digite *1* para entrar agora!');
                }
            } 
            else if (msgLower === '5' || msgLower.includes('saldo') || msgLower.includes('devo')) {
                const clientData = await dbManager.getClientByPhone(phone);
                const pixKey = await dbManager.getSetting('pix_key');
                if (clientData && clientData.debt > 0) {
                    let m = `💳 *Saldo Devedor*\n\nValor em aberto: *R$ ${clientData.debt.toFixed(2)}*\n\nChave PIX para pagamento:\n*${pixKey || 'Chave não cadastrada'}*\n\n_(Envie o comprovante para baixarmos sua dívida!)_`;
                    await sendMessage(m);
                } else {
                    await sendMessage(`🎉 Parabéns, *${currentName}*! Você está com as contas em dia.`);
                }
            } 
            else if (msgLower === '6' || msgLower.includes('pontos')) {
                const clientData = await dbManager.getClientByPhone(phone);
                const threshold = await dbManager.getSetting('loyalty_threshold') || 10;
                const points = clientData.points || 0;
                let m = `🎁 *Fidelidade BarberFlow*\n\nVocê tem: *${points} pontos*.\n`;
                if (points >= threshold) {
                    m += `\n🔥 *VOCÊ JÁ PODE RESGATAR SEU PRÊMIO!* 🔥\nAveise o barbeiro no seu próximo corte.`;
                } else {
                    m += `Faltam apenas *${threshold - points}* cortes para você ganhar seu brinde! ✂️`;
                }
                await sendMessage(m);
            } 
            else if (['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite'].includes(msgLower)) {
                await sendMainMenu(currentName);
            }
        } 
        
        // --- FILA ---
        else if (state === 'CHOOSE_SERVICE_QUEUE') {
            if (msgLower === '0') { await sendMainMenu(currentName); return; }
            const services = await dbManager.getServices();
            const idx = parseInt(msgLower) - 1;
            const sel = services[idx];
            if (sel) {
                await dbManager.addToQueue(phone, currentName, sel.name);
                // Calcular posição
                const pos = await dbManager.getQueuePosition(phone);
                await sendMessage(`✅ *Confirmado, ${currentName}!*\n\nVocê está na fila para: *${sel.name}*.\nSua posição: *${pos}º lugar*.\n\nFique de olho no WhatsApp, avisaremos você! 🚀`);
                await dbManager.clearClientState(phone);
            } else {
                await sendMessage('⚠️ Opção inválida. Digite o número ou *0* para voltar.');
            }
        }

        // --- AGENDAMENTO ---
        else if (state === 'CHOOSE_SERVICE_SCHEDULE') {
            if (msgLower === '0') { await sendMainMenu(currentName); return; }
            const services = await dbManager.getServices();
            const idx = parseInt(msgLower) - 1;
            const sel = services[idx];
            if (sel) {
                await dbManager.setClientState(phone, 'CHOOSE_DATE_SCHEDULE', { service: sel.name });
                await sendMessage(`Ótima escolha (*${sel.name}*).\n\nPara qual *dia* você deseja agendar? 📅\n_(Ex: Amanhã, Sábado, 15/05)_`);
            } else {
                await sendMessage('⚠️ Opção inválida.');
            }
        }
        else if (state === 'CHOOSE_DATE_SCHEDULE') {
            if (msgLower === '0') { await sendMainMenu(currentName); return; }
            const service = tempData.service;
            await dbManager.setClientState(phone, 'CHOOSE_TIME_SCHEDULE', { service, date: text });
            await sendMessage(`Perfeito, dia *${text}*.\n\nQual o melhor *horário*? 🕒\n_(Ex: 10h, 14:30, 18h)_`);
        }
        else if (state === 'CHOOSE_TIME_SCHEDULE') {
            if (msgLower === '0') { await sendMainMenu(currentName); return; }
            const { service, date } = tempData;
            const fullTime = `${date} às ${text}`;
            
            await dbManager.createAppointment(phone, currentName, service, fullTime);
            await sendMessage(`✅ *AGENDAMENTO SOLICITADO!*\n\n📍 Serviço: *${service}*\n📅 Data/Hora: *${fullTime}*\n\nTe confirmaremos em breve! 👍`);
            await dbManager.clearClientState(phone);
        }

    } catch (e) {
        console.error('[Ultimate Bot Error]', e);
    }
}

async function handleAdminCommands(sock, phone, cmd, remoteJid) {
    // Aqui você pode colocar uma trava para apenas o SEU número ser admin
    // if (phone !== 'SEU_NUMERO') return;

    if (cmd === '#proximo') {
        const queue = await dbManager.getQueue(true);
        const next = queue.find(q => q.status === 'waiting');
        if (next) {
            await dbManager.updateQueueStatus(next.id, 'serving');
            await sock.sendMessage(`${next.phone}@s.whatsapp.net`, { text: `🚨 *SUA VEZ CHEGOU, ${next.name.toUpperCase()}!* 🚨\n\nO barbeiro está te esperando. Pode vir! ✂️` });
            await sock.sendMessage(remoteJid, { text: `✅ Próximo chamado: *${next.name}*` });
        } else {
            await sock.sendMessage(remoteJid, { text: '❌ Não há ninguém na fila de espera.' });
        }
    }
    else if (cmd === '#status') {
        const queue = await dbManager.getQueue(true);
        const waiting = queue.filter(q => q.status === 'waiting').length;
        await sock.sendMessage(remoteJid, { text: `📊 *Status da Fila*\n\nEsperando: *${waiting} pessoas*\n\nDigite #proximo para chamar o próximo.` });
    }
}

function extractText(msg) {
    return msg.conversation || 
           msg.extendedTextMessage?.text || 
           msg.buttonsResponseMessage?.selectedButtonId || 
           msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
           msg.templateButtonReplyMessage?.selectedId ||
           "";
}

module.exports = { handleBotLogic };
