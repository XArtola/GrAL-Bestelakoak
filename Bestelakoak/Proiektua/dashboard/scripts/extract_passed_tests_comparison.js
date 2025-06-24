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
      passedTestsComparison: []    };
  }

  /**
   * Lee archivos JSON locales de resultados de ejecución y métricas
   */
  async loadLocalData() {
    try {
      console.log('📂 Cargando datos desde archivos JSON locales...');
      console.log('🔍 Verificando rutas:');
      console.log('  - EXECUTION_RESULTS:', DATA_PATHS.EXECUTION_RESULTS);
      console.log('  - EFFICIENCY_METRICS:', DATA_PATHS.EFFICIENCY_METRICS);
      
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
        efficiencyMetrics[llmName] = data;        console.log(`✅ Cargado ${llmName}: ${Object.keys(data.testFiles || {}).length} archivos de test`);
      }
      
      console.log(`📊 Archivos de ejecución cargados: ${Object.keys(executionResults).length}`);
      console.log(`📈 Archivos de métricas cargados: ${Object.keys(efficiencyMetrics).length}`);
      console.log(`🤖 LLMs disponibles: ${Object.keys(executionResults).join(', ')}`);
      
      return { executionResults, efficiencyMetrics };
    } catch (error) {
      console.error('❌ Error cargando datos locales:', error);
      throw error;
    }
  }
  /**
   * Obtiene todos los tests con resultado "passed" desde archivos locales
   * Usa la misma lógica que el dashboard para generar test details
   */
  async getPassedTests(executionResults, efficiencyMetrics) {
    try {
      console.log('🔍 Iniciando búsqueda de tests passed...');
      // Encontrar el baseline (original)
      const baselineResults = executionResults['original'];
      const baselineMetrics = efficiencyMetrics['original'];
      
      console.log('🎯 Datos baseline encontrados:', {
        baselineResults: !!baselineResults,
        baselineMetrics: !!baselineMetrics,        baselineTestsCount: baselineResults?.results?.tests?.length || 0
      });
      
      if (!baselineResults || !baselineMetrics) {
        throw new Error('No se encontraron datos baseline (original) para comparación');
      }
      
      const passedTests = [];
      const llmsSet = new Set();
      
      // Convertir a formato compatible con el código existente
      const allResults = Object.keys(executionResults).map(llmName => ({
        llm: llmName,
        results: executionResults[llmName]
      }));
      
      const allMetrics = Object.keys(efficiencyMetrics).map(llmName => ({
        llm: llmName,        ...efficiencyMetrics[llmName]
      }));
      
      // Procesar cada LLM que no sea original
      for (const targetResults of allResults.filter(r => r.llm !== 'original')) {
        const llmName = targetResults.llm;
        llmsSet.add(llmName);
        
        console.log(`🤖 Procesando LLM: ${llmName}`);
        console.log(`  - Tests disponibles: ${targetResults.results?.tests?.length || 0}`);
        
        const targetMetrics = allMetrics.find(m => m.llm === llmName);        console.log(`  - Métricas encontradas: ${!!targetMetrics}`);
        
        if (!targetResults.results?.tests) {
          console.log(`⚠️ No test data for LLM: ${llmName}`);          continue;
        }
        
        // Crear mapa de tests del target para búsqueda rápida
        const targetTestMap = new Map();
        let passedTestsInTarget = 0;
        targetResults.results.tests.forEach(test => {
          if (!test.name) return;
          
          if (test.status === 'passed') {
            passedTestsInTarget++;
          }
          
          const filename = test.filePath ? test.filePath.replace(/\\/g, '/').split('/').pop() : '';
          const key = `${filename}-${test.name}`;
          targetTestMap.set(key, test);
          
          // También agregar entrada con nombre base para ejecuciones dinámicas
          const baseTestName = test.name
            .replace(/\s*\(\d+\)$/, '')
            .replace(/\s*-\s*run\s*\d+$/i, '')
            .replace(/\s*#\d+$/, '')
            .trim();
          
          if (baseTestName !== test.name) {
            const baseKey = `${filename}-${baseTestName}`;            if (!targetTestMap.has(baseKey)) {
              targetTestMap.set(baseKey, test);
            }
          }
        });
        
        console.log(`  - Tests passed en ${llmName}: ${passedTestsInTarget}`);
        
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
        const baselineTestFiles = baselineMetrics?.testFiles || {};        const targetTestFiles = targetMetrics?.testFiles || {};
        
        // Procesar cada test baseline y buscar correspondiente en target
        if (baselineResults.results?.tests) {
          console.log(`  - Comparando con ${baselineResults.results.tests.length} tests baseline`);
          let matchedTests = 0;
          
          baselineResults.results.tests.forEach(baselineTest => {
            if (!baselineTest.name) return;
            
            const baselineFilename = baselineTest.filePath ? 
              baselineTest.filePath.replace(/\\/g, '/').split('/').pop() : '';
            const baselineTestName = baselineTest.name;
            const key = `${baselineFilename}-${baselineTestName}`;
            
            let targetTest = targetTestMap.get(key);
            
            // Si no se encuentra, intentar con nombre base para ejecuciones dinámicas
            if (!targetTest) {
              const baseTestName = baselineTestName
                .replace(/\s*\(\d+\)$/, '')
                .replace(/\s*-\s*run\s*\d+$/i, '')
                .replace(/\s*#\d+$/, '')
                .trim();
              
              if (baseTestName !== baselineTestName) {
                const baseKey = `${baselineFilename}-${baseTestName}`;
                targetTest = targetTestMap.get(baseKey);              }
            }
            
            // Solo procesar tests que pasaron en el LLM target
            if (targetTest && targetTest.status === 'passed') {
              matchedTests++;
              // Obtener métricas de comandos
              const baseTestName = baselineTestName
                .replace(/\s*\(\d+\)$/, '')
                .replace(/\s*-\s*run\s*\d+$/i, '')
                .replace(/\s*#\d+$/, '')
                .trim();
              
              const baselineTestMetrics = findTestMetrics(baselineTestFiles, baselineFilename, baseTestName) || 
                                        findTestMetrics(baselineTestFiles, baselineFilename, baselineTestName);
              const targetTestMetrics = findTestMetrics(targetTestFiles, baselineFilename, baseTestName) || 
                                     findTestMetrics(targetTestFiles, baselineFilename, baselineTestName);
              
              passedTests.push({
                llm: llmName,
                llmDisplayName: this.getLLMDisplayName(llmName),
                testName: baselineTestName,
                fileName: baselineFilename,
                filePath: baselineTest.filePath,
                target: {
                  executed: true,
                  status: targetTest.status,
                  passed: targetTest.status === 'passed',
                  duration: targetTest.duration || 0,
                  actionableCommands: targetTestMetrics?.actionableCommands || 0,
                  commands: targetTestMetrics?.commands || {}
                },
                baseline: {
                  executed: true,
                  status: baselineTest.status,
                  passed: baselineTest.status === 'passed',
                  duration: baselineTest.duration || 0,
                  actionableCommands: baselineTestMetrics?.actionableCommands || 0,
                  commands: baselineTestMetrics?.commands || {}
                },
                comparison: {
                  statusMatch: baselineTest.status === targetTest.status,
                  actionsDifference: (targetTestMetrics?.actionableCommands || 0) - (baselineTestMetrics?.actionableCommands || 0),                  durationDifference: (targetTest.duration || 0) - (baselineTest.duration || 0)
                }              });
          
          console.log(`  - Tests matched y passed en ${llmName}: ${matchedTests}`);
        }
      }
      
      this.results.metadata.llmsAnalyzed = Array.from(llmsSet);
      this.results.metadata.totalPassedTests = passedTests.length;
      
      console.log(`📊 Encontrados ${passedTests.length} tests con resultado PASSED`);
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
      'gpt_4o': 'GPT-4o',      'o1_preview': 'o1 (Preview)',
      'o3_mini': 'o3-mini',
      'o4_mini_preview': 'o4-mini (Preview)'
    };
    
    return mapping[llmKey] || llmKey;
  }

  /**
   * Obtiene métricas de eficiencia adicionales para análisis más profundo
   */
  getAdditionalMetrics(llmName, efficiencyMetrics) {
    try {
      const metrics = efficiencyMetrics[llmName];
      
      if (!metrics) {
        return null;
      }

      return {
        llm: llmName,
        timestamp: metrics.timestamp,
        summary: metrics.summary,
        testFiles: metrics.testFiles,
        overallEfficiency: {
          totalTests: metrics.summary?.totalTestCases || 0,
          passedTests: metrics.summary?.passed || 0,
          passRate: metrics.summary?.totalTestCases > 0 ? 
            (metrics.summary.passed / metrics.summary.totalTestCases * 100) : 0,
          avgDuration: metrics.summary?.avgDuration || 0,
          totalCommands: Object.values(metrics.testFiles || {})
            .reduce((sum, file) => sum + (file.actionableCommands || 0), 0)
        }
      };
    } catch (error) {
      console.warn(`⚠️ No se pudieron obtener métricas adicionales para ${llmName}:`, error.message);
      return null;
    }
  }

  /**
   * Limpia el nombre del archivo para comparaciones
   */  getCleanFileName(filePath) {
    if (!filePath) return '';
    const fileName = filePath.split('\\').pop()?.split('/').pop() || filePath;
    return fileName.replace('.spec.ts', '').replace('.spec.js', '');
  }

  /**
   * Procesa y enriquece la información de cada test passed
   */
  async processPassedTests(passedTests, efficiencyMetrics) {
    console.log('🔄 Procesando tests passed y obteniendo métricas adicionales...');
    
    const processedTests = [];
    
    for (let i = 0; i < passedTests.length; i++) {
      const test = passedTests[i];
      
      if (i % 10 === 0) {
        console.log(`📈 Procesando ${i + 1}/${passedTests.length} tests...`);
      }

      // Obtener métricas adicionales del LLM target y baseline
      const targetAdditionalMetrics = this.getAdditionalMetrics(test.llm, efficiencyMetrics);
      const baselineAdditionalMetrics = this.getAdditionalMetrics('original', efficiencyMetrics);

      // Calcular mejoras/degradaciones
      const improvements = this.calculateImprovements(test, targetAdditionalMetrics, baselineAdditionalMetrics);

      const processedTest = {
        id: `${test.llm}_${this.getCleanFileName(test.fileName)}_${test.testName.replace(/\s+/g, '_')}`,
        testInfo: {
          name: test.testName,
          fileName: this.getCleanFileName(test.fileName),
          filePath: test.filePath
        },
        llmInfo: {
          name: test.llm,
          displayName: test.llmDisplayName
        },
        baselineInfo: {
          name: 'original',
          displayName: 'Original (Baseline)'
        },
        execution: {
          target: test.target,
          baseline: test.baseline
        },
        additionalMetrics: {
          target: targetAdditionalMetrics,
          baseline: baselineAdditionalMetrics
        },
        comparison: {
          statusMatch: test.comparison.statusMatch,
          actionsDifference: test.comparison.actionsDifference,
          durationDifference: test.comparison.durationDifference,
          improvements: improvements
        }
      };      processedTests.push(processedTest);
    }

    return processedTests;
  }

  /**
   * Calcula mejoras y degradaciones entre target y baseline
   */
  calculateImprovements(test, targetAdditionalMetrics, baselineAdditionalMetrics) {
    const improvements = {
      executionTime: {
        absolute: test.comparison.durationDifference,
        percentage: 0,
        improved: test.comparison.durationDifference < 0
      },
      actionEfficiency: {
        absolute: test.comparison.actionsDifference,
        percentage: 0,
        improved: test.comparison.actionsDifference < 0
      },
      overallEfficiency: null
    };

    // Calcular porcentaje de mejora en tiempo
    if (test.baseline.duration > 0) {
      improvements.executionTime.percentage = 
        (test.comparison.durationDifference / test.baseline.duration) * 100;
    }

    // Calcular porcentaje de mejora en acciones
    if (test.baseline.actionableCommands > 0) {
      improvements.actionEfficiency.percentage = 
        (test.comparison.actionsDifference / test.baseline.actionableCommands) * 100;
    }

    // Calcular eficiencia global si tenemos métricas adicionales
    if (targetAdditionalMetrics && baselineAdditionalMetrics) {
      const targetPassRate = targetAdditionalMetrics.overallEfficiency.passRate;
      const baselinePassRate = baselineAdditionalMetrics.overallEfficiency.passRate;
      
      if (baselinePassRate > 0) {
        const passRateDifference = targetPassRate - baselinePassRate;
        improvements.overallEfficiency = {
          absolute: passRateDifference,
          percentage: (passRateDifference / baselinePassRate) * 100,
          improved: passRateDifference > 0 // Mayor pass rate = mejor
        };
      }
    }

    return improvements;
  }

  /**
   * Genera estadísticas resumidas
   */
  generateSummaryStats(processedTests) {
    const stats = {
      totalTests: processedTests.length,
      byLLM: {},
      byFile: {},
      improvements: {
        timeImproved: 0,
        actionsImproved: 0,
        bothImproved: 0,
        averageTimeImprovement: 0,
        averageActionImprovement: 0
      }
    };

    let totalTimeImprovement = 0;
    let totalActionImprovement = 0;
    let timeImprovedCount = 0;
    let actionImprovedCount = 0;

    for (const test of processedTests) {
      // Estadísticas por LLM
      if (!stats.byLLM[test.llmInfo.name]) {
        stats.byLLM[test.llmInfo.name] = {
          displayName: test.llmInfo.displayName,
          count: 0,
          avgTimeImprovement: 0,
          avgActionImprovement: 0
        };
      }
      stats.byLLM[test.llmInfo.name].count++;

      // Estadísticas por archivo
      if (!stats.byFile[test.testInfo.fileName]) {
        stats.byFile[test.testInfo.fileName] = 0;
      }
      stats.byFile[test.testInfo.fileName]++;

      // Mejoras
      if (test.comparison.improvements.executionTime.improved) {
        stats.improvements.timeImproved++;
        totalTimeImprovement += Math.abs(test.comparison.improvements.executionTime.percentage);
        timeImprovedCount++;
      }

      if (test.comparison.improvements.actionEfficiency.improved) {
        stats.improvements.actionsImproved++;
        totalActionImprovement += Math.abs(test.comparison.improvements.actionEfficiency.percentage);
        actionImprovedCount++;
      }

      if (test.comparison.improvements.executionTime.improved && 
          test.comparison.improvements.actionEfficiency.improved) {
        stats.improvements.bothImproved++;
      }
    }

    // Calcular promedios
    stats.improvements.averageTimeImprovement = timeImprovedCount > 0 ? 
      totalTimeImprovement / timeImprovedCount : 0;    stats.improvements.averageActionImprovement = actionImprovedCount > 0 ? 
      totalActionImprovement / actionImprovedCount : 0;

    return stats;
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

      // Procesar y enriquecer datos
      const processedTests = await this.processPassedTests(passedTests, efficiencyMetrics);

      // Generar estadísticas
      const summaryStats = this.generateSummaryStats(processedTests);

      // Estructurar resultado final
      this.results.passedTestsComparison = processedTests;
      this.results.summaryStatistics = summaryStats;

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
    console.log(`💾 Resultados guardados en: ${jsonFile}`);

    // CSV simplificado para análisis rápido
    const csvFile = path.join(outputDir, `passed_tests_summary_${timestamp}.csv`);
    this.generateCSV(csvFile);
    console.log(`📊 Resumen CSV guardado en: ${csvFile}`);

    // Archivo de estadísticas resumidas
    const statsFile = path.join(outputDir, `passed_tests_stats_${timestamp}.json`);
    fs.writeFileSync(statsFile, JSON.stringify(this.results.summaryStatistics, null, 2));
    console.log(`📈 Estadísticas guardadas en: ${statsFile}`);
  }

  /**
   * Genera archivo CSV con datos simplificados
   */
  generateCSV(filePath) {
    const headers = [
      'Test_ID',
      'Test_Name', 
      'File_Name',
      'LLM',
      'LLM_Display_Name',
      'Target_Duration_ms',
      'Baseline_Duration_ms',
      'Duration_Difference_ms',
      'Duration_Improvement_Percent',
      'Target_Actions',
      'Baseline_Actions', 
      'Actions_Difference',
      'Actions_Improvement_Percent',
      'Time_Improved',
      'Actions_Improved',
      'Both_Improved',
      'Target_Status',
      'Baseline_Status',
      'Status_Match'
    ];

    const rows = this.results.passedTestsComparison.map(test => [
      test.id,
      `"${test.testInfo.name}"`,
      test.testInfo.fileName,
      test.llmInfo.name,
      `"${test.llmInfo.displayName}"`,
      test.execution.target.duration,
      test.execution.baseline.duration,
      test.comparison.durationDifference,
      test.comparison.improvements.executionTime.percentage.toFixed(2),
      test.execution.target.actionableCommands,
      test.execution.baseline.actionableCommands,
      test.comparison.actionsDifference,
      test.comparison.improvements.actionEfficiency.percentage.toFixed(2),
      test.comparison.improvements.executionTime.improved ? 'YES' : 'NO',
      test.comparison.improvements.actionEfficiency.improved ? 'YES' : 'NO',
      (test.comparison.improvements.executionTime.improved && 
       test.comparison.improvements.actionEfficiency.improved) ? 'YES' : 'NO',
      test.execution.target.status,
      test.execution.baseline.status,
      test.comparison.statusMatch ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    fs.writeFileSync(filePath, csvContent);
  }

  /**
   * Imprime resumen en consola
   */
  printSummary() {
    const stats = this.results.summaryStatistics;
    
    console.log('\n📊 RESUMEN DE ANÁLISIS DE TESTS PASSED');
    console.log('================================================');
    console.log(`📝 Total tests passed analizados: ${stats.totalTests}`);
    console.log(`⏱️  Tests con mejora de tiempo: ${stats.improvements.timeImproved} (${((stats.improvements.timeImproved/stats.totalTests)*100).toFixed(1)}%)`);
    console.log(`⚡ Tests con mejora de acciones: ${stats.improvements.actionsImproved} (${((stats.improvements.actionsImproved/stats.totalTests)*100).toFixed(1)}%)`);
    console.log(`🎯 Tests con ambas mejoras: ${stats.improvements.bothImproved} (${((stats.improvements.bothImproved/stats.totalTests)*100).toFixed(1)}%)`);
    console.log(`📈 Mejora promedio de tiempo: ${stats.improvements.averageTimeImprovement.toFixed(2)}%`);
    console.log(`📈 Mejora promedio de acciones: ${stats.improvements.averageActionImprovement.toFixed(2)}%`);
    
    console.log('\n🤖 TESTS PASSED POR LLM:');
    Object.entries(stats.byLLM).forEach(([llm, data]) => {
      console.log(`   ${data.displayName}: ${data.count} tests`);
    });
    
    console.log('\n📁 TESTS PASSED POR ARCHIVO:');
    Object.entries(stats.byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([file, count]) => {
        console.log(`   ${file}: ${count} tests`);
      });
  }
}

// Ejecutar el análisis si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎬 Script iniciado - extract_passed_tests_comparison.js');
  console.log('📍 Directorio actual:', process.cwd());
  console.log('📁 Script ubicado en:', __dirname);
  
  const analyzer = new PassedTestsAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export default PassedTestsAnalyzer;
