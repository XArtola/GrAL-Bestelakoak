import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const dbName = 'llm_dashboard';
const collectionName = 'llm_metadata';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Get LLM names from MongoDB
    const llmData = await collection.find({}).toArray();
    
    // Create a mapping of normalized names to display names
    const displayNames: Record<string, string> = {};
    
    llmData.forEach((item: any) => {
      if (item.normalizedName && item.displayName) {
        displayNames[item.normalizedName] = item.displayName;
      }
    });
      return NextResponse.json(displayNames, { status: 200 });
  } catch (error) {
    console.error('Error fetching LLM names:', error);
    return NextResponse.json({ error: 'Failed to fetch LLM names' }, { status: 500 });
  }
}
