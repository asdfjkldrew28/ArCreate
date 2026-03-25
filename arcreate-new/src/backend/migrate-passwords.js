// migrate-passwords.js
// Run with: node migrate-passwords.js
// WARNING: This will hash all plain text passwords in your database

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');
  await migratePasswords();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

async function migratePasswords() {
  try {
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
    
    const users = await User.find();
    console.log(`Found ${users.length} users`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const user of users) {
      const isBcrypt = user.password && 
                      (user.password.startsWith('$2a$') || 
                       user.password.startsWith('$2b$') || 
                       user.password.startsWith('$2y$')) &&
                      user.password.length === 60;
      
      if (isBcrypt) {
        console.log(`⏭️  Skipping ${user.username} - already hashed`);
        skipped++;
      } else {
        console.log(`🔐 Hashing password for: ${user.username}`);
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;
        await user.save();
        migrated++;
      }
    }
    
    console.log('\n📊 MIGRATION COMPLETE');
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📋 Total: ${users.length}`);
    
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    
  } catch (error) {
    console.error('Error migrating passwords:', error);
    await mongoose.connection.close();
  }
}