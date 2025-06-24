import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'tests';
const collectionName = 'test_files';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const llm = searchParams.get('llm');
  const filename = searchParams.get('filename');

  if (!llm || !filename) {
    return NextResponse.json({ error: 'Missing llm or filename' }, { status: 400 });
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const doc = await collection.findOne({ llm, filename });
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ code: doc.code });
  } catch (err) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
