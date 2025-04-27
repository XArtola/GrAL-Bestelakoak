import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
    console.log("Data directory path:", dataDir); // Debugging log
    console.log("Files in data directory:", files); // Debugging log
    const results = files
      .filter((f) => f.endsWith('.json'))
      .map((file) => {
        const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
        const content = JSON.parse(raw);
        const id = path.basename(file, '.json');
        return { id, ...content };
      });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Failed to read results' }, { status: 500 });
  }
}