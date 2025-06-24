import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';
const COLLECTION_NAME = 'test_files';

const TEST_FILES_JSON = path.join(__dirname, '../data/test_execution_results/all_test_files.json');

async function main() {
  console.log('🔌 Conectando a MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  console.log('📖 Leyendo archivo:', TEST_FILES_JSON);
  const raw = fs.readFileSync(TEST_FILES_JSON, 'utf8');
  const data = JSON.parse(raw);

  // Construir array de documentos
  const docs = [];
  for (const llm of Object.keys(data)) {
    for (const filename of Object.keys(data[llm])) {
      docs.push({ llm, filename, code: data[llm][filename] });
    }
  }

  console.log(`🗑️  Borrando documentos previos en ${COLLECTION_NAME}...`);
  await collection.deleteMany({});

  console.log(`💾 Insertando ${docs.length} documentos...`);
  await collection.insertMany(docs);

  console.log('✅ ¡Ingesta completada!');
  await client.close();
}

main().catch(err => {
  console.error('❌ Error en la ingesta:', err);
  process.exit(1);
});
