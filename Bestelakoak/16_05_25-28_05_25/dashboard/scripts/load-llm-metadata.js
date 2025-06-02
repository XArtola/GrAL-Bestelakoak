// Script to load LLM metadata into MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env.local' });

// MongoDB connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function loadLlmMetadata() {
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db('llm_dashboard');
    const collection = db.collection('llm_metadata');
    
    // Drop existing data
    await collection.deleteMany({});
    console.log("Cleared existing LLM metadata");
    
    // Define LLM metadata
    const llmMetadata = [
      { 
        normalizedName: 'claude-sonnet-4', 
        displayName: 'Claude Sonnet 4', 
        provider: 'Anthropic',
        description: 'Latest generation Claude model (May 2025)',
        capabilities: ['Long context', 'Advanced reasoning', 'Low hallucination']
      },
      { 
        normalizedName: 'claude-3-opus', 
        displayName: 'Claude 3 Opus', 
        provider: 'Anthropic',
        description: 'Most powerful Claude 3 model',
        capabilities: ['High accuracy', 'Complex reasoning']
      },
      { 
        normalizedName: 'claude-3-sonnet', 
        displayName: 'Claude 3 Sonnet', 
        provider: 'Anthropic',
        description: 'Balanced Claude 3 model',
        capabilities: ['Good balance of speed and accuracy']
      },
      { 
        normalizedName: 'claude-3-haiku', 
        displayName: 'Claude 3 Haiku', 
        provider: 'Anthropic',
        description: 'Fastest Claude 3 model',
        capabilities: ['High speed', 'Lower cost']
      },
      { 
        normalizedName: 'gpt-4o', 
        displayName: 'GPT-4o', 
        provider: 'OpenAI',
        description: 'Latest generation GPT-4 model (May 2025)',
        capabilities: ['Multimodal', 'Advanced reasoning', 'Fast inference']
      },
      { 
        normalizedName: 'o1-preview', 
        displayName: 'o1 Preview', 
        provider: 'OpenAI',
        description: 'Experimental reasoning model',
        capabilities: ['Advanced reasoning', 'Mathematical problem solving']
      },
      { 
        normalizedName: 'o3-mini', 
        displayName: 'o3 Mini', 
        provider: 'OpenAI',
        description: 'Compact reasoning model',
        capabilities: ['Efficiency', 'Lower cost', 'Specialized reasoning']
      },
      { 
        normalizedName: 'o4-mini-preview', 
        displayName: 'o4 Mini Preview', 
        provider: 'OpenAI',
        description: 'Compact multimodal model',
        capabilities: ['Multimodal', 'Lower cost', 'Fast inference']
      },
      { 
        normalizedName: 'gemini-2-5-pro-preview', 
        displayName: 'Gemini 2.5 Pro Preview', 
        provider: 'Google',
        description: 'Latest generation Gemini model (May 2025)',
        capabilities: ['Multimodal', 'Long context', 'Advanced reasoning']
      },
      { 
        normalizedName: 'claude-3-7-sonnet', 
        displayName: 'Claude 3.7 Sonnet', 
        provider: 'Anthropic',
        description: 'Improved Claude 3 Sonnet model (April 2025 update)',
        capabilities: ['Enhanced reasoning', 'Improved coding']
      },
      { 
        normalizedName: 'claude-3-7-sonnet-thinking', 
        displayName: 'Claude 3.7 Sonnet (thinking)', 
        provider: 'Anthropic',
        description: 'Claude 3.7 Sonnet with thinking mode enabled',
        capabilities: ['Chain-of-thought reasoning', 'Self-critique']
      }
    ];
    
    // Insert data
    const result = await collection.insertMany(llmMetadata);
    console.log(`${result.insertedCount} LLM metadata documents inserted`);
  } catch (error) {
    console.error("Error loading LLM metadata:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Execute the function
loadLlmMetadata().catch(console.error);
