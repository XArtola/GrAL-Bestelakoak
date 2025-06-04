const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function processResultsByFilePath() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const database = client.db(process.env.MONGODB_DB_NAME);
        const resultsCollection = database.collection(process.env.MONGODB_COLLECTION_RESULTS);
        const summaryCollection = database.collection(process.env.MONGODB_COLLECTION_SUMMARY );

        // Fetch all data from the results collection
        const results = await resultsCollection.find({}).toArray();

        const processedData = [];

        results.forEach(result => {
            const { LLM, version, results: resultData } = result;

            if (resultData && Array.isArray(resultData.tests)) {
                resultData.tests.forEach(testItem => {
                    const { filePath, ...rest } = testItem;

                    processedData.push({
                        filePath,
                        ...rest,
                        LLM,
                        version
                    });
                });
            } else {
                console.warn(`Skipping result with missing or invalid 'results.tests' property:`, result);
            }
        });

        const groupedData = {};

        processedData.forEach(item => {
            const { filePath, LLM, version, ...rest } = item;

            if (!groupedData[filePath]) {
                groupedData[filePath] = {
                    filePath,
                    groups: {}
                };
            }

            const groupKey = `${LLM}_V${version}`;

            if (!groupedData[filePath].groups[groupKey]) {
                groupedData[filePath].groups[groupKey] = {
                    LLM,
                    version,
                    tests: []
                };
            }

            groupedData[filePath].groups[groupKey].tests.push(rest);
        });

        // Convert grouped data into an array
        const groupedArray = Object.values(groupedData).map(group => {
            return {
                filePath: group.filePath,
                groups: Object.values(group.groups)
            };
        });

        // Insert the grouped data into the summary collection
        await summaryCollection.insertMany(groupedArray);
        console.log(`Inserted ${groupedArray.length} grouped records into the summary collection.`);

    } catch (err) {
        console.error("Error processing data:", err);
    } finally {
        await client.close();
    }
}

processResultsByFilePath();