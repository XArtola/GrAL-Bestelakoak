const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function processResultsByFilePath() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const database = client.db(process.env.MONGODB_DB_NAME || "tests");
        const resultsCollection = database.collection(process.env.MONGODB_COLLECTION_RESULTS);
        const summaryCollection = database.collection(process.env.MONGODB_COLLECTION_SUMMARY);

        // Fetch all data from the results collection
        const results = await resultsCollection.find({}).toArray();
        console.log(`Found ${results.length} documents in results collection`);
        /*
        if (results.length > 0) {
            console.log("First result document structure:", JSON.stringify(results[0], null, 2));
        }
        */
        const processedData = [];

        results.forEach((result, idx) => {
            const { LLM, version, results: resultData } = result;
            console.log(`Processing result #${idx+1}: LLM=${LLM}, version=${version}`);
            
            if (resultData && Array.isArray(resultData.tests)) {
                console.log(`  - Found ${resultData.tests.length} tests in this result`);
                
                resultData.tests.forEach(testItem => {
                    const { filePath, name, ...rest } = testItem;
                    console.log(`    - Test: ${name} in file: ${filePath}`);

                    processedData.push({
                        filePath,
                        name, // Using name instead of testName
                        LLM,
                        version,
                        ...rest
                    });
                });
            } else {
                console.warn(`Skipping result with missing or invalid 'results.tests' property:`, 
                    JSON.stringify(result, null, 2));
            }
        });

        console.log(`Processed ${processedData.length} individual test results`);
        
        // First group by filePath, then by name, then by LLM+version
        const groupedData = {};

        processedData.forEach(item => {
            const { filePath, name, LLM, version, ...rest } = item;
            
            if (!name) {
                console.warn(`Skipping item with missing name:`, JSON.stringify(item, null, 2));
                return;
            }
            
            const llmVersionKey = `${LLM}_${version}`;

            // Create filePath group if it doesn't exist
            if (!groupedData[filePath]) {
                groupedData[filePath] = {
                    filePath,
                    tests: {}
                };
            }

            // Create name group within filePath if it doesn't exist
            if (!groupedData[filePath].tests[name]) {
                groupedData[filePath].tests[name] = {
                    name,
                    attempts: {}
                };
            }
            
            // Create LLM+version group if it doesn't exist
            if (!groupedData[filePath].tests[name].attempts[llmVersionKey]) {
                groupedData[filePath].tests[name].attempts[llmVersionKey] = {
                    LLM,
                    version,
                    results: []
                };
            }

            // Add the current result to the appropriate group
            groupedData[filePath].tests[name].attempts[llmVersionKey].results.push({
                ...rest
            });
        });

        // Convert grouped data into an array structure
        const groupedArray = Object.values(groupedData).map(fileGroup => {
            return {
                filePath: fileGroup.filePath,
                tests: Object.values(fileGroup.tests).map(testGroup => {
                    return {
                        name: testGroup.name,
                        attempts: Object.values(testGroup.attempts)
                    };
                })
            };
        });

        if (groupedArray.length > 0) {
            console.log("Final structure of first document:", JSON.stringify(groupedArray[0], null, 2));
        }
        console.log(`Created ${groupedArray.length} file groups for insertion`);

        // Clear existing data in the summary collection
        await summaryCollection.deleteMany({});
        console.log("Cleared existing data from summary collection");

        // Insert the grouped data into the summary collection
        if (groupedArray.length > 0) {
            await summaryCollection.insertMany(groupedArray);
            console.log(`Inserted ${groupedArray.length} grouped records into the summary collection.`);
        } else {
            console.warn("No data to insert into summary collection!");
        }

    } catch (err) {
        console.error("Error processing data:", err);
    } finally {
        await client.close();
    }
}

processResultsByFilePath();