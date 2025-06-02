import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error(err);
    }
}

connectDB();

export async function GET(request: Request) {
  try {
    console.log("Loading test results data from MongoDB");
    
    const { searchParams } = new URL(request.url);
    const includeMetadata = searchParams.get('metadata') === 'true';
    
    const database = client.db("tests");
    const collection = database.collection("results");

    const results = await collection.find({}).toArray();
    
    if (!results || results.length === 0) {
      console.log("Test results data not found in MongoDB");
      return NextResponse.json(
        { 
          error: "Test results data not found. Run the test execution pipeline first.",
          suggestion: "Execute test runs and save results to database"
        }, 
        { status: 404 }
      );
    }
    
    // Ensure all results have an ID field to prevent "item.id is undefined" errors
    interface ResultItem {
      id?: string;
      results?: {
        tool?: {
          name?: string;
        };
      };
    }
    
    const processedResults = results.map((item: ResultItem, index: number) => {
      if (!item.id) {
        // Create a unique ID based on available data or index as fallback
        if (item.results && item.results.tool && item.results.tool.name) {
          item.id = `results_${item.results.tool.name}_${index}`;
        } else {
          item.id = `results_record_${index}`;
        }
      }
      return item;
    });

    // Prepare enhanced response data
    const responseData: any = {
      timestamp: new Date().toISOString(),
      reportDate: new Date().toISOString().split('T')[0],
      version: "1.0",      summary: {
        totalResults: processedResults.length,
        uniqueTools: [...new Set(processedResults.map((item: any) => 
          item.results?.tool?.name || 'unknown'
        ))].length,
        dataIntegrity: {
          withIds: processedResults.filter((item: any) => item.id).length,
          processed: processedResults.length
        }
      },
      results: processedResults,
      insights: {
        mostCommonTool: processedResults.length > 0 ? 
          processedResults.reduce((acc: Record<string, number>, item: any) => {
            const toolName = item.results?.tool?.name || 'unknown';
            acc[toolName] = (acc[toolName] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) : {},
        dataCompleteness: (processedResults.filter((item: any) => 
          item.results?.tool?.name
        ).length / Math.max(processedResults.length, 1) * 100).toFixed(1) + '%'
      }
    };

    // Include metadata only if requested
    if (includeMetadata) {
      responseData.metadata = {
        insertedAt: new Date().toISOString(),
        source: "results_collection",
        dataOrigin: "test_execution_pipeline"
      };
    }

    // Add methodology explanation for results collection
    responseData.methodology = {
      description: "Test Results Collection and Analysis System",
      version: "1.0",
      dataStructure: {
        title: "Test Results Data Organization",
        description: "Systematic collection and organization of test execution results from various testing tools and frameworks.",
        components: {
          resultIdentification: {
            purpose: "Unique identification of test results",
            method: "Auto-generated IDs based on tool name and execution sequence",
            format: "results_{tool_name}_{index} or results_record_{index}"
          },
          toolIntegration: {
            purpose: "Support for multiple testing frameworks and tools",
            compatibility: "Framework-agnostic result storage",
            extensibility: "Easy addition of new testing tools"
          },
          dataIntegrity: {
            purpose: "Ensure consistent data structure and completeness",
            validation: "Automatic validation and completion of missing fields",
            reliability: "Robust error handling and data recovery"
          }
        }
      },
      qualityMetrics: {
        dataCompleteness: "Percentage of results with complete tool information",
        uniqueIdentification: "All results have unique identifiers for reliable referencing",
        toolDiversity: "Number of different testing tools represented in results"
      },
      usageGuidelines: {
        bestPractices: [
          "Regular execution of test suites to maintain current results",
          "Consistent tool configuration for comparable results",
          "Proper error handling during test execution"
        ],
        dataRetrieval: {
          basic: "GET /api/results - Returns processed results with generated IDs",
          withMetadata: "GET /api/results?metadata=true - Includes detailed metadata"
        }
      }
    };
    
    console.log(`Successfully loaded ${processedResults.length} test results`);
    console.log(`Tools represented: ${responseData.summary.uniqueTools}`);
    
    return NextResponse.json(responseData);
  } catch (err) {
    console.error("Error fetching data from MongoDB:", err);
    return NextResponse.json(
      { 
        error: 'Failed to fetch results from database',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}