import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Define types for efficiency data structures
interface EfficiencyMetrics {
  codeQuality: number;
  generationSpeed: number;
  executionSuccess: number;
  codeReuse: number;
}

interface PerformanceMetrics {
  avgGenerationTime: number;
  testCount: number;
  passRate: number;
  emptyCodeRatio: number;
}

interface LLMRanking {
  rank: number;
  llm: string;
  overallScore: number;
  metrics: EfficiencyMetrics;
  performance: PerformanceMetrics;
}

interface EfficiencySummary {
  topPerformer: string;
  avgEfficiencyScore: number;
  totalTestsAnalyzed: number;
  totalLLMs: number;
}

interface EfficiencyWeights {
  codeQuality: number;
  generationSpeed: number;
  executionSuccess: number;
  codeReuse: number;
}

interface EfficiencyReport {
  timestamp: string;
  reportDate: string;
  version: string;
  summary: EfficiencySummary;
  weights: EfficiencyWeights;
  rankings: LLMRanking[];
  detailedMetrics: Record<string, any>;
  metadata: {
    insertedAt: string;
    source: string;
    reportFile: string;
  };
}

// MongoDB collection names
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';
const EFFICIENCY_COLLECTION = 'efficiency_analysis';

export async function GET(request: Request) {
  try {
    console.log("Loading LLM efficiency analysis data from MongoDB");
    
    const { searchParams } = new URL(request.url);
    const reportDate = searchParams.get('date');
    const includeDetailed = searchParams.get('detailed') === 'true';
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(EFFICIENCY_COLLECTION);
    
    let efficiencyData: EfficiencyReport | null;    if (reportDate) {
      // Get specific date report
      efficiencyData = await collection.findOne({ 
        reportDate: reportDate 
      }) as EfficiencyReport | null;
    } else {
      // Get latest report by querying the document with the "latest_efficiency" id
      // Using proper MongoDB filter to avoid ObjectId type issues
      efficiencyData = await collection.findOne({ 
        _id: 'latest_efficiency' 
      } as any) as EfficiencyReport | null;
    }
    
    if (!efficiencyData) {
      console.log("Efficiency analysis data not found in MongoDB");
      return NextResponse.json(
        { 
          error: "Efficiency analysis data not found. Run the efficiency analyzer and database integration first.",
          suggestion: "Execute: node efficiency_analyzer.js && node save_to_database.js"
        }, 
        { status: 404 }
      );
    }
    
    // Prepare response data
    const responseData: any = {
      timestamp: efficiencyData.timestamp,
      reportDate: efficiencyData.reportDate,
      version: efficiencyData.version,
      summary: efficiencyData.summary,
      weights: efficiencyData.weights,
      rankings: efficiencyData.rankings,
      metadata: {
        insertedAt: efficiencyData.metadata.insertedAt,
        source: efficiencyData.metadata.source
      }
    };
    
    // Include detailed metrics only if requested (they can be large)
    if (includeDetailed) {
      responseData.detailedMetrics = efficiencyData.detailedMetrics;
    }
      // Add computed insights
    responseData.insights = {
      performanceGap: efficiencyData.rankings[0].overallScore - efficiencyData.rankings[efficiencyData.rankings.length - 1].overallScore,
      fastestLLM: efficiencyData.rankings.reduce((fastest, current) => 
        current.performance.avgGenerationTime < fastest.performance.avgGenerationTime ? current : fastest
      ).llm,
      mostAccurateLLM: efficiencyData.rankings.reduce((accurate, current) => 
        current.performance.passRate > accurate.performance.passRate ? current : accurate
      ).llm,
      avgGenerationTime: efficiencyData.rankings.reduce((sum, ranking) => 
        sum + ranking.performance.avgGenerationTime, 0) / efficiencyData.rankings.length,
      avgPassRate: efficiencyData.rankings.reduce((sum, ranking) => 
        sum + ranking.performance.passRate, 0) / efficiencyData.rankings.length
    };

    // Add methodology explanation
    responseData.methodology = {
      description: "LLM Efficiency Measurement System for Cypress Test Generation",
      version: "1.0",
      weightsExplanation: {
        codeQuality: {
          weight: 0.40,
          percentage: "40%",
          title: "Code Quality Score",
          description: "Measures how well the LLM understands Cypress testing patterns and generates syntactically correct, meaningful test code.",
          importance: "Primary success factor - represents the core value proposition of LLM-generated tests",
          measures: [
            "Syntactic correctness of generated Cypress test code",
            "Proper usage of Cypress API patterns and conventions", 
            "Meaningful test structure and organization",
            "Adherence to testing best practices"
          ],
          qualityLevels: {
            high: "Contains multiple Cypress patterns, proper test structure, meaningful assertions",
            medium: "Basic Cypress commands, some structure, minimal assertions",
            low: "Empty code, syntax errors, non-Cypress content"
          },
          calculation: "Base score 0.5 for non-empty code + 0.1 per unique Cypress pattern (cy.*, should(), visit(), click(), type(), etc.)"
        },
        executionSuccess: {
          weight: 0.30,
          percentage: "30%",
          title: "Execution Success Rate", 
          description: "Percentage of generated tests that pass when executed in real environment.",
          importance: "Critical for practical effectiveness - code that doesn't execute successfully is fundamentally flawed",
          measures: [
            "Percentage of generated tests that pass when executed",
            "Real-world functionality and correctness",
            "Integration with the actual application under test",
            "Absence of runtime errors and failures"
          ],
          successLevels: {
            excellent: "90-100% pass rate - Tests run reliably, find real issues, stable execution",
            good: "70-89% pass rate - Most tests pass, occasional environment issues", 
            fair: "50-69% pass rate - Mixed results, some fundamental issues",
            poor: "0-49% pass rate - Tests frequently fail, major structural problems"
          },
          calculation: "Linear scaling: (Passed Tests / Total Tests Executed) × 100%"
        },
        generationSpeed: {
          weight: 0.20,
          percentage: "20%", 
          title: "Generation Speed",
          description: "Time taken by the LLM to generate test code responses.",
          importance: "Important for developer productivity and workflow efficiency, but secondary to quality and correctness",
          measures: [
            "Time taken by the LLM to generate test code responses",
            "Consistency of response times across different prompts",
            "Efficiency of the model in producing output"
          ],
          speedCategories: {
            veryFast: "< 15 seconds - Immediate productivity, minimal wait time",
            fast: "15-20 seconds - Good responsiveness, acceptable for iterative development",
            moderate: "20-30 seconds - Noticeable delay, may impact workflow", 
            slow: "> 30 seconds - Significant wait time, productivity impact"
          },
          calculation: "Min-max normalization: (Max Time - Current Time) / (Max Time - Min Time)"
        },
        codeReuse: {
          weight: 0.10,
          percentage: "10%",
          title: "Code Reuse Efficiency",
          description: "LLM's ability to generate non-empty, meaningful code consistently.",
          importance: "Reliability indicator - demonstrates consistent LLM performance, but least critical for initial test generation",
          measures: [
            "Avoidance of placeholder text, empty responses, or generic templates",
            "Consistency in code generation across different prompts",
            "Reliability in producing usable output"
          ],
          efficiencyLevels: {
            excellent: "95-100% meaningful responses - Consistently generates meaningful code",
            good: "85-94% meaningful responses - Occasional empty responses, mostly reliable",
            fair: "70-84% meaningful responses - Notable empty response rate, inconsistent",
            poor: "< 70% meaningful responses - Frequently fails to generate usable code"
          },
          calculation: "1.0 - (Empty Responses / Total Responses)"
        }
      },
      overallFormula: "Overall Efficiency = (Code Quality × 0.40) + (Execution Success × 0.30) + (Generation Speed × 0.20) + (Code Reuse × 0.10)",
      rationale: {
        codeQuality: "40% weight because generating syntactically correct, meaningful test code is the primary purpose. Poor quality code renders speed irrelevant.",
        executionSuccess: "30% weight because tests must actually work to provide value. Failed tests waste CI/CD resources and developer time.", 
        generationSpeed: "20% weight because speed affects workflow integration and developer satisfaction, but quality comes first.",
        codeReuse: "10% weight because while consistent output is important, other metrics capture more critical aspects of effectiveness."
      },
      alternativeConfigurations: {
        development: "Speed-focused: Quality 35%, Success 25%, Speed 30%, Reuse 10%",
        production: "Quality-focused: Quality 50%, Success 35%, Speed 10%, Reuse 5%",
        research: "Balanced: Quality 25%, Success 25%, Speed 25%, Reuse 25%"
      }
    };
    
    console.log(`Successfully loaded efficiency data for ${efficiencyData.rankings.length} LLMs`);
    console.log(`Top performer: ${efficiencyData.summary.topPerformer} (${efficiencyData.rankings[0].overallScore.toFixed(4)})`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error loading efficiency analysis data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load efficiency analysis data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("Triggering efficiency analysis update");
    
    const body = await request.json();
    const { forceReanalyze = false } = body;
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(EFFICIENCY_COLLECTION);
      if (forceReanalyze) {
      // Clear existing efficiency data to trigger re-analysis
      await collection.deleteMany({ _id: { $ne: 'config' } } as any);
      console.log("Cleared existing efficiency data for re-analysis");
    }
    
    // Here you could trigger the efficiency analyzer script
    // For now, we'll just return a response indicating the action needed
    
    return NextResponse.json({
      message: "Efficiency analysis update requested",
      action: forceReanalyze ? "cleared_for_reanalysis" : "update_requested",
      next_steps: [
        "Run: node efficiency_analyzer.js",
        "Run: node save_to_database.js",
        "Refresh dashboard to see updated results"
      ]
    });
    
  } catch (error) {
    console.error('Error updating efficiency analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update efficiency analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// GET available report dates
export async function OPTIONS() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(EFFICIENCY_COLLECTION);
    
    // Get all available report dates
    const reports = await collection.find(
      { reportDate: { $exists: true } },
      { projection: { reportDate: 1, timestamp: 1, 'summary.topPerformer': 1 } }
    ).sort({ reportDate: -1 }).toArray();
    
    return NextResponse.json({
      availableReports: reports.map(report => ({
        date: report.reportDate,
        timestamp: report.timestamp,
        topPerformer: report.summary?.topPerformer
      }))
    });
    
  } catch (error) {
    console.error('Error fetching available reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available reports' }, 
      { status: 500 }
    );
  }
}
