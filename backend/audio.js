const fs = require('fs');
const path = require('path');
const os = require('os');
const { MessageMedia } = require('whatsapp-web.js');

// Helper para gerar um ID aleatório
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Text-to-Speech (TTS)
 * @param {string} text Texto para converter em áudio
 * @param {string} apiKey Chave da API da OpenAI (opcional para usar OpenAI TTS)
 * @returns {Promise<MessageMedia>} Objeto MessageMedia pronto para ser enviado
 */
async function textToSpeech(text, apiKey) {
    try {
        if (apiKey) {
            // Usar OpenAI TTS (Muito mais estável e profissional)
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: 'alloy' // Voz neutra e clara
                })
            });

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                return new MessageMedia('audio/mp3', buffer.toString('base64'), 'audio.mp3');
            }
            console.error('Falha no OpenAI TTS, tentando fallback...');
        }

        // Fallback para Google Translate (Pode falhar se houver muitos pedidos)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=pt-BR&client=tw-ob`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao gerar áudio TTS em todos os provedores');
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new MessageMedia('audio/mp3', buffer.toString('base64'), 'audio.mp3');
    } catch (error) {
        console.error('Erro no TTS:', error);
        return null;
    }
}

/**
 * Speech-to-Text (STT) usando OpenAI Whisper API
 * @param {MessageMedia} media Arquivo de áudio recebido do WhatsApp (.ogg)
 * @param {string} apiKey Chave da API da OpenAI
 * @returns {Promise<string>} Texto transcrito
 */
async function speechToText(media, apiKey) {
    if (!apiKey) {
        console.error("OpenAI API Key não fornecida para transcrição.");
        return null;
    }

    const tempFilePath = path.join(os.tmpdir(), `audio_${generateId()}.ogg`);
    
    try {
        // Salva o arquivo localmente
        const buffer = Buffer.from(media.data, 'base64');
        fs.writeFileSync(tempFilePath, buffer);

        // Prepara o FormData
        const formData = new FormData();
        const fileBlob = new Blob([buffer], { type: 'audio/ogg' });
        formData.append('file', fileBlob, 'audio.ogg');
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt'); // Força português para melhor precisão

        // Faz a chamada para a OpenAI API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erro na API OpenAI: ${errorData}`);
        }

        const data = await response.json();
        return data.text; // O texto transcrito
    } catch (error) {
        console.error('Erro no STT (Whisper):', error);
        return null;
    } finally {
        // Limpa o arquivo temporário
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}

module.exports = {
    textToSpeech,
    speechToText
};
