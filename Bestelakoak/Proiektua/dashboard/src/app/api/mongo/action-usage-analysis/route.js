import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_dashboard';

// Collection names
const COLLECTIONS = {
  ACTION_USAGE_ANALYSIS: 'action_usage_analysis',
  ACTION_USAGE_SUMMARY: 'action_usage_summary',
  ACTION_USAGE_COMPARISON: 'action_usage_comparison'
};

let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(DB_NAME);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const llm = searchParams.get('llm');
    const latest = searchParams.get('latest') === 'true';

    const database = await connectToDatabase();

    let result;    switch (type) {
      case 'summary':
        if (latest) {
          result = await database.collection(COLLECTIONS.ACTION_USAGE_SUMMARY)
            .findOne({ _id: 'latest_action_usage_summary' });
        } else {
          result = await database.collection(COLLECTIONS.ACTION_USAGE_SUMMARY)
            .find({})
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();
        }
        break;

      case 'analysis':
        const query = {};
        if (llm) {
          if (latest) {
            result = await database.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS)
              .findOne({ _id: `latest_action_analysis_${llm}` });
          } else {
            query.llm = llm;
            result = await database.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS)
              .find(query)
              .sort({ timestamp: -1 })
              .toArray();
          }
        } else {
          // Get all latest analyses
          if (latest) {
            result = await database.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS)
              .find({ _id: { $regex: /^latest_action_analysis_/ } })
              .toArray();
          } else {
            result = await database.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS)
              .find({})
              .sort({ timestamp: -1 })
              .limit(50)
              .toArray();
          }
        }
        break;

      case 'comparison':
        if (llm && latest) {
          result = await database.collection(COLLECTIONS.ACTION_USAGE_COMPARISON)
            .findOne({ _id: `latest_comparison_${llm}_vs_original` });
        } else if (llm) {
          result = await database.collection(COLLECTIONS.ACTION_USAGE_COMPARISON)
            .find({ target: llm })
            .sort({ timestamp: -1 })
            .toArray();
        } else {
          // Get all latest comparisons
          if (latest) {
            result = await database.collection(COLLECTIONS.ACTION_USAGE_COMPARISON)
              .find({ _id: { $regex: /^latest_comparison_/ } })
              .toArray();
          } else {
            result = await database.collection(COLLECTIONS.ACTION_USAGE_COMPARISON)
              .find({})
              .sort({ timestamp: -1 })
              .limit(50)
              .toArray();
          }
        }
        break;

      case 'stats':
        // Get collection statistics
        const stats = {};
        for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
          const collection = database.collection(collectionName);
          const count = await collection.countDocuments();
          const latest = await collection.findOne({}, { sort: { timestamp: -1 } });
          
          stats[collectionName] = {
            count,
            latestDate: latest?.timestamp || null
          };
        }
        result = stats;
        break;

      case 'llm-list':        // Get list of available LLMs from analyses
        const llmList = await database.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS)
          .distinct('llm');
        result = llmList.map(llm => ({
          key: llm,
          displayName: getLLMDisplayName(llm)
        }));
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: summary, analysis, comparison, stats, or llm-list' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'No data found for the specified parameters' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Action Usage Analysis API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    await connectToDatabase();

    switch (action) {
      case 'trigger-analysis':
        // This would typically trigger the analysis script
        // For now, just return success
        return NextResponse.json({
          message: 'Analysis trigger received. Run the action-usage-analysis script to process data.',
          command: 'node scripts/action-usage-analysis.js --process-all'
        });

      case 'regenerate-summary':
        // This would typically trigger summary regeneration
        return NextResponse.json({
          message: 'Summary regeneration trigger received. Run the analysis script to regenerate.',
          command: 'node scripts/action-usage-analysis.js --analysis'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: trigger-analysis or regenerate-summary' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Action Usage Analysis POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get display names for LLMs
function getLLMDisplayName(llmKey) {
  const mapping = {
    'original': 'Original (Baseline)',
    'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
    'claude_3_7_sonnet': 'Claude 3.7 Sonnet', 
    'claude_3_7_thinking': 'Claude 3.7 Thinking',
    'claude_sonnet_4': 'Claude Sonnet 4',
    'gemini_2_5_pro_preview': 'Gemini 2.5 Pro Preview',
    'gpt_4o': 'GPT-4o',
    'o4_mini_preview': 'O4 Mini Preview'
  };
  
  return mapping[llmKey] || llmKey;
}
