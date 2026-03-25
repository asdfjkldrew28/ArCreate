// get-doc-id.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/arcreate').then(async () => {
  const doc = await mongoose.connection.db.collection('documents').findOne({});
  if (doc) {
    console.log(`Document ID: ${doc._id}`);
    console.log(`Document Name: ${doc.document_name}`);
    console.log(`File URL: ${doc.file_url}`);
    console.log(`\nTest download with: curl -I http://localhost:5000/api/download/${doc._id}`);
  } else {
    console.log('No documents found');
  }
  await mongoose.disconnect();
});