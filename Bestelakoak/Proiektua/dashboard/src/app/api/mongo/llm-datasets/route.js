import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/**
 * MongoDB API Route for LLM Datasets (Combined Data)
 * GET /api/mongo/llm-datasets
 * 
 * Query parameters:
 * - llm: Filter by specific LLM (optional)
 * - latest: Get only latest datasets (default: true)
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_dashboard';

export async function GET(request) {
  let client;
  
  try {
    const { searchParams } = new URL(request.url);
    const llm = searchParams.get('llm');
    const latest = searchParams.get('latest') !== 'false';
    
    console.log('📊 Fetching LLM datasets from MongoDB...');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection('llm_datasets');
    
    let query = {};
    
    if (latest) {
      // Get only latest datasets
      query._id = /^latest_/;
    }
    
    if (llm) {
      query.llm = llm;
    }
    
    const results = await collection.find(query).toArray();
    
    // Clean MongoDB _id field and format for frontend
    const cleanResults = results.map(doc => {
      const { _id, ...cleanData } = doc;
      return {
        ...cleanData,
        id: doc.llm?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown'
      };
    });
    
    const response = {
      success: true,
      data: cleanResults,
      count: cleanResults.length,
      timestamp: new Date().toISOString(),
      source: 'mongodb',
      query: { llm, latest }
    };
    
    console.log(`✅ Found ${cleanResults.length} LLM datasets`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error fetching LLM datasets:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
      count: 0,
      timestamp: new Date().toISOString(),
      source: 'mongodb'
    }, { status: 500 });
    
  } finally {
    if (client) {
      await client.close();
    }
  }
}
