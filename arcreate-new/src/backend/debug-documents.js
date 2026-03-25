// debug-documents.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  await debugDocuments();
  await mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
});

async function debugDocuments() {
  try {
    const documentSchema = new mongoose.Schema({
      document_name: String,
      file_url: String,
      _id: mongoose.Schema.Types.ObjectId,
      project_name: String,
      upload_date: Date
    }, { strict: false });
    
    const Document = mongoose.model('Document', documentSchema);
    
    const documents = await Document.find().sort({ upload_date: -1 });
    console.log(`\n📄 Found ${documents.length} documents in database\n`);
    
    const uploadsDir = path.join(__dirname, 'uploads');
    const filesInUploads = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    console.log(`📁 Files in uploads folder (${filesInUploads.length}):`);
    filesInUploads.forEach(f => console.log(`   - ${f}`));
    console.log();
    
    console.log('🔍 Document vs File Matching:\n');
    console.log('=' .repeat(80));
    
    let mismatchCount = 0;
    
    for (const doc of documents) {
      // Get the stored filename
      let storedFilename = doc.file_url;
      if (storedFilename) {
        storedFilename = storedFilename.replace(/^uploads[\\\/]/i, '');
        storedFilename = storedFilename.replace(/\\/g, '/');
        storedFilename = storedFilename.split('/').pop();
      }
      
      // Try to find a matching file
      let foundMatch = false;
      let matchedFile = null;
      
      // 1. Exact match
      if (filesInUploads.includes(storedFilename)) {
        foundMatch = true;
        matchedFile = storedFilename;
      }
      
      // 2. Try to match by document ID
      const docId = doc._id.toString();
      if (!foundMatch) {
        matchedFile = filesInUploads.find(f => f.includes(docId));
        if (matchedFile) foundMatch = true;
      }
      
      // 3. Try to match by timestamp pattern (files are saved as timestamp-random.ext)
      if (!foundMatch && storedFilename) {
        const timestampMatch = storedFilename.match(/^(\d+)/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];
          matchedFile = filesInUploads.find(f => f.startsWith(timestamp));
          if (matchedFile) foundMatch = true;
        }
      }
      
      if (!foundMatch) {
        mismatchCount++;
        console.log(`❌ MISMATCH: ${doc.document_name}`);
        console.log(`   Database stores: ${storedFilename || 'EMPTY'}`);
        console.log(`   Document ID: ${doc._id}`);
        console.log(`   Upload date: ${doc.upload_date ? new Date(doc.upload_date).toLocaleString() : 'Unknown'}`);
        console.log();
      } else {
        console.log(`✅ MATCH: ${doc.document_name}`);
        console.log(`   DB: ${storedFilename} → File: ${matchedFile}`);
        console.log();
      }
    }
    
    console.log('=' .repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Matching files: ${documents.length - mismatchCount}`);
    console.log(`   Mismatched: ${mismatchCount}`);
    
    if (mismatchCount > 0) {
      console.log('\n⚠️  RECOMMENDATION: Run the fix script to correct the database entries.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}