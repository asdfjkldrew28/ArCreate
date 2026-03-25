// clean-orphaned-documents.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  await cleanOrphanedDocuments();
  await mongoose.connection.close();
  console.log('\n✅ Done!');
}).catch(err => {
  console.error('Connection error:', err);
});

async function cleanOrphanedDocuments() {
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
    
    let deleted = 0;
    let kept = 0;
    
    for (const doc of documents) {
      // Get the stored filename
      let storedFilename = doc.file_url;
      if (storedFilename) {
        storedFilename = storedFilename.replace(/^uploads[\\\/]/i, '');
        storedFilename = storedFilename.replace(/\\/g, '/');
        storedFilename = storedFilename.split('/').pop();
      }
      
      // Check if file exists
      const fileExists = storedFilename && filesInUploads.includes(storedFilename);
      
      if (!fileExists) {
        console.log(`🗑️  DELETING: ${doc.document_name}`);
        console.log(`   File: ${storedFilename || 'EMPTY'} (not found on disk)`);
        console.log(`   ID: ${doc._id}`);
        console.log(`   Project: ${doc.project_name}`);
        
        await Document.findByIdAndDelete(doc._id);
        deleted++;
      } else {
        console.log(`✅ KEEPING: ${doc.document_name} - File exists: ${storedFilename}`);
        kept++;
      }
      console.log();
    }
    
    console.log('=' .repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Deleted: ${deleted} orphaned documents`);
    console.log(`   Kept: ${kept} valid documents`);
    console.log(`   Total: ${documents.length}`);
    
    // Show remaining documents
    const remaining = await Document.find();
    console.log(`\n📄 Remaining documents (${remaining.length}):`);
    remaining.forEach(doc => {
      console.log(`   - ${doc.document_name}: ${doc.file_url}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}