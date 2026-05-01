const qrcode = require('qrcode-terminal');
const os = require('os');

// Função para pegar o IP local correto
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

const ip = getLocalIP();
const appUrl = `http://${ip}:5173`;
const apkUrl = `http://${ip}:3001/download-apk`;

console.log('\n======================================================');
console.log('📱 LINKS PARA O BARBERFLOW');
console.log('======================================================\n');

console.log(`🔗 1. ABRIR NO NAVEGADOR (PWA): ${appUrl}`);
console.log(`📥 2. BAIXAR INSTALADOR (APK): ${apkUrl}\n`);

console.log('------------------------------------------------------');
console.log('ESCANEE O QR CODE ABAIXO PARA ABRIR NO CELULAR:');
console.log('------------------------------------------------------\n');

qrcode.generate(appUrl, { small: true });

console.log('\n------------------------------------------------------');
console.log('DICA: Para instalar como App no iPhone ou Android:');
console.log('1. Abra o link do navegador acima.');
console.log('2. Clique em "Compartilhar" ou nos "3 pontinhos".');
console.log('3. Escolha "Adicionar à Tela Inicial".');
console.log('------------------------------------------------------\n');
