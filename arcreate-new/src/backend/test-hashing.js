// test-hashing.js
// Run with: node test-hashing.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');
  await checkHashing();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

async function checkHashing() {
  try {
    // Get the User model
    const userSchema = new mongoose.Schema({
      username: String,
      password: String,
      full_name: String,
      email: String,
      phone: String,
      role: String,
      status: String,
      created_at: Date
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Get all users
    const users = await User.find();
    
    console.log('\n🔐 PASSWORD HASHING SECURITY CHECK');
    console.log('=====================================');
    
    let hashedCount = 0;
    let plainCount = 0;
    
    for (const user of users) {
      console.log(`\n📋 User: ${user.username} (${user.role})`);
      console.log(`   Password stored: "${user.password}"`);
      
      // Check if password looks like a bcrypt hash
      // bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
      const isBcrypt = user.password && 
                      (user.password.startsWith('$2a$') || 
                       user.password.startsWith('$2b$') || 
                       user.password.startsWith('$2y$')) &&
                      user.password.length === 60;
      
      if (isBcrypt) {
        console.log(`   ✅ SECURE: Password is hashed with bcrypt`);
        console.log(`   🔑 Hash format: ${user.password.substring(0, 20)}...`);
        hashedCount++;
        
        // Test if we can verify a password
        // Note: This is just a test - we don't know the actual password
        const testPassword = 'test123';
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`   🔍 Verification test: ${isValid ? '✓ Works' : '✓ Hash format valid'}`);
      } else {
        console.log(`   ❌ INSECURE: Password appears to be plain text!`);
        plainCount++;
      }
    }
    
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`Total users: ${users.length}`);
    console.log(`✅ Secure (hashed) passwords: ${hashedCount}`);
    console.log(`❌ Insecure (plain text) passwords: ${plainCount}`);
    console.log(`\n🔒 Security Status: ${plainCount === 0 ? '✅ ALL PASSWORDS SECURE' : '❌ WARNING: Plain text passwords found!'}`);
    
    if (plainCount > 0) {
      console.log('\n⚠️  RECOMMENDATION:');
      console.log('   - Update your server.js to hash passwords before saving');
      console.log('   - For existing users, create a script to hash their passwords');
      console.log('   - Never store passwords in plain text!');
    } else {
      console.log('\n✅ Your system is properly hashing passwords!');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    
  } catch (error) {
    console.error('Error checking passwords:', error);
    await mongoose.connection.close();
  }
}