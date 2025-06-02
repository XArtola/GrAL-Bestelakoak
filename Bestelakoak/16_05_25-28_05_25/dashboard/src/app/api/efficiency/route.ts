import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    console.log("Loading efficiency analysis data from MongoDB");
    
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db("tests");
    const efficiencyCollection = database.collection("efficiency_analysis");

    // Get the most recent efficiency analysis
    const efficiencyData = await efficiencyCollection
      .findOne({}, { sort: { timestamp: -1 } });

    if (!efficiencyData) {
      console.log("No efficiency analysis data found");
      return NextResponse.json(null);
    }

    // Remove MongoDB _id field and return clean data
    const { _id, ...cleanData } = efficiencyData;
    
    return NextResponse.json(cleanData);
    
  } catch (error) {
    console.error("Error fetching efficiency metrics:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch efficiency metrics",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    const { metrics } = await request.json();
    
    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics data' },
        { status: 400 }
      );
    }

    await client.connect();
    const database = client.db("tests");
    const efficiencyCollection = database.collection("efficiency_metrics");
    
    const metricsWithTimestamp = metrics.map(metric => ({
      ...metric,
      timestamp: new Date()
    }));
    
    const result = await efficiencyCollection.insertMany(metricsWithTimestamp);
    
    return NextResponse.json({ 
      success: true, 
      insertedCount: result.insertedCount 
    });
  } catch (error) {
    console.error("Error inserting efficiency metrics:", error);
    return NextResponse.json(
      { 
        error: "Failed to insert efficiency metrics",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
