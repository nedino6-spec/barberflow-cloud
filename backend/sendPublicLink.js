const localtunnel = require('localtunnel');
const axios = require('axios');

(async () => {
  console.log('🌍 Iniciando Conexão Global (Túnel Seguro)...');
  
  try {
    // Tenta usar um subdomínio fixo para o link não mudar sempre
    const tunnel = await localtunnel({ 
        port: 3001,
        subdomain: 'barberflow-premium-' + Math.floor(Math.random() * 1000) 
    });

    console.log('\n✅ LINK PÚBLICO GERADO:', tunnel.url);
    console.log('-------------------------------------------');
    console.log('Use este link para acessar de qualquer lugar do mundo (4G, 5G, Wi-Fi da rua)');
    console.log('-------------------------------------------\n');
    
    console.log('Enviando link para o seu WhatsApp...');
    const installMsg = `🚀 *BarberFlow Ativo!*\n\nClique no link abaixo para abrir o seu painel:\n${tunnel.url}\n\n💡 *DICA:* Para baixar o atalho e usar como um Aplicativo:\n1. Abra o link no Chrome\n2. Clique nos 3 pontinhos\n3. Escolha "Instalar Aplicativo" ou "Adicionar à Tela de Início"`;
    
    await axios.post('http://localhost:3001/api/marketing/send-link', {
      link: installMsg
    });
    console.log('✅ Link enviado com sucesso! Verifique seu celular.');

    tunnel.on('close', () => {
      console.log('❌ Conexão Global fechada. Gere um novo link se precisar.');
    });

  } catch (e) {
    console.log('❌ Erro ao gerar link público. Tente novamente em 1 minuto.');
    console.error('Detalhe do erro:', e.message);
  }
})();
