console.log('🚀 Test script is working!');
console.log('📁 Current directory:', process.cwd());
console.log('📝 Arguments:', process.argv.slice(2));

// Test basic imports
try {
  const { MongoClient } = await import('mongodb');
  console.log('✅ MongoDB import successful');
} catch (error) {
  console.error('❌ MongoDB import failed:', error.message);
}

try {
  const fs = await import('fs');
  console.log('✅ FS import successful');
} catch (error) {
  console.error('❌ FS import failed:', error.message);
}

try {
  const path = await import('path');
  console.log('✅ Path import successful');
} catch (error) {
  console.error('❌ Path import failed:', error.message);
}

console.log('✅ Test script completed');
