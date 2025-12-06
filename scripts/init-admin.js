// Script to initialize the first super admin
// Run with: node scripts/init-admin.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env' });

async function initAdmin() {
  const client = new MongoClient(process.env.MONGO_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME || 'mspndev');
    const admins = db.collection('admins');
    
    // Check if super admin exists
    const existingAdmin = await admins.findOne({ role: 'super_admin' });
    
    if (existingAdmin) {
      console.log('Super admin already exists!');
      console.log('Username:', existingAdmin.username);
      return;
    }
    
    // Create default super admin
    const username = 'admin';
    const password = 'admin123'; // Change this!
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const superAdmin = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      role: 'super_admin',
      createdAt: new Date(),
      createdBy: 'system'
    };
    
    await admins.insertOne(superAdmin);
    
    console.log('\\n✅ Super admin created successfully!');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('\\n⚠️  IMPORTANT: Please change the password after first login!\\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

initAdmin();
