/**
 * obfuscate.js — Corre ANTES del build final
 * 
 * Uso:
 *   node obfuscate.js
 * 
 * Lo que hace:
 *   1. Obfusca electron/main.js → electron/main.js (sobrescribe)
 *   2. Calcula el hash SHA-256 del archivo obfuscado
 *   3. Inyecta ese hash en SELF_HASH_EXPECTED dentro del mismo archivo
 * 
 * Instalación de dependencia:
 *   npm install --save-dev javascript-obfuscator
 */

const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const JavaScriptObfuscator = require('javascript-obfuscator');

const MAIN_PATH = path.join(__dirname, 'electron', 'main.js');

console.log('🔒 Obfuscando main.js...');

// 1. Leer el original
let source = fs.readFileSync(MAIN_PATH, 'utf8');

// Asegurarse que SELF_HASH_EXPECTED esté vacío antes de obfuscar
// (si ya tiene un valor de una corrida anterior, lo limpiamos)
source = source.replace(
  /const SELF_HASH_EXPECTED = '[^']*';/,
  "const SELF_HASH_EXPECTED = '';"
);

// 2. Obfuscar
const result = JavaScriptObfuscator.obfuscate(source, {
  compact:                        true,
  controlFlowFlattening:          true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection:              true,
  deadCodeInjectionThreshold:     0.4,
  debugProtection:                true,   // Bloquea el debugger
  debugProtectionInterval:        2000,   // Cada 2s reintenta bloquear
  disableConsoleOutput:           true,   // Elimina console.log en prod
  identifierNamesGenerator:       'hexadecimal',
  rotateStringArray:              true,
  selfDefending:                  true,   // El código se defiende de reformateado
  shuffleStringArray:             true,
  splitStrings:                   true,
  splitStringsChunkLength:        8,
  stringArray:                    true,
  stringArrayCallsTransform:      true,
  stringArrayEncoding:            ['base64'],
  stringArrayThreshold:           0.85,
  transformObjectKeys:            true,
  unicodeEscapeSequence:          false,
  target:                         'node', // Importante: target node, no browser
});

const obfuscated = result.getObfuscatedCode();

// 3. Guardar temporalmente para calcular el hash
fs.writeFileSync(MAIN_PATH, obfuscated, 'utf8');

// 4. Calcular hash del archivo obfuscado
const hash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(MAIN_PATH))
  .digest('hex');

console.log(`✅ Hash generado: ${hash}`);

// 5. Inyectar el hash en el archivo
// (el obfuscador habrá convertido la string vacía en algo como _0x1234('')
// así que buscamos el patrón de la constante y lo reemplazamos)
// NOTA: Por eso dejamos SELF_HASH_EXPECTED como string vacía ANTES de obfuscar,
// y después del hash injection el archivo final ya tiene el hash real.
// Como el hash se calcula SOBRE el archivo obfuscado SIN hash, y luego
// se inyecta, la verificación en runtime lee el archivo ya con el hash
// inyectado — que es distinto. Por eso usamos un enfoque diferente:
// guardamos el hash en un archivo separado firmado.

const HASH_FILE = path.join(__dirname, 'electron', '.integrity');
const hashRecord = {
  hash,
  ts:  Date.now(),
  sig: crypto.createHmac('sha256', 'MiNegocio_T$#2024_x9kLpQr').update(hash).digest('hex'),
};
fs.writeFileSync(HASH_FILE, Buffer.from(JSON.stringify(hashRecord)).toString('base64'), 'utf8');

console.log('✅ Archivo de integridad generado: electron/.integrity');
console.log('');
console.log('📦 Ahora podés correr el build:');
console.log('   npm run build:win');
console.log('   npm run build:linux');
