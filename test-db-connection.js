/**
 * Simple script to test MongoDB Atlas connection
 * Run with: node test-db-connection.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

console.log('🔄 Attempting to connect to MongoDB Atlas...');
console.log('📍 Connection string:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));

mongoose.connect(MONGODB_URI, {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  family: 4,
})
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('📊 Connection details:');
    console.log('   - Database:', mongoose.connection.db.databaseName);
    console.log('   - Host:', mongoose.connection.host);
    console.log('   - Port:', mongoose.connection.port);
    console.log('   - Ready State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
    
    // List collections
    return mongoose.connection.db.listCollections().toArray();
  })
  .then((collections) => {
    console.log('📁 Existing collections:', collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None (database is empty)');
    console.log('\n✨ Database is ready for use!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your MongoDB Atlas credentials');
    console.error('   2. Verify Network Access allows your IP (0.0.0.0/0 for development)');
    console.error('   3. Ensure database user has correct permissions');
    console.error('   4. Check if cluster is running in MongoDB Atlas');
    process.exit(1);
  });
