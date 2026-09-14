// Test JWT signing and verification
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

console.log('Testing JWT...');
console.log('JWT_SECRET loaded from env:', process.env.JWT_SECRET ? 'Yes' : 'No');
console.log('JWT_SECRET value:', JWT_SECRET);
console.log('JWT_SECRET length:', JWT_SECRET.length);

// Generate a token
const payload = {
  userId: '507f1f77bcf86cd799439011',
  email: 'test@example.com'
};

try {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
  console.log('\n✅ Token generated successfully');
  console.log('Token:', token.substring(0, 50) + '...');

  // Verify the token
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token verified successfully');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.error('\n❌ JWT error:', error.message);
}
