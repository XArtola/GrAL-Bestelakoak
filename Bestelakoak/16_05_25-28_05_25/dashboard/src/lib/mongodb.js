import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function insertEfficiencyMetrics(metrics) {
  const client = await clientPromise;
  const db = client.db("dashboard");
  const collection = db.collection("efficiency_metrics");
  
  const metricsWithTimestamp = metrics.map(metric => ({
    ...metric,
    timestamp: new Date()
  }));
  
  const result = await collection.insertMany(metricsWithTimestamp);
  return result;
}

export async function getEfficiencyMetrics(llmModel = null) {
  const client = await clientPromise;
  const db = client.db("dashboard");
  const collection = db.collection("efficiency_metrics");
  
  const filter = llmModel ? { llmModel } : {};
  const metrics = await collection.find(filter).sort({ timestamp: -1 }).toArray();
  
  return metrics.map(metric => ({
    ...metric,
    _id: metric._id.toString()
  }));
}

export async function getEfficiencySummary() {
  const client = await clientPromise;
  const db = client.db("dashboard");
  const collection = db.collection("efficiency_metrics");
  
  const pipeline = [
    {
      $group: {
        _id: "$llmModel",
        totalTests: { $sum: 1 },
        passedTests: { 
          $sum: { $cond: ["$passed", 1, 0] } 
        },
        avgGenerationEfficiency: { $avg: "$generationEfficiency" },
        avgExecutionEfficiency: { $avg: "$executionEfficiency" },
        avgGenerationTime: { $avg: "$generationTime" },
        avgExecutionTime: { $avg: "$executionTime" },
        avgActionsUsed: { $avg: "$actionsUsed" }
      }
    },
    {
      $sort: { avgGenerationEfficiency: -1, avgExecutionEfficiency: -1 }
    }
  ];
  
  const summary = await collection.aggregate(pipeline).toArray();
  
  return summary.map(item => ({
    llmModel: item._id,
    totalTests: item.totalTests,
    passedTests: item.passedTests,
    avgGenerationEfficiency: item.avgGenerationEfficiency,
    avgExecutionEfficiency: item.avgExecutionEfficiency,
    avgGenerationTime: item.avgGenerationTime,
    avgExecutionTime: item.avgExecutionTime,
    avgActionsUsed: item.avgActionsUsed
  }));
}
