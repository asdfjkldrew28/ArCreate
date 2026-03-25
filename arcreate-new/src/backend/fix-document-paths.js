// fix-document-paths.js
const mongoose = require('mongoose');
const path = require('path');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  await fixDocuments();
  await mongoose.connection.close();
  console.log('Done!');
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
    
    let fixed = 0;
    
    for (const doc of documents) {
      let newUrl = doc.file_url;
      
      // Remove "uploads\" or "uploads/" prefix
      if (newUrl && (newUrl.includes('uploads\\') || newUrl.includes('uploads/'))) {
        newUrl = newUrl.replace(/^uploads[\\\/]/, '');
        console.log(`Fixing: ${doc.document_name}`);
        console.log(`  Old: ${doc.file_url}`);
        console.log(`  New: ${newUrl}`);
        
        await Document.updateOne(
          { _id: doc._id },
          { $set: { file_url: newUrl } }
        );
        fixed++;
      }
    }
    
    console.log(`\nFixed ${fixed} document paths`);
    
    // Show all fixed documents
    const updatedDocs = await Document.find().select('document_name file_url');
    console.log('\nUpdated documents:');
    updatedDocs.forEach(doc => {
      console.log(`- ${doc.document_name}: ${doc.file_url}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}