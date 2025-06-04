import { MongoClient } from 'mongodb';
import { promises as fs } from 'fs';
import path from 'path';

interface ActionCommand {
  command: string;
  count: number;
}

interface TestMetrics {
  orderInFile: number;
  actionableCommands: number;
  commands: string[];
}

interface FileMetrics {
  totalTests: number;
  tests: Record<string, TestMetrics>;
}

interface EfficiencyMetrics {
  llm: string;
  testFiles: Record<string, FileMetrics>;
  summary: {
    totalActionableCommands: number;
    totalTests: number;
    averageCommandsPerTest: number;
    totalFiles: number;
    commandBreakdown: ActionCommand[];
    mostUsedCommands: string[];
  };
}

async function ingestEfficiencyData() {
  console.log("🚀 STARTING EFFICIENCY DATA INGESTION SCRIPT");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("📂 Current working directory:", process.cwd());
  
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    console.log("🔗 Connecting to MongoDB at:", uri);
    await client.connect();
    console.log("✅ Connected to MongoDB successfully");

    const database = client.db("tests");
    const efficiencyCollection = database.collection("efficiency_metrics");
    console.log("📊 Using database: 'tests', collection: 'efficiency_metrics'");

    // Check existing data
    const existingCount = await efficiencyCollection.countDocuments();
    console.log(`📈 Found ${existingCount} existing documents in collection`);

    if (existingCount > 0) {
      console.log("🗑️  Clearing existing data...");
      await efficiencyCollection.deleteMany({});
      console.log("✅ Existing data cleared");
    }

    // Load efficiency report
    const reportPath = path.join(process.cwd(), '..', 'efficiency_reports', 'efficiency_report_2025-05-27.json');
    console.log("📂 Loading efficiency report from:", reportPath);
    
    try {
      const reportData = await fs.readFile(reportPath, 'utf8');
      const efficiencyReport = JSON.parse(reportData);
      console.log("✅ Efficiency report loaded successfully");
      console.log("📊 Report contains:", Object.keys(efficiencyReport));
    } catch (error) {
      console.error("❌ Error loading efficiency report:", error);
      throw error;
    }

    console.log("🔍 Loading test efficiency metrics...");
      // Load test efficiency metrics
    const metricsDir = path.join(process.cwd(), 'data', 'test_eficcency_metrics');
    console.log("📁 Metrics directory path:", metricsDir);
    
    let metricsFiles;
    try {
      metricsFiles = await fs.readdir(metricsDir);
      console.log(`📊 Found ${metricsFiles.length} files in metrics directory:`);
      metricsFiles.forEach(file => console.log(`  - ${file}`));
    } catch (error) {
      console.error("❌ Error reading metrics directory:", error);
      throw error;
    }
    
    const jsonFiles = metricsFiles.filter(file => file.endsWith('.json'));
    console.log(`🔍 Found ${jsonFiles.length} JSON files to process`);
    
    const allMetrics: EfficiencyMetrics[] = [];
    
    for (let i = 0; i < jsonFiles.length; i++) {
      const file = jsonFiles[i];
      console.log(`\n📄 [${i + 1}/${jsonFiles.length}] Processing: ${file}`);
      
      try {
        const llmName = file.replace('test-efficiency-metrics_', '').replace('.json', '');
        console.log(`  🤖 LLM Name: ${llmName}`);
        
        const filePath = path.join(metricsDir, file);
        console.log(`  📂 File path: ${filePath}`);
        
        const fileContent = await fs.readFile(filePath, 'utf8');
        console.log(`  📏 File size: ${fileContent.length} characters`);
        
        const metrics = JSON.parse(fileContent);
        console.log(`  ✅ JSON parsed successfully`);
        console.log(`  📊 Raw data keys:`, Object.keys(metrics));
        
        if (metrics.testFiles) {
          console.log(`  📁 Test files found: ${Object.keys(metrics.testFiles).length}`);
        } else {
          console.log(`  ⚠️  No testFiles property found`);
        }
        
        // Process the metrics to create summary
        console.log(`  ⚙️  Processing metrics...`);
        const summary = processMetrics(metrics);
        console.log(`  📈 Summary generated:`);
        console.log(`    - Total tests: ${summary.totalTests}`);
        console.log(`    - Total commands: ${summary.totalActionableCommands}`);
        console.log(`    - Avg commands/test: ${summary.averageCommandsPerTest.toFixed(2)}`);
        console.log(`    - Command types: ${summary.commandBreakdown.length}`);
        
        const processedMetrics: EfficiencyMetrics = {
          llm: llmName,
          testFiles: metrics.testFiles,
          summary
        };
        
        allMetrics.push(processedMetrics);
        console.log(`  📋 Added to metrics array`);
        
        // Insert individual LLM metrics
        console.log(`  💾 Inserting into MongoDB...`);
        const result = await efficiencyCollection.replaceOne(
          { llm: llmName },
          {
            ...processedMetrics,
            timestamp: new Date(),
            source: 'efficiency_ingestion_script'
          },          { upsert: true }
        );
        console.log(`  ✅ MongoDB insert result: ${result.modifiedCount ? 'Updated' : 'Inserted'}`);
        
        console.log(`  🎯 Completed processing for ${llmName}`);
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error);
      }
    }

    if (allMetrics.length === 0) {
      console.error("❌ No valid metrics found!");
      process.exit(1);
    }

    console.log(`\n🎯 Successfully processed ${allMetrics.length} LLM metrics files`);

    // Re-read efficiency report for global summary (fix scope issue)
    const reportData = await fs.readFile(reportPath, 'utf8');
    const efficiencyReport = JSON.parse(reportData);

    // Create global summary document
    console.log("🌍 Creating global summary...");
    const uniqueCommands = getUniqueCommands(allMetrics);
    const globalCommandBreakdown = getGlobalCommandBreakdown(allMetrics);
    const llmComparison = getLLMComparison(allMetrics, efficiencyReport);
    
    console.log(`  📊 Unique commands: ${uniqueCommands.length}`);
    console.log(`  📈 Global command breakdown entries: ${globalCommandBreakdown.length}`);
    console.log(`  🤖 LLM comparison entries: ${llmComparison.length}`);

    const globalSummary = {
      type: 'global_summary',
      report: efficiencyReport,
      totalLLMs: allMetrics.length,
      totalUniqueCommands: uniqueCommands,
      globalCommandBreakdown: globalCommandBreakdown,
      llmComparison: llmComparison,
      timestamp: new Date(),
      source: 'efficiency_ingestion_script'
    };

    console.log("💾 Inserting global summary into MongoDB...");
    const globalResult = await efficiencyCollection.replaceOne(
      { type: 'global_summary' },
      globalSummary,
      { upsert: true }
    );
    console.log(`✅ Global summary ${globalResult.modifiedCount ? 'updated' : 'inserted'}`);

    const totalTests = allMetrics.reduce((sum, m) => sum + m.summary.totalTests, 0);
    const totalCommands = allMetrics.reduce((sum, m) => sum + m.summary.totalActionableCommands, 0);

    console.log("\n🎉 Ingestion Complete!");
    console.log("=" .repeat(50));
    console.log(`📊 Final Statistics:`);
    console.log(`  🤖 LLMs processed: ${allMetrics.length}`);
    console.log(`  🧪 Total tests: ${totalTests}`);
    console.log(`  ⚡ Total commands: ${totalCommands}`);
    console.log(`  🔧 Unique command types: ${uniqueCommands.length}`);
    console.log(`  📈 Average commands per test: ${(totalCommands / totalTests).toFixed(2)}`);
    console.log("=" .repeat(50));
  } catch (error) {
    console.error("\n💥 ERROR DURING INGESTION:");
    console.error("=" .repeat(50));
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error(`Unknown error:`, error);
    }
    console.error("=" .repeat(50));
    process.exit(1);
  } finally {
    console.log("\n🔌 Closing MongoDB connection...");
    await client.close();
    console.log("✅ MongoDB connection closed successfully");
    console.log("🏁 Script execution completed");
  }
}

