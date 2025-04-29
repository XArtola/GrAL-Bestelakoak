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
    const database = client.db("tests");
    const collection = database.collection("results");

    const results = await collection.find({}).toArray();
    
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
    
    return NextResponse.json(processedResults);
  } catch (err) {
    console.error("Error fetching data from MongoDB:", err);
    return NextResponse.json({ error: 'Failed to fetch results from database' }, { status: 500 });
  }
}