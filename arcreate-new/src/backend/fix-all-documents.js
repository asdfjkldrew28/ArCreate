// fix-all-documents.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  await fixAllDocuments();
  await mongoose.connection.close();
  console.log('\n✅ Done!');
}).catch(err => {
  console.error('Connection error:', err);
});

async function fixAllDocuments() {
  try {
    const documentSchema = new mongoose.Schema({
      document_name: String,
      file_url: String,
      _id: mongoose.Schema.Types.ObjectId,
      project_name: String,
      upload_date: Date
    }, { strict: false });
    
    const Document = mongoose.model('Document', documentSchema);
    
    const documents = await Document.find();
    console.log(`\n📄 Found ${documents.length} documents in database\n`);
    
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads folder does not exist!');
      return;
    }
    
    const filesInUploads = fs.readdirSync(uploadsDir);
    console.log(`📁 Files in uploads folder (${filesInUploads.length}):`);
    filesInUploads.forEach(f => console.log(`   - ${f}`));
    console.log();
    
    let fixedCount = 0;
    let cannotFix = 0;
    
    for (const doc of documents) {
      let oldFileUrl = doc.file_url;
      let newFileUrl = null;
      let foundFile = null;
      
      // Clean the stored filename
      let cleanedFilename = oldFileUrl;
      if (cleanedFilename) {
        cleanedFilename = cleanedFilename.replace(/^uploads[\\\/]/i, '');
        cleanedFilename = cleanedFilename.replace(/\\/g, '/');
        cleanedFilename = cleanedFilename.split('/').pop();
      }
      
      // Try to find a matching file
      // Method 1: Exact match on cleaned filename
      if (cleanedFilename && filesInUploads.includes(cleanedFilename)) {
        foundFile = cleanedFilename;
      }
      
      // Method 2: Match by document ID
      if (!foundFile) {
        const docId = doc._id.toString();
        foundFile = filesInUploads.find(f => f.includes(docId));
      }
      
      // Method 3: Match by timestamp (if filename starts with numbers)
      if (!foundFile && cleanedFilename) {
        const timestampMatch = cleanedFilename.match(/^(\d+)/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];
          foundFile = filesInUploads.find(f => f.startsWith(timestamp));
        }
      }
      
      // Method 4: If document has a date, try to find by upload date pattern
      if (!foundFile && doc.upload_date) {
        const uploadTimestamp = new Date(doc.upload_date).getTime();
        foundFile = filesInUploads.find(f => f.startsWith(uploadTimestamp.toString()));
      }
      
      if (foundFile) {
        // Found a matching file, update the database
        newFileUrl = foundFile;
        
        if (oldFileUrl !== newFileUrl) {
          console.log(`🔧 FIXING: ${doc.document_name}`);
          console.log(`   Old: ${oldFileUrl}`);
          console.log(`   New: ${newFileUrl}`);
          
          await Document.updateOne(
            { _id: doc._id },
            { $set: { file_url: newFileUrl } }
          );
          fixedCount++;
        } else {
          console.log(`✅ OK: ${doc.document_name} - ${newFileUrl}`);
        }
      } else {
        console.log(`❌ CANNOT FIX: ${doc.document_name}`);
        console.log(`   Database: ${oldFileUrl || 'EMPTY'}`);
        console.log(`   Document ID: ${doc._id}`);
        cannotFix++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Fixed: ${fixedCount} documents`);
    console.log(`   Cannot fix: ${cannotFix} documents`);
    console.log(`   Total: ${documents.length} documents`);
    
    if (cannotFix > 0) {
      console.log('\n⚠️  Some documents cannot be fixed automatically.');
      console.log('   You may need to re-upload these files or manually check the uploads folder.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}