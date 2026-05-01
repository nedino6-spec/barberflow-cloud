const fs = require('fs');
const { execSync } = require('child_process');

console.log('Finalizando processos do Chrome que possam estar travados...');
try {
  execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' });
} catch (e) {
  // Ignora se não houver chrome aberto
}

console.log('Limpando cache do WhatsApp...');
try {
  if (fs.existsSync('.wwebjs_auth')) fs.rmSync('.wwebjs_auth', { recursive: true, force: true });
  if (fs.existsSync('.wwebjs_cache')) fs.rmSync('.wwebjs_cache', { recursive: true, force: true });
} catch (e) {
  console.log('Erro ao apagar pastas:', e.message);
}

console.log('Iniciando o servidor...');
require('./server.js');
