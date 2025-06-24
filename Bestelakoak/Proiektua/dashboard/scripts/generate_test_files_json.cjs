const fs = require('fs');
const path = require('path');

// Configuración de rutas
const BASE_DIR = path.join(__dirname, '../data/test_execution_results/generated_tests');
const OUTPUT_FILE = path.join(__dirname, '../data/test_execution_results/all_test_files.json');

console.log('🔍 Buscando tests en:', BASE_DIR);

function isTestFile(filename) {
  return filename.endsWith('.spec.ts') || filename.endsWith('.spec.js');
}

function loadTestFiles() {
  const result = {};
  if (!fs.existsSync(BASE_DIR)) {
    console.error('❌ No existe la carpeta base:', BASE_DIR);
    return result;
  }
  const llmDirs = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📁 Encontradas ${llmDirs.length} carpetas de LLM:`);
  llmDirs.forEach(llm => console.log('  -', llm));

  llmDirs.forEach(llm => {
    const llmPath = path.join(BASE_DIR, llm);
    const files = fs.readdirSync(llmPath).filter(isTestFile);
    if (files.length === 0) {
      console.warn(`⚠️  No se encontraron tests en ${llm}`);
    }
    result[llm] = {};
    files.forEach(file => {
      const filePath = path.join(llmPath, file);
      const code = fs.readFileSync(filePath, 'utf8');
      result[llm][file] = code;
    });
    console.log(`  📄 ${llm}: ${files.length} archivos`);
  });
  return result;
}

function main() {
  console.log('🚀 Generando JSON de tests...');
  const data = loadTestFiles();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Archivo generado:', OUTPUT_FILE);
  const totalLLMs = Object.keys(data).length;
  const totalFiles = Object.values(data).reduce((acc, llmObj) => acc + Object.keys(llmObj).length, 0);
  console.log(`📊 Resumen: ${totalLLMs} LLMs, ${totalFiles} archivos de test.`);
}

main();
