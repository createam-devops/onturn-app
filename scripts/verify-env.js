/**
 * VERIFY ENVIRONMENT CONFIGURATION
 * Verifica que todas las variables de entorno estén configuradas correctamente
 * 
 * Uso: npm run verify-env
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verificando configuración de variables de entorno...\n');

const envLocalPath = path.join(__dirname, '..', '.env.local');

// Verificar si existe .env.local
if (!fs.existsSync(envLocalPath)) {
  console.error('❌ ERROR: .env.local no existe');
  console.log('\n📝 Crea el archivo con:');
  console.log('   cp env.example.txt .env.local');
  console.log('   npm run generate-vapid\n');
  process.exit(1);
}

console.log('✅ .env.local existe\n');

// Leer .env.local
const envContent = fs.readFileSync(envLocalPath, 'utf8');

// Variables requeridas
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    public: true,
    description: 'URL de Supabase'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    public: true,
    description: 'Anon key de Supabase'
  },
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY': {
    required: true,
    public: true,
    description: 'VAPID Public Key (Web Push)'
  },
  'VAPID_PRIVATE_KEY': {
    required: true,
    public: false,
    description: 'VAPID Private Key (Web Push - SECRETO)'
  },
  'NEXT_PUBLIC_ENABLE_PWA': {
    required: false,
    public: true,
    description: 'Habilitar PWA'
  },
  'NEXT_PUBLIC_SITE_URL': {
    required: true,
    public: true,
    description: 'URL del sitio'
  }
};

let allValid = true;
let warnings = [];
let errors = [];

// Verificar cada variable
console.log('📋 Variables de Entorno:\n');
console.log('─'.repeat(80));

Object.entries(requiredVars).forEach(([varName, config]) => {
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  const exists = match !== null;
  const value = exists ? match[1].trim() : '';
  const hasValue = value && value !== '' && !value.includes('your_') && !value.includes('example');
  
  let status = '❌';
  let message = '';
  
  if (exists && hasValue) {
    status = '✅';
    
    // Validaciones específicas
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL' && !value.includes('supabase.co')) {
      status = '⚠️ ';
      warnings.push(`${varName}: URL no parece válida`);
      message = ' (verificar URL)';
    }
    
    if (varName === 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' && value.length < 80) {
      status = '⚠️ ';
      warnings.push(`${varName}: Clave parece muy corta`);
      message = ' (verificar clave)';
    }
    
    if (varName === 'VAPID_PRIVATE_KEY' && value.length < 30) {
      status = '⚠️ ';
      warnings.push(`${varName}: Clave parece muy corta`);
      message = ' (verificar clave)';
    }
    
    if (varName === 'NEXT_PUBLIC_SITE_URL') {
      if (value === 'http://localhost:3000') {
        message = ' (desarrollo)';
      } else if (value.startsWith('https://')) {
        message = ' (producción)';
      } else {
        status = '⚠️ ';
        warnings.push(`${varName}: Debe usar http:// o https://`);
        message = ' (verificar URL)';
      }
    }
    
  } else if (exists && !hasValue) {
    status = '⚠️ ';
    if (config.required) {
      errors.push(`${varName}: Configurar valor (actualmente tiene placeholder)`);
      allValid = false;
    } else {
      warnings.push(`${varName}: Sin valor configurado`);
    }
    message = ' (sin valor)';
  } else {
    status = '❌';
    if (config.required) {
      errors.push(`${varName}: Variable no encontrada en .env.local`);
      allValid = false;
    } else {
      warnings.push(`${varName}: Variable opcional no configurada`);
    }
    message = ' (faltante)';
  }
  
  const visibility = config.public ? 'Pública' : 'Privada';
  const shortValue = hasValue 
    ? (config.public ? value.substring(0, 40) + '...' : '***' + value.substring(value.length - 8))
    : 'N/A';
  
  console.log(`${status} ${varName.padEnd(35)} [${visibility}] ${message}`);
  if (hasValue && process.env.VERBOSE) {
    console.log(`   └─ ${shortValue}`);
  }
});

console.log('─'.repeat(80));

// Resumen
console.log('\n📊 Resumen:\n');

if (errors.length > 0) {
  console.log('❌ Errores Críticos:');
  errors.forEach(error => console.log(`   • ${error}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  Advertencias:');
  warnings.forEach(warning => console.log(`   • ${warning}`));
  console.log('');
}

if (allValid && errors.length === 0) {
  console.log('✅ Todas las variables requeridas están configuradas correctamente\n');
  
  if (warnings.length === 0) {
    console.log('🎉 ¡Configuración perfecta! Tu aplicación está lista.\n');
  } else {
    console.log('💡 Hay algunas advertencias pero la app debería funcionar.\n');
  }
  
  console.log('─'.repeat(80));
  console.log('📌 Próximos pasos:');
  console.log('   1. Iniciar servidor: npm run dev');
  console.log('   2. Verificar notificaciones push');
  console.log('   3. Instalar PWA desde el navegador');
  console.log('─'.repeat(80));
  
  process.exit(0);
} else {
  console.log('❌ Hay errores en la configuración que deben corregirse.\n');
  console.log('─'.repeat(80));
  console.log('📌 Acciones recomendadas:');
  console.log('   1. Corregir errores listados arriba');
  console.log('   2. Para VAPID keys: npm run generate-vapid');
  console.log('   3. Para Supabase: npm run copy-credentials');
  console.log('   4. Volver a ejecutar: npm run verify-env');
  console.log('─'.repeat(80));
  console.log('');
  
  process.exit(1);
}
