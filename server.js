// Dr. Fuentes 2025
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const app = express();
app.use(cors());
const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);
app.get('/students', async (req, res) => {
try {
await client.connect();
const db = client.db('myTestDB');
const students = await db
.collection('students')
.find()
.toArray();
res.json(students);
} catch (err) {
res.status(500).send('Error fetching students');
} finally {
await client.close();
}
});

app.listen(5000, () => {
console.log('Server running on http://localhost:5000');
});