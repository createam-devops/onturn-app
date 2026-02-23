/**
 * GENERATE VAPID KEYS
 * Script para generar claves VAPID para Web Push Notifications
 * 
 * Uso: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 Generando claves VAPID para Web Push...\n');

// Generar claves VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Claves generadas correctamente:\n');
console.log('📋 Copia estas claves a tu archivo .env.local:\n');
console.log('─'.repeat(80));
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('─'.repeat(80));
console.log('\n');

// Crear archivo .env.local si no existe
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', 'env.example.txt');

let envContent = '';

// Si existe .env.local, leerlo
if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  console.log('📄 Archivo .env.local existente encontrado\n');
  
  // Verificar si ya tiene claves VAPID
  if (envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || envContent.includes('VAPID_PRIVATE_KEY')) {
    console.log('⚠️  ADVERTENCIA: .env.local ya contiene claves VAPID');
    console.log('   Las claves existentes NO serán sobrescritas automáticamente.\n');
    console.log('   Si deseas usar las nuevas claves, cópialas manualmente.\n');
  } else {
    // Agregar claves VAPID al final
    envContent += `\n\n# VAPID Keys para Web Push Notifications\n`;
    envContent += `# Generadas el: ${new Date().toISOString()}\n`;
    envContent += `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
    envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
    
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ Claves VAPID agregadas a .env.local\n');
  }
} else {
  // Crear .env.local desde env.example.txt
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  } else {
    envContent = `# OnTurn - Variables de Entorno\n\n`;
    envContent += `# Supabase\n`;
    envContent += `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n`;
    envContent += `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n`;
  }
  
  // Agregar claves VAPID
  envContent += `\n# VAPID Keys para Web Push Notifications\n`;
  envContent += `# Generadas el: ${new Date().toISOString()}\n`;
  envContent += `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
  envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n\n`;
  
  // Agregar otras variables PWA útiles
  envContent += `# PWA Configuration\n`;
  envContent += `NEXT_PUBLIC_ENABLE_PWA=true\n`;
  envContent += `NEXT_PUBLIC_SITE_URL=http://localhost:3000\n`;
  
  fs.writeFileSync(envLocalPath, envContent);
  console.log('✅ Archivo .env.local creado con claves VAPID\n');
}

// Actualizar env.example.txt con formato correcto
if (fs.existsSync(envExamplePath)) {
  let exampleContent = fs.readFileSync(envExamplePath, 'utf8');
  
  if (!exampleContent.includes('VAPID_PRIVATE_KEY')) {
    exampleContent += `\n# VAPID Keys (para Web Push Notifications)\n`;
    exampleContent += `# Generar con: node scripts/generate-vapid-keys.js\n`;
    exampleContent += `NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key\n`;
    exampleContent += `VAPID_PRIVATE_KEY=your_vapid_private_key\n\n`;
    exampleContent += `# PWA Configuration\n`;
    exampleContent += `NEXT_PUBLIC_ENABLE_PWA=true\n`;
    exampleContent += `NEXT_PUBLIC_SITE_URL=http://localhost:3000\n`;
    
    fs.writeFileSync(envExamplePath, exampleContent);
    console.log('✅ env.example.txt actualizado\n');
  }
}

console.log('─'.repeat(80));
console.log('📌 Próximos pasos:\n');
console.log('1. Verifica que las claves estén en .env.local');
console.log('2. Actualiza NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('3. Actualiza NEXT_PUBLIC_SITE_URL con tu dominio de producción');
console.log('4. Reinicia el servidor de desarrollo (npm run dev)');
console.log('5. Las notificaciones push estarán listas! 🚀\n');
console.log('─'.repeat(80));

console.log('\n💡 Tip: NO subas .env.local a Git (ya está en .gitignore)\n');
