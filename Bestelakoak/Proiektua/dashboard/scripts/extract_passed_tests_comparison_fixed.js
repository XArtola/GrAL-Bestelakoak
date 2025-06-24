#!/usr/bin/env node

/**
 * Script para extraer y comparar tests con resultado "passed"
 * Lee datos directamente desde archivos JSON locales
 * Genera un archivo JSON con comparativas de eficiencia entre LLMs y baseline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Para obtener __dirname en ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de los datos locales
const DATA_PATHS = {
  EXECUTION_RESULTS: path.join(__dirname, '..', 'data', 'test_execution_results', 'executed_tests_results'),
  EFFICIENCY_METRICS: path.join(__dirname, '..', 'data', 'test_execution_results', 'test_eficcency_metrics')
};

class PassedTestsAnalyzer {
  constructor() {
    this.results = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalPassedTests: 0,
        llmsAnalyzed: [],
        description: 'Comparativa de tests con resultado PASSED vs baseline',
        dataSource: 'Local JSON files'
      },
      passedTestsComparison: []
    };
  }

  /**
   * Lee archivos JSON locales de resultados de ejecución y métricas
   */  async loadLocalData() {
    try {
      console.log('📂 Cargando datos desde archivos JSON locales...');
      console.log('🔍 Verificando rutas:');
      console.log('  - EXECUTION_RESULTS:', DATA_PATHS.EXECUTION_RESULTS);
      console.log('  - EFFICIENCY_METRICS:', DATA_PATHS.EFFICIENCY_METRICS);
      
      // Verificar construcción de paths
      const expectedExecution = 'C:\\Users\\xabia\\OneDrive\\Documentos\\4.Maila\\TFG-Bestelakoak\\Bestelakoak\\Proiektua\\dashboard\\data\\test_execution_results\\executed_tests_results';
      const expectedMetrics = 'C:\\Users\\xabia\\OneDrive\\Documentos\\4.Maila\\TFG-Bestelakoak\\Bestelakoak\\Proiektua\\dashboard\\data\\test_execution_results\\test_eficcency_metrics';
      
      console.log('🎯 Paths esperados:');
      console.log('  - Expected execution:', expectedExecution);
      console.log('  - Expected metrics:', expectedMetrics);
      console.log('  - Actual execution:', path.resolve(DATA_PATHS.EXECUTION_RESULTS));
      console.log('  - Actual metrics:', path.resolve(DATA_PATHS.EFFICIENCY_METRICS));
      
      // Verificar que las carpetas existen
      if (!fs.existsSync(DATA_PATHS.EXECUTION_RESULTS)) {
        throw new Error(`❌ No existe la carpeta: ${DATA_PATHS.EXECUTION_RESULTS}`);
      }
      if (!fs.existsSync(DATA_PATHS.EFFICIENCY_METRICS)) {
        throw new Error(`❌ No existe la carpeta: ${DATA_PATHS.EFFICIENCY_METRICS}`);
      }
      
      // Leer archivos de resultados de ejecución
      const executionFiles = fs.readdirSync(DATA_PATHS.EXECUTION_RESULTS)
        .filter(file => file.endsWith('.json'));
      console.log('📄 Archivos de ejecución encontrados:', executionFiles);
      
      // Leer archivos de métricas de eficiencia
      const metricsFiles = fs.readdirSync(DATA_PATHS.EFFICIENCY_METRICS)
        .filter(file => file.endsWith('.json'));
      console.log('📄 Archivos de métricas encontrados:', metricsFiles);
      
      const executionResults = {};
      const efficiencyMetrics = {};
      
      // Cargar resultados de ejecución
      for (const file of executionFiles) {
        console.log(`📖 Cargando archivo de ejecución: ${file}`);
        const llmName = file.replace('results_', '').replace('.json', '');
        const filePath = path.join(DATA_PATHS.EXECUTION_RESULTS, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        executionResults[llmName] = data;
        console.log(`✅ Cargado ${llmName}: ${data.results?.tests?.length || 0} tests`);
      }
      
      // Cargar métricas de eficiencia
      for (const file of metricsFiles) {
        console.log(`📊 Cargando archivo de métricas: ${file}`);
        const llmName = file.replace('test-efficiency-metrics_', '').replace('.json', '');
        const filePath = path.join(DATA_PATHS.EFFICIENCY_METRICS, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        efficiencyMetrics[llmName] = data;
        console.log(`✅ Cargado ${llmName}: ${Object.keys(data.testFiles || {}).length} archivos de test`);
      }
      
      console.log(`📊 Archivos de ejecución cargados: ${Object.keys(executionResults).length}`);
      console.log(`📈 Archivos de métricas cargados: ${Object.keys(efficiencyMetrics).length}`);
      console.log(`🤖 LLMs disponibles: ${Object.keys(executionResults).join(', ')}`);
      
      return { executionResults, efficiencyMetrics };
    } catch (error) {
      console.error('❌ Error cargando datos locales:', error);
      throw error;
    }  }

  /**
   * Normaliza el nombre de un test removiendo sufijos dinámicos
   */
  normalizeTestName(testName) {
    if (!testName) return '';
    
    return testName
      .replace(/\s*\(\d+\)$/, '')           // Remover (1), (2), etc.
      .replace(/\s*-\s*run\s*\d+$/i, '')   // Remover "- run 1", "- run 2", etc.
      .replace(/\s*#\d+$/, '')             // Remover #1, #2, etc.
      .replace(/\s*\[\d+\]$/, '')          // Remover [1], [2], etc.
      .trim();
  }

  /**
   * Crea una clave única para identificar tests base
   */
  createTestKey(fileName, testName) {
    const normalizedName = this.normalizeTestName(testName);
    return `${fileName}-${normalizedName}`;
  }

  /**
   * Obtiene todos los tests con resultado "passed" desde archivos locales
   */
  async getPassedTests(executionResults, efficiencyMetrics) {
    try {
      console.log('🔍 Iniciando búsqueda de tests passed...');
      
      // Encontrar el baseline (original)
      const baselineResults = executionResults['original'];
      const baselineMetrics = efficiencyMetrics['original'];
      
      console.log('🎯 Datos baseline encontrados:', {
        baselineResults: !!baselineResults,
        baselineMetrics: !!baselineMetrics,
        baselineTestsCount: baselineResults?.results?.tests?.length || 0
      });
        if (!baselineResults || !baselineMetrics) {
        throw new Error('No se encontraron datos baseline (original) para comparación');
      }
      
      // Agrupar tests baseline por nombre normalizado para detectar duplicados
      const baselineTestGroups = new Map();
      if (baselineResults.results?.tests) {
        baselineResults.results.tests.forEach(test => {
          if (!test.name) return;
          
          const fileName = test.filePath ? test.filePath.replace(/\\/g, '/').split('/').pop() : '';
          const testKey = this.createTestKey(fileName, test.name);
          
          if (!baselineTestGroups.has(testKey)) {
            baselineTestGroups.set(testKey, {
              normalizedName: this.normalizeTestName(test.name),
              fileName: fileName,
              filePath: test.filePath,
              instances: []
            });
          }
          
          baselineTestGroups.get(testKey).instances.push(test);
        });
      }
      
      console.log(`📊 Tests baseline agrupados: ${baselineTestGroups.size} grupos únicos`);
      console.log(`📊 Total tests baseline: ${baselineResults.results?.tests?.length || 0}`);
      
      const passedTests = [];
      const llmsSet = new Set();
      
      // Procesar cada LLM que no sea original
      for (const llmName of Object.keys(executionResults)) {
        if (llmName === 'original') continue;
        
        console.log(`🤖 Procesando LLM: ${llmName}`);
        
        const targetResults = executionResults[llmName];
        const targetMetrics = efficiencyMetrics[llmName];
        
        console.log(`  - Tests disponibles: ${targetResults.results?.tests?.length || 0}`);
        console.log(`  - Métricas encontradas: ${!!targetMetrics}`);
        
        if (!targetResults.results?.tests) {
          console.log(`⚠️ No test data for LLM: ${llmName}`);
          continue;
        }
          llmsSet.add(llmName);
        
        // Agrupar tests del target por nombre normalizado
        const targetTestGroups = new Map();
        let passedTestsInTarget = 0;
        
        targetResults.results.tests.forEach(test => {
          if (!test.name) return;
          
          if (test.status === 'passed') {
            passedTestsInTarget++;
          }
          
          const fileName = test.filePath ? test.filePath.replace(/\\/g, '/').split('/').pop() : '';
          const testKey = this.createTestKey(fileName, test.name);
          
          if (!targetTestGroups.has(testKey)) {
            targetTestGroups.set(testKey, {
              normalizedName: this.normalizeTestName(test.name),
              fileName: fileName,
              filePath: test.filePath,
              instances: []
            });
          }
          
          targetTestGroups.get(testKey).instances.push(test);
        });
        
        console.log(`  - Tests passed en ${llmName}: ${passedTestsInTarget}`);
        console.log(`  - Grupos de tests únicos: ${targetTestGroups.size}`);
        
        // Función helper para encontrar métricas de test
        const findTestMetrics = (testFiles, filename, testName) => {
          const fileMetrics = testFiles[filename];
          if (!fileMetrics) return null;
          
          if (fileMetrics.test_name === testName || 
              fileMetrics.test_name.includes(testName) || 
              testName.includes(fileMetrics.test_name)) {
            return {
              actionableCommands: fileMetrics.actionableCommands || 0,
              commands: fileMetrics.commands || {}
            };
          }
          return null;
        };
          // Obtener archivos de métricas
        const baselineTestFiles = baselineMetrics?.testFiles || {};
        const targetTestFiles = targetMetrics?.testFiles || {};
        
        // Comparar grupos de tests en lugar de instancias individuales
        let matchedGroups = 0;
        
        for (const [testKey, baselineGroup] of baselineTestGroups) {
          const targetGroup = targetTestGroups.get(testKey);
          
          if (targetGroup) {
            // Verificar si hay al menos una instancia que pasó en el target
            const passedTargetInstances = targetGroup.instances.filter(test => test.status === 'passed');
              if (passedTargetInstances.length > 0) {
              matchedGroups++;
              
              // Buscar métricas usando el nombre normalizado
              const baselineTestMetrics = findTestMetrics(baselineTestFiles, baselineGroup.fileName, baselineGroup.normalizedName);
              const targetTestMetrics = findTestMetrics(targetTestFiles, targetGroup.fileName, targetGroup.normalizedName);
                if (baselineGroup.instances.length > 1 || passedTargetInstances.length > 1) {
                console.log(`    🔄 Grupo duplicado: ${baselineGroup.normalizedName} (B:${baselineGroup.instances.length}, T:${passedTargetInstances.length})`);
                console.log(`       Creando ${passedTargetInstances.length} entradas separadas para cada instancia que pasó`);
              }
              
              // IMPORTANTE: Para tests dinámicos/duplicados, crear una entrada por cada instancia que pasó
              // Esto asegura que cada test duplicado que pase se cuente como separado
              for (let i = 0; i < passedTargetInstances.length; i++) {
                const targetInstance = passedTargetInstances[i];
                const baselineInstance = baselineGroup.instances[Math.min(i, baselineGroup.instances.length - 1)];
                
                // Crear un identificador único para esta instancia específica
                const instanceId = passedTargetInstances.length > 1 ? `_instance_${i + 1}` : '';
                
                passedTests.push({
                  llm: llmName,
                  llmDisplayName: this.getLLMDisplayName(llmName),
                  testName: baselineGroup.normalizedName,
                  testNameWithInstance: baselineGroup.normalizedName + instanceId,
                  fileName: baselineGroup.fileName,
                  filePath: baselineInstance.filePath,
                  isDuplicate: baselineGroup.instances.length > 1 || passedTargetInstances.length > 1,
                  instanceNumber: i + 1,
                  totalInstances: passedTargetInstances.length,
                  instanceCount: {
                    baseline: baselineGroup.instances.length,
                    target: passedTargetInstances.length,
                    passedInTarget: passedTargetInstances.length
                  },
                  target: {
                    executed: true,
                    status: 'passed',
                    passed: true,
                    duration: Math.round(targetInstance.duration || 0),
                    actionableCommands: targetTestMetrics?.actionableCommands || 0,
                    commands: targetTestMetrics?.commands || {},
                    originalTestName: targetInstance.name
                  },
                  baseline: {
                    executed: true,
                    status: baselineInstance.status,
                    passed: baselineInstance.status === 'passed',
                    duration: Math.round(baselineInstance.duration || 0),
                    actionableCommands: baselineTestMetrics?.actionableCommands || 0,
                    commands: baselineTestMetrics?.commands || {},
                    originalTestName: baselineInstance.name
                  },
                  comparison: {
                    statusMatch: baselineInstance.status === 'passed',
                    actionsDifference: (targetTestMetrics?.actionableCommands || 0) - (baselineTestMetrics?.actionableCommands || 0),
                    durationDifference: Math.round((targetInstance.duration || 0) - (baselineInstance.duration || 0))
                  }
                });
              }
            }
          }
        }
          console.log(`  - Grupos matched y passed en ${llmName}: ${matchedGroups}`);
      }
      
      this.results.metadata.llmsAnalyzed = Array.from(llmsSet);
      this.results.metadata.totalPassedTests = passedTests.length;
      
      // Estadísticas adicionales sobre duplicados
      const uniqueTestNames = new Set(passedTests.map(test => `${test.llm}-${test.testName}`));
      const duplicateInstances = passedTests.filter(test => test.isDuplicate).length;
      
      this.results.metadata.uniqueTestGroups = uniqueTestNames.size;
      this.results.metadata.duplicateInstances = duplicateInstances;
      this.results.metadata.duplicateHandling = 'Each passed duplicate test counted as separate instance';
      
      console.log(`📊 Encontrados ${passedTests.length} test instances con resultado PASSED`);
      console.log(`📊 Tests únicos (grupos): ${uniqueTestNames.size}`);
      console.log(`📊 Instancias duplicadas: ${duplicateInstances}`);
      console.log(`🤖 LLMs analizados: ${Array.from(llmsSet).join(', ')}`);
      
      return passedTests;
    } catch (error) {
      console.error('❌ Error obteniendo tests passed:', error);
      throw error;
    }
  }

  /**
   * Helper para obtener nombres de display de LLMs
   */
  getLLMDisplayName(llmKey) {
    const mapping = {
      'original': 'Original (Baseline)',
      'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
      'claude_3_7_sonnet': 'Claude 3.7 Sonnet', 
      'claude_3_7_sonnet_thinking': 'Claude 3.7 Sonnet Thinking',
      'claude_sonnet_4': 'Claude Sonnet 4',
      'gemini_2_0_flash': 'Gemini 2.0 Flash',
      'gemini_2_5_pro_preview': 'Gemini 2.5 Pro (Preview)',
      'gpt_4_1': 'GPT-4.1',
      'gpt_4o': 'GPT-4o',
      'o1_preview': 'o1 (Preview)',
      'o3_mini': 'o3-mini',
      'o4_mini_preview': 'o4-mini (Preview)'
    };
    
    return mapping[llmKey] || llmKey;
  }

  /**
   * Ejecuta el análisis completo
   */
  async analyze() {
    try {
      console.log('🚀 Iniciando análisis completo...');
      
      // Cargar datos locales
      const { executionResults, efficiencyMetrics } = await this.loadLocalData();

      // Obtener tests passed
      const passedTests = await this.getPassedTests(executionResults, efficiencyMetrics);
      
      if (passedTests.length === 0) {
        console.log('⚠️ No se encontraron tests con resultado PASSED');
        return;
      }

      console.log(`✅ Se encontraron ${passedTests.length} tests con resultado PASSED`);

      // Estructurar resultado final (simplificado por ahora)
      this.results.passedTestsComparison = passedTests;

      // Guardar resultados
      await this.saveResults();

      console.log('✅ Análisis completado exitosamente');
      this.printSummary();

    } catch (error) {
      console.error('❌ Error durante el análisis:', error);
      throw error;
    }
  }
  /**
   * Guarda los resultados en archivos
   */
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '..', 'results');
    
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Archivo JSON completo
    const jsonFile = path.join(outputDir, `passed_tests_comparison_${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(this.results, null, 2));
    console.log(`💾 Resultados JSON guardados en: ${jsonFile}`);
    
    // Archivo CSV
    const csvFile = path.join(outputDir, `passed_tests_comparison_${timestamp}.csv`);
    const csvContent = this.generateCSV();
    fs.writeFileSync(csvFile, csvContent);
    console.log(`📊 Resultados CSV guardados en: ${csvFile}`);
  }

  /**
   * Genera contenido CSV con información detallada sobre duplicados
   */
  generateCSV() {
    const headers = [
      'LLM',
      'LLM_Display_Name',
      'Test_Name',
      'Test_Name_With_Instance',
      'File_Name',
      'Is_Duplicate',
      'Instance_Number',
      'Total_Instances',
      'Baseline_Instances',
      'Target_Instances',
      'Passed_In_Target',
      'Target_Status',
      'Target_Duration_ms',
      'Target_Actionable_Commands',
      'Baseline_Status',
      'Baseline_Duration_ms',
      'Baseline_Actionable_Commands',
      'Status_Match',
      'Actions_Difference',
      'Duration_Difference_ms',
      'Target_Original_Test_Name',
      'Baseline_Original_Test_Name'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    this.results.passedTestsComparison.forEach(test => {
      const row = [
        this.escapeCsvValue(test.llm),
        this.escapeCsvValue(test.llmDisplayName),
        this.escapeCsvValue(test.testName),
        this.escapeCsvValue(test.testNameWithInstance),
        this.escapeCsvValue(test.fileName),
        test.isDuplicate,
        test.instanceNumber || 1,
        test.totalInstances || 1,
        test.instanceCount.baseline,
        test.instanceCount.target,
        test.instanceCount.passedInTarget,
        test.target.status,
        test.target.duration,
        test.target.actionableCommands,
        test.baseline.status,
        test.baseline.duration,
        test.baseline.actionableCommands,
        test.comparison.statusMatch,
        test.comparison.actionsDifference,
        test.comparison.durationDifference,
        this.escapeCsvValue(test.target.originalTestName),
        this.escapeCsvValue(test.baseline.originalTestName)
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  }

  /**
   * Escapa valores para CSV
   */
  escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  /**
   * Imprime resumen en consola
   */
  printSummary() {
    const tests = this.results.passedTestsComparison;
    
    console.log('\n📊 RESUMEN DE ANÁLISIS DE TESTS PASSED');
    console.log('================================================');
    console.log(`📝 Total test instances passed analizadas: ${tests.length}`);
    
    // Contar tests únicos (sin duplicados)
    const uniqueTests = new Set();
    const duplicateTests = new Set();
    let totalDuplicateInstances = 0;
    
    tests.forEach(test => {
      const testKey = `${test.llm}-${test.testName}`;
      if (test.isDuplicate) {
        duplicateTests.add(testKey);
        totalDuplicateInstances++;
      }
      uniqueTests.add(testKey);
    });
    
    console.log(`🔄 Tests únicos (nombres base): ${uniqueTests.size}`);
    console.log(`🔄 Tests con duplicados: ${duplicateTests.size}`);
    console.log(`🔄 Total instancias de duplicados: ${totalDuplicateInstances}`);
    
    // Contar por LLM
    const byLLM = {};
    const duplicatesByLLM = {};
    tests.forEach(test => {
      if (!byLLM[test.llm]) {
        byLLM[test.llm] = 0;
        duplicatesByLLM[test.llm] = 0;
      }
      byLLM[test.llm]++;
      if (test.isDuplicate) {
        duplicatesByLLM[test.llm]++;
      }
    });
    
    console.log('\n🤖 TESTS PASSED POR LLM:');
    Object.entries(byLLM).forEach(([llm, count]) => {
      const duplicateCount = duplicatesByLLM[llm];
      console.log(`   ${this.getLLMDisplayName(llm)}: ${count} instancias (${duplicateCount} duplicados)`);
    });
    
    // Estadísticas de duplicados
    if (totalDuplicateInstances > 0) {
      console.log('\n🔄 ESTADÍSTICAS DE DUPLICADOS:');
      const duplicateGroups = {};
      tests.filter(test => test.isDuplicate).forEach(test => {
        const key = `${test.testName}_${test.llm}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = {
            testName: test.testName,
            llm: test.llmDisplayName,
            instances: 0,
            totalInstances: test.totalInstances
          };
        }
        duplicateGroups[key].instances++;
      });
      
      Object.values(duplicateGroups).forEach(group => {
        console.log(`   "${group.testName}" en ${group.llm}: ${group.instances}/${group.totalInstances} instancias passed`);
      });
    }
  }
}

// Ejecutar el análisis si se ejecuta directamente
console.log('🎬 Script cargado - extract_passed_tests_comparison_fixed.js');
console.log('📍 Directorio actual:', process.cwd());
console.log('📁 Script ubicado en:', __dirname);
console.log('🔍 Args:', process.argv);
console.log('🔍 import.meta.url:', import.meta.url);

const analyzer = new PassedTestsAnalyzer();
analyzer.analyze().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

export default PassedTestsAnalyzer;
