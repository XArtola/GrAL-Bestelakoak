import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db("tests");
    const summaryCollection = database.collection("summary");

    // Fetch all data from the summary collection
    const summaryData = await summaryCollection.find({}).toArray();
    console.log(`Retrieved ${summaryData.length} summary records`);
    
    // Ensure each record has an ID - this prevents "item.id is undefined" errors
    const processedData = summaryData.map((item, index) => {
      if (!item.id) {
        // Generate an ID if one doesn't exist using the filePath or a fallback
        item.id = item.filePath ? `summary_${item.filePath.replace(/[^a-zA-Z0-9]/g, '_')}` : `summary_record_${index}`;
      }
      return item;
    });

    return NextResponse.json(processedData);
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json({ error: "Failed to fetch summary data" }, { status: 500 });
  } finally {
    await client.close();
  }
}