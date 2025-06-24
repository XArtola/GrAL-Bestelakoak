const fs = require('fs');
const path = require('path');

// Ruta base donde están las carpetas de cada LLM con los tests
const BASE_DIR = path.join(__dirname, '../data/processed_prompt_results/llm_tests');
const OUTPUT_FILE = path.join(__dirname, '../data/processed_prompt_results/all_test_files.json');

function isTestFile(filename) {
  return filename.endsWith('.spec.ts') || filename.endsWith('.spec.js');
}

function loadTestFiles() {
  const result = {};
  if (!fs.existsSync(BASE_DIR)) {
    console.error('No existe la carpeta base:', BASE_DIR);
    return result;
  }
  const llmDirs = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  llmDirs.forEach(llm => {
    const llmPath = path.join(BASE_DIR, llm);
    const files = fs.readdirSync(llmPath).filter(isTestFile);
    result[llm] = {};
    files.forEach(file => {
      const filePath = path.join(llmPath, file);
      const code = fs.readFileSync(filePath, 'utf8');
      result[llm][file] = code;
    });
  });
  return result;
}

function main() {
  const data = loadTestFiles();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('Archivo generado:', OUTPUT_FILE);
}

main();
