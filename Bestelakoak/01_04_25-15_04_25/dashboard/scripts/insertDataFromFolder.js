const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function insertDataFromFolder() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const database = client.db(process.env.MONGODB_DB_NAME);
        const collection = database.collection(process.env.MONGODB_COLLECTION_RESULTS);

        const dataDir = path.join(__dirname, '../data');
        const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            // Extract LLM and version from the file name
            const fileNameWithoutExtension = path.basename(file, '.json');
            const versionMatch = fileNameWithoutExtension.match(/V(\d+)/i);
            const version = versionMatch ? parseInt(versionMatch[1], 10) : 1;
            const llm = versionMatch ? fileNameWithoutExtension.replace(/V\d+$/i, '').replace(/^results/, '').trim() : fileNameWithoutExtension.replace(/^results/, '').trim();

            if (Array.isArray(data)) {
                const enrichedData = data.map(item => ({ ...item, LLM: llm, version }));
                await collection.insertMany(enrichedData);
                console.log(`Inserted ${enrichedData.length} records from ${file}`);
            } else {
                const enrichedData = { ...data, LLM: llm, version };
                await collection.insertOne(enrichedData);
                console.log(`Inserted 1 record from ${file}`);
            }

            // Log the filename for reference
            console.log(`Data from file '${file}' has been added to the database.`);
        }

        console.log("Data insertion complete.");
    } catch (err) {
        console.error("Error inserting data:", err);
    } finally {
        await client.close();
    }
}

insertDataFromFolder();