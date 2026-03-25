// fix-existing-documents.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  await fixDocuments();
  await mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
});

async function fixDocuments() {
  try {
    const documentSchema = new mongoose.Schema({
      document_name: String,
      file_url: String,
      _id: mongoose.Schema.Types.ObjectId
    }, { strict: false });
    
    const Document = mongoose.model('Document', documentSchema);
    
    const documents = await Document.find();
    console.log(`Found ${documents.length} documents`);
    
    const uploadsDir = path.join(__dirname, 'uploads');
    const filesInUploads = fs.readdirSync(uploadsDir);
    console.log('Files in uploads folder:', filesInUploads);
    
    let updated = 0;
    
    for (const doc of documents) {
      let newFileUrl = doc.file_url;
      
      // Extract just the filename from the stored path
      if (doc.file_url && doc.file_url.includes('/')) {
        newFileUrl = path.basename(doc.file_url);
        console.log(`Document ${doc.document_name}: ${doc.file_url} -> ${newFileUrl}`);
        updated++;
      } else if (doc.file_url && !doc.file_url.includes('/') && !doc.file_url.includes('\\')) {
        // Already just a filename, but check if it exists
        const fileExists = filesInUploads.includes(doc.file_url);
        if (!fileExists) {
          console.log(`Warning: File ${doc.file_url} not found in uploads folder`);
        }
        newFileUrl = doc.file_url;
      }
      
      if (newFileUrl !== doc.file_url) {
        await Document.updateOne(
          { _id: doc._id },
          { $set: { file_url: newFileUrl } }
        );
      }
    }
    
    console.log(`Updated ${updated} document paths`);
    
    // Show final state
    const finalDocs = await Document.find().select('document_name file_url');
    console.log('\nFinal document paths:');
    finalDocs.forEach(doc => {
      console.log(`- ${doc.document_name}: ${doc.file_url}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}