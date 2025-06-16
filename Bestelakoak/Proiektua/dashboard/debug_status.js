const fs = require('fs');

// Check GPT-4o data
const gpt4o = JSON.parse(fs.readFileSync('data/test_execution_results/merged_results/merged-test-data_gpt_4o.json', 'utf8'));

console.log('🔍 GPT-4o analysis:');
console.log('Total tests:', gpt4o.tests.length);

// Tests with execution but no status
const testsWithExecutionButNoStatus = gpt4o.tests.filter(test => test.execution && !test.execution.status);
console.log('Tests with execution but no status:', testsWithExecutionButNoStatus.length);

if (testsWithExecutionButNoStatus.length > 0) {
  console.log('\nExamples:');
  testsWithExecutionButNoStatus.slice(0, 3).forEach((test, i) => {
    console.log(`${i+1}. ${test.name}`);
    console.log('   execution:', JSON.stringify(test.execution, null, 2));
  });
}

// Tests with undefined status
const testsWithUndefinedStatus = gpt4o.tests.filter(test => test.execution && test.execution.status === undefined);
console.log('\nTests with undefined status:', testsWithUndefinedStatus.length);

// Tests with null status
const testsWithNullStatus = gpt4o.tests.filter(test => test.execution && test.execution.status === null);
console.log('Tests with null status:', testsWithNullStatus.length);

// Check what statuses exist
const statuses = [...new Set(gpt4o.tests.map(test => test.execution?.status).filter(Boolean))];
console.log('\nUnique statuses found:', statuses);

// Count by status
const statusCounts = {};
gpt4o.tests.forEach(test => {
  const status = test.execution?.status || 'NO_EXECUTION_OR_STATUS';
  statusCounts[status] = (statusCounts[status] || 0) + 1;
});
console.log('\nStatus counts:', statusCounts);
