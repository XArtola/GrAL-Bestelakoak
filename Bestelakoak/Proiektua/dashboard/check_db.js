import { MongoClient } from 'mongodb';

async function checkDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('tests');
    
    // Check merged_test_data collection
    const mergedCollection = db.collection('merged_test_data');
    const distinctLLMs = await mergedCollection.distinct('llm');
    console.log('Distinct LLMs in merged_test_data:', distinctLLMs.sort());
    
    // Check action_usage_analysis collection
    const actionCollection = db.collection('action_usage_analysis');
    const actionLLMs = await actionCollection.distinct('llm');
    console.log('Distinct LLMs in action_usage_analysis:', actionLLMs.sort());
    
    // Count documents in each collection
    const mergedCount = await mergedCollection.countDocuments();
    const actionCount = await actionCollection.countDocuments();
    console.log(`\nDocument counts:`);
    console.log(`merged_test_data: ${mergedCount}`);
    console.log(`action_usage_analysis: ${actionCount}`);
    
    // Check if claude_3_7_sonnet_thinking specifically exists
    const thinkingInMerged = await mergedCollection.findOne({ llm: 'claude_3_7_sonnet_thinking' });
    const thinkingInAction = await actionCollection.findOne({ llm: 'claude_3_7_sonnet_thinking' });
    
    console.log(`\nClaude 3.7 Sonnet Thinking exists:`);
    console.log(`In merged_test_data: ${!!thinkingInMerged}`);
    console.log(`In action_usage_analysis: ${!!thinkingInAction}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkDatabase();