function processMetrics(metrics: any) {
  console.log("    🔄 Processing metrics...");
  let totalActionableCommands = 0;
  let totalTests = 0;
  let totalFiles = 0;
  const commandCounts: Record<string, number> = {};

  console.log("    📁 Processing test files...");
  for (const [fileName, fileData] of Object.entries(metrics.testFiles)) {
    console.log(`      📄 Processing file: ${fileName}`);
    totalFiles++;
    const fileTestCount = (fileData as any).totalTests;
    totalTests += fileTestCount;
    console.log(`        🧪 Tests in file: ${fileTestCount}`);
    
    const testsInFile = Object.keys((fileData as any).tests);
    console.log(`        📝 Test names: ${testsInFile.length} tests`);
    
    for (const [testName, testData] of Object.entries((fileData as any).tests)) {
      const test = testData as TestMetrics;
      totalActionableCommands += test.actionableCommands;
      console.log(`          ⚡ Test "${testName}": ${test.actionableCommands} commands`);
      
      // Count command types
      test.commands.forEach(command => {
        commandCounts[command] = (commandCounts[command] || 0) + 1;
      });
    }
  }

  console.log(`    📊 Totals: ${totalFiles} files, ${totalTests} tests, ${totalActionableCommands} commands`);

  // Create command breakdown
  const commandBreakdown: ActionCommand[] = Object.entries(commandCounts)
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);

  console.log(`    🔧 Command breakdown: ${commandBreakdown.length} unique command types`);
  console.log(`    🏆 Top 5 commands:`);
  commandBreakdown.slice(0, 5).forEach((cmd, i) => {
    console.log(`      ${i + 1}. ${cmd.command}: ${cmd.count} uses`);
  });

  const mostUsedCommands = commandBreakdown.slice(0, 10).map(item => item.command);

  return {
    totalActionableCommands,
    totalTests,
    averageCommandsPerTest: totalTests > 0 ? totalActionableCommands / totalTests : 0,
    totalFiles,
    commandBreakdown,
    mostUsedCommands
  };
}

function getUniqueCommands(allMetrics: EfficiencyMetrics[]): string[] {
  const uniqueCommands = new Set<string>();
  
  allMetrics.forEach(metric => {
    metric.summary.commandBreakdown.forEach(cmd => {
      uniqueCommands.add(cmd.command);
    });
  });
  
  return Array.from(uniqueCommands);
}

function getGlobalCommandBreakdown(allMetrics: EfficiencyMetrics[]): ActionCommand[] {
  const globalCounts: Record<string, number> = {};
  
  allMetrics.forEach(metric => {
    metric.summary.commandBreakdown.forEach(cmd => {
      globalCounts[cmd.command] = (globalCounts[cmd.command] || 0) + cmd.count;
    });
  });
  
  return Object.entries(globalCounts)
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);
}

function getLLMComparison(allMetrics: EfficiencyMetrics[], report: any) {
  return allMetrics.map(metric => {
    const reportEntry = report.rankings?.find((r: any) => 
      r.llm.toLowerCase().replace(/[^a-z0-9]/g, '_') === metric.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')
    );
    
    return {
      llm: metric.llm,
      actionMetrics: {
        totalCommands: metric.summary.totalActionableCommands,
        averageCommandsPerTest: metric.summary.averageCommandsPerTest,
        totalTests: metric.summary.totalTests,
        commandEfficiency: metric.summary.averageCommandsPerTest > 0 ? 1 / metric.summary.averageCommandsPerTest : 0
      },
      performanceMetrics: reportEntry ? {
        rank: reportEntry.rank,
        overallScore: reportEntry.overallScore,
        codeQuality: reportEntry.codeQuality,
        executionSuccess: reportEntry.executionSuccess,
        passRate: reportEntry.passRate
      } : null
    };
  });
}

// Run the ingestion
console.log("🎬 Script loaded, starting execution...");
ingestEfficiencyData().catch((error) => {
  console.error("💥 CRITICAL ERROR:", error);
  process.exit(1);
});

export { ingestEfficiencyData };
